<template>
  <div>
    <input type="file" @change="handleFileChange" />

    <!-- MD5计算进度 -->
    <div v-if="md5Progress > 0 && md5Progress < 100">
      计算文件MD5: {{ md5Progress }}%
      <a-progress :value="md5Progress" max="100"></a-progress>
    </div>

    <!-- 上传控制按钮 -->
    <a-button @click="startUpload" :disabled="!file || isUploading || isCalculatingMd5">
      {{ isCalculatingMd5 ? '计算MD5中...' : '开始上传' }}
    </a-button>

    <!-- 上传进度 -->
    <div v-if="progress > 0">
      上传进度: {{ progress }}%
      <a-progress :value="progress" max="100"></a-progress>
    </div>

    <!-- 上传结果 -->
    <div v-if="uploadResult">
      上传成功! <br>
      文件夹MD5: {{ foldMd5 }}<br>
      服务器路径: {{ uploadResult.path }}
    </div>

    <!-- 错误信息 -->
    <div v-if="errorMessage" class="error">
      错误: {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref,onMounted } from 'vue'
import { createChunkUploader } from '@/utils/uploadUtils'
import {hasFile} from "@/api/upload/index.js";
const { proxy } = getCurrentInstance()

    const file = ref(null)
    const uploader = ref(null)
    const progress = ref(0)
    const md5Progress = ref(0)
    const isUploading = ref(false)
    const isCalculatingMd5 = ref(false)
    const uploadResult = ref(null)
    const errorMessage = ref('')
    const foldMd5 = ref('')
    // 初始化上传器实例
    const initUploader = () => {
      uploader.value = createChunkUploader({
        url: '/api/upload',
        chunkSize: 5 * 1024 * 1024,
        concurrent: 3
      })

      // 确保uploader.value存在后再设置回调
      if (uploader.value) {
        uploader.value.setProgressCallback((p) => {
          progress.value = p
        })

        uploader.value.setMd5ProgressCallback((p) => {
          md5Progress.value = p
        })

        uploader.value.setSuccessCallback((result) => {
          isUploading.value = false
          uploadResult.value = result
        })

        uploader.value.setErrorCallback((err) => {
          isUploading.value = false
          isCalculatingMd5.value = false
          errorMessage.value = err.message || '上传失败'
        })
      }
    }
    // 组件挂载时初始化
    onMounted(() => {
      initUploader()
    })


    const handleFileChange = async (e) => {
      const selectedFile = e.target.files[0]
      if (!selectedFile) return

      // 重置状态
      file.value = selectedFile
      uploadResult.value = null
      errorMessage.value = ''
      progress.value = 0
      md5Progress.value = 0
      isCalculatingMd5.value = true

      // 创建上传实例
      uploader.value = createChunkUploader({
        url: '/dev-api/file/upload/chunk',
        chunkSize: 5 * 1024 * 1024,
        concurrent: 3,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // 设置回调
      uploader.value.setProgressCallback((p) => {
        progress.value = p
      })

      uploader.value.setMd5ProgressCallback((p) => {
        md5Progress.value = p
      })

      uploader.value.setSuccessCallback((result) => {
        isUploading.value = false
        uploadResult.value = result
      })

      uploader.value.setErrorCallback((err) => {
        isUploading.value = false
        isCalculatingMd5.value = false
        errorMessage.value = err.message || '上传失败'
      })

      try {
        // 设置文件并计算MD5
        await uploader.value.setFile(selectedFile)
        foldMd5.value = uploader.value.foldMd5
        isCalculatingMd5.value = false
      } catch (error) {
        isCalculatingMd5.value = false
        errorMessage.value = 'MD5计算失败: ' + error.message
      }
    }

    const startUpload = async () => {
      if (!file.value || !uploader.value) return

      isUploading.value = true
      let res =  await hasFile({fileMd5:foldMd5.value})
      if(res&&res.code === 200){
        if(!res.data){
          uploader.value.startUpload().then((result) => {
            if(result.code === 200){
              console.log('合并成功（Promise方式）:', result);
              proxy.$antv.msgSuccess("文件上传成功") // 合并成功才算真正上传成功
            }else{
              proxy.$antv.msgError(result?.msg??"合并失败")
            }

          }).catch(error => {
            console.log(error)
            // 这里可以处理未被错误回调捕获的错误
          }).finally(() => {
            isUploading.value = false
          });
        }else{
          proxy.$antv.msgSuccess("文件上传成功")
          isUploading.value = false
        }
      }else{
        proxy.$antv.msgError(res?.msg??"查询异常")
      }
    }
</script>

<style>
.error {
  color: red;
}
</style>