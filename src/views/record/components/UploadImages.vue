<template>
  <div>
    <el-upload :multiple="true" :auto-upload="false" :show-file-list="false" :before-upload="() => false"
      :on-change="handleFileChange">
      <el-button type="primary">选择文件上传</el-button>
    </el-upload>

    <transition name="fade">
      <div v-if="showProgress">
        <el-progress striped striped-flow :percentage="overallProgress" v-if="overallProgress > 0"
          :status="overallProgress === 100 ? 'success' : undefined" :stroke-width="18" class="flow-progress" />
        <p v-if="overallProgress === 0">正在准备上传，请稍候...</p>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import SparkMD5 from 'spark-md5'

/** ===== 配置 ===== **/
const chunkSize = 2 * 1024 * 1024        // chunk 单个大小MB
const concurrency = 5                    // chunk 并发
const maxRetry = 3                       // chunk 最大重试
const mergeConcurrency = 10              // merge 并发
const maxMergeRetry = 3                  // merge 最大重试
const batchSize = 50                     // 每批处理文件数
const maxBatchConcurrency = 4            // 最大并发批次数量
const continueOnMergeFailure = true      // merge 失败是否继续

/** ===== 响应式状态 ===== **/
const overallProgress = ref(0)
const showProgress = ref(false)
const fileInfos = ref([])
const fileMergeErrors = ref({})
const uploading = ref(false)
const runningBatches = ref(0)
const processingChunks = ref(false)
const processingMerges = ref(false)

/** ===== 队列 & 控制 ===== **/
let filesMeta = []
let batchQueue = []
let globalChunkQueue = []
let mergeQueue = []
let globalStepStatus = []
let queuedFileKeys = new Set()
let batchAbortControllers = new Map()

/** 文件唯一 key **/
const getFileKey = file => `${file.name}_${file.size}_${file.lastModified || 0}`

/** 分片 MD5 计算 **/
const calculateFileHash = async (file) => {
  const spark = new SparkMD5.ArrayBuffer()
  for (let start = 0; start < file.size; start += chunkSize) {
    const chunk = await file.slice(start, start + chunkSize).arrayBuffer()
    spark.append(chunk)
  }
  return spark.end()
}

/** 刷新总体进度 **/
const refreshProgress = () => {
  if (!globalStepStatus.length) {
    overallProgress.value = 0
    return
  }
  const done = globalStepStatus.reduce((s, v) => s + (v ? 1 : 0), 0)
  const newProgress = Math.floor((done / globalStepStatus.length) * 100)
  if (newProgress > overallProgress.value) overallProgress.value = newProgress
}

/** 上传 chunk **/
const uploadChunkFetch = async (file, fileHash, index, totalChunks, signal) => {
  const start = index * chunkSize
  const end = Math.min(start + chunkSize, file.size)
  const chunk = file.slice(start, end)
  const formData = new FormData()
  formData.append('fileHash', fileHash)
  formData.append('fileName', file.name)
  formData.append('chunkIndex', index + 1)
  formData.append('totalChunks', totalChunks)
  formData.append('chunk', chunk)

  const res = await fetch(`${import.meta.env.VITE_APP_BASE_API}/picture/chunk`, {
    method: 'POST',
    body: formData,
    signal
  })
  if (!res.ok) throw new Error(`分片 ${index + 1} 上传失败`)
  return res.json()
}

/** 添加文件到批次队列 **/
const addFilesToBatchQueue = (rawFiles) => {
  for (const file of rawFiles) {
    const key = getFileKey(file)
    if (queuedFileKeys.has(key)) continue
    queuedFileKeys.add(key)

    const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize))
    const startIndex = globalStepStatus.length
    const mergeIndex = startIndex + totalChunks
    for (let i = 0; i < totalChunks + 1; i++) globalStepStatus.push(0)

    const metaIndex = filesMeta.length
    filesMeta.push({ file, totalChunks, startIndex, mergeIndex, metaIndex })
    for (let ci = 0; ci < totalChunks; ci++) globalChunkQueue.push({ metaIndex, chunkIndex: ci })
    mergeQueue.push(metaIndex)
  }
  refreshProgress()
}

/** 处理单个批次 **/
const processSingleBatch = async (batchFiles, signal) => {
  const batchChunkQueue = []
  for (const file of batchFiles) {
    const key = getFileKey(file)
    if (!queuedFileKeys.has(key)) continue

    const metaIndex = filesMeta.findIndex(m =>
      m.file.name === file.name &&
      m.file.size === file.size &&
      m.file.lastModified === file.lastModified
    )
    if (metaIndex === -1) continue
    const meta = filesMeta[metaIndex]

    if (!meta.fileHash) {
      try { meta.fileHash = await calculateFileHash(meta.file) }
      catch (err) { ElMessage.error(`文件 ${file.name} 哈希计算失败`); continue }
    }

    for (let ci = 0; ci < meta.totalChunks; ci++) {
      const idx = globalChunkQueue.findIndex(t => t.metaIndex === metaIndex && t.chunkIndex === ci)
      if (idx !== -1) batchChunkQueue.push(globalChunkQueue.splice(idx, 1)[0])
    }
  }

  if (!batchChunkQueue.length) return

  const workers = Array(concurrency).fill(null).map(async () => {
    while (batchChunkQueue.length && !signal.aborted) {
      const task = batchChunkQueue.shift()
      if (!task) break
      const { metaIndex, chunkIndex } = task
      const meta = filesMeta[metaIndex]
      if (!meta || !meta.fileHash) continue

      let attempt = 0
      while (attempt < maxRetry) {
        try {
          if (signal.aborted) throw new Error('上传已取消')
          await uploadChunkFetch(meta.file, meta.fileHash, chunkIndex, meta.totalChunks, signal)
          globalStepStatus[meta.startIndex + chunkIndex] = 1
          refreshProgress()
          break
        } catch (err) {
          attempt++
          if (attempt >= maxRetry) {
            globalChunkQueue.push(task)
            throw err
          }
          await new Promise(r => setTimeout(r, 200 * attempt))
        }
      }
    }
  })
  await Promise.all(workers)
}

/** 处理批次队列 **/
const processBatchQueue = async () => {
  if (runningBatches.value >= maxBatchConcurrency || batchQueue.length === 0) {
    if (runningBatches.value === 0 && !processingChunks.value && mergeQueue.length) processMerges()
    return
  }

  const batch = batchQueue.shift()
  const batchId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  runningBatches.value++
  const abortController = new AbortController()
  batchAbortControllers.set(batchId, abortController)

  try { await processSingleBatch(batch, abortController.signal) }
  catch (err) { if (err.message !== '上传已取消') ElMessage.error(`批次处理失败: ${err.message}`) }
  finally {
    batchAbortControllers.delete(batchId)
    runningBatches.value--
    nextTick(processBatchQueue)
  }
}

/** merge 阶段 **/
const processMerges = async () => {
  if (processingMerges.value) return
  processingMerges.value = true
  const abortController = new AbortController()
  const signal = abortController.signal

  try {
    const merges = [...mergeQueue]
    const workers = Array(Math.max(1, mergeConcurrency)).fill(null).map(async () => {
      while (merges.length && !signal.aborted) {
        const metaIndex = merges.shift()
        const meta = filesMeta[metaIndex]
        if (!meta) continue

        let allDone = true
        for (let i = 0; i < meta.totalChunks; i++)
          if (!globalStepStatus[meta.startIndex + i]) { allDone = false; break }

        if (!allDone) { merges.push(metaIndex); continue }

        let attempt = 0, success = false, lastErr = null
        while (attempt < maxMergeRetry && !signal.aborted) {
          try {
            const res = await fetch(
              `${import.meta.env.VITE_APP_BASE_API}/picture/merge?fileHash=${meta.fileHash}&fileName=${encodeURIComponent(meta.file.name)}`,
              { method: 'GET', signal }
            )
            const data = await res.json()
            if (data?.code === 200) {
              globalStepStatus[meta.mergeIndex] = 1
              refreshProgress()
              fileInfos.value.push({ metaIndex, fileName: meta.file.name, resId: data.data.id })
              const idx = mergeQueue.indexOf(metaIndex)
              if (idx !== -1) mergeQueue.splice(idx, 1)
              success = true
              break
            } else throw new Error(data?.message || '合并失败')
          } catch (err) { lastErr = err; attempt++; if (attempt < maxMergeRetry) await new Promise(r => setTimeout(r, 300 * attempt)) }
        }

        if (!success) {
          fileMergeErrors.value[metaIndex] = lastErr?.message || '未知错误'
          if (continueOnMergeFailure) {
            globalStepStatus[meta.mergeIndex] = 1
            refreshProgress()
            const idx = mergeQueue.indexOf(metaIndex)
            if (idx !== -1) mergeQueue.splice(idx, 1)
          } else throw new Error(`文件 "${meta.file.name}" 合并失败`)
        }
      }
    })

    await Promise.all(workers)
    processingMerges.value = false
    if (!mergeQueue.length && !batchQueue.length && runningBatches.value === 0) uploading.value = false
  } catch (err) { processingMerges.value = false; if (err) ElMessage.error(err.message || '合并阶段失败') }
}

/** Element on-change **/
const handleFileChange = async (file, fileList = []) => {
  const raws = (fileList && fileList.length)
    ? fileList.map(f => f.raw).filter(Boolean)
    : (file && file.raw ? [file.raw] : [])
  if (!raws.length) return

  showProgress.value = true // 显示加载过渡

  for (let i = 0; i < raws.length; i += batchSize) {
    const batch = raws.slice(i, i + batchSize)
    addFilesToBatchQueue(batch)
    batchQueue.push(batch)
  }

  uploading.value = true
  if (runningBatches.value < maxBatchConcurrency && !processingChunks.value) processBatchQueue()
}

/** 重置 **/
const resetData = () => {
  batchAbortControllers.forEach(c => c.abort())
  batchAbortControllers.clear()

  filesMeta.length = 0
  batchQueue = []
  globalChunkQueue = []
  mergeQueue = []
  globalStepStatus = []
  queuedFileKeys.clear()
  fileInfos.value = []
  fileMergeErrors.value = {}
  overallProgress.value = 0
  showProgress.value = false
  uploading.value = false
  runningBatches.value = 0
  processingChunks.value = false
  processingMerges.value = false
}

/** 重试 merge **/
const retryFailedMerges = () => {
  const failed = Object.keys(fileMergeErrors.value).map(k => parseInt(k))
  if (!failed.length) return
  for (const mi of failed) {
    const meta = filesMeta[mi]
    if (meta) {
      globalStepStatus[meta.mergeIndex] = 0
      mergeQueue.push(mi)
      delete fileMergeErrors.value[mi]
    }
  }
  refreshProgress()
  if (!processingMerges.value) processMerges()
}

defineExpose({ fileInfos, fileMergeErrors, overallProgress, resetData, retryFailedMerges })
</script>

<style scoped lang="scss">
.flow-progress {
  margin-top: 10px;
}

:deep(.flow-progress .el-progress__text) {
  min-width: 0;
}
</style>
