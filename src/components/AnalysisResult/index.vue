<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import ManualAiEditor from "@/components/ManualAiEditor"
import { UpOutlined, DownOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { aiApprove, manualReview } from "@/api/ai/ai.js";
import { ElMessage } from "element-plus";

const colorArray = [
    '#4CD964',  // 绿色
    '#FF9500',  // 橙色
    '#5AC8FA',  // 浅蓝色
    '#FF2D55',  // 红色
    '#AF52DE',  // 紫色
    '#FFCC00',  // 黄色
    '#5856D6',  // 靛蓝色
    '#FF9500',  // 橙色
    '#34AADC',  // 亮蓝色
    '#AF52DE',  // 深紫色
    '#FF3B30',  // 亮红色
    '#007AFF',  // 蓝色
    '#32ADE6',  // 天蓝色
    '#C62F2F',  // 深红色
    '#7B1FA2'   // 深紫色
];
const emit = defineEmits(['approve'])
const typeColorMap = {}

// 列表缩略图与原图的比例
const thumbnailToOriginalRatio = ref(1)
// 全局原图缓存
const originalImageCache = ref({})
// 标记当前图片是否已缓存
const currentImageCached = ref(false)

// 绘制检测框核心函数
const drawDetectionBoxes = (canvasRef, imageRef, objects, thumbnailRatio = 1,isModal=false) => {
    if (!canvasRef.value || !imageRef.value || !objects.length) return

    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    const img = imageRef.value

    if (!ctx) {
        console.error("[绘制] 无法获取画布2D上下文（可能是跨域图片导致）")
        return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const uniqueTypes = [...new Set(objects.map(obj => obj.name))];
    uniqueTypes.forEach((type, index) => {
        const colorIndex = index % colorArray.length;
        typeColorMap[type] = colorArray[colorIndex];
    });

    objects.forEach((obj, index) => {
        if (obj.xmin >= obj.xmax || obj.ymin >= obj.ymax) {
            console.warn(`[绘制] 第${index}个物体坐标无效:`, obj)
            return
        }

        const scaledXmin = obj.xmin * thumbnailRatio
        const scaledYmin = obj.ymin * thumbnailRatio
        const scaledXmax = obj.xmax * thumbnailRatio
        const scaledYmax = obj.ymax * thumbnailRatio

        const color = typeColorMap[obj.name];
        ctx.strokeStyle = color;
        const canvasWidth = canvas.width;
        const baseLineWidth = 3;
        const widthStep = 1000;
        ctx.lineWidth = baseLineWidth + Math.floor(canvasWidth / widthStep) * baseLineWidth;
        ctx.strokeRect(scaledXmin, scaledYmin, scaledXmax - scaledXmin, scaledYmax - scaledYmin)

        const label = `${obj.name}`
        ctx.fillStyle = ctx.strokeStyle
        ctx.fillRect(
            scaledXmin,
            scaledYmin - 20,
            ctx.measureText(label).width + 10,
            20
        )

        ctx.fillStyle = '#FFFFFF'
        const labelStyle = isModal
            ? { font: '80px sans-serif', height: 80 }
            : { font: '14px sans-serif', height: 20 };
        ctx.font = labelStyle.font
        ctx.fillText(label, scaledXmin + 5, scaledYmin - 5)
    })
}

// 获取原图尺寸
const getOriginalImageSize = async (imagePath) => {
    // 1. 优先使用后端返回的尺寸（无需加载原图）
    const rows = props.rows
    if (rows.originalWidth && rows.originalHeight) {
        return {
            width: Number(rows.originalWidth),
            height: Number(rows.originalHeight)
        }
    }

    // 2. 检查缓存（已有缓存直接返回）
    if (originalImageCache.value[imagePath]?.loaded) {
        return {
            width: originalImageCache.value[imagePath].width,
            height: originalImageCache.value[imagePath].height
        }
    }

    // 3. 无缓存且无后端数据：异步加载原图
    return new Promise((resolve) => {
        // 正在加载中：等待完成
        if (originalImageCache.value[imagePath]?.loading) {
            const checkLoaded = setInterval(() => {
                if (originalImageCache.value[imagePath]?.loaded) {
                    clearInterval(checkLoaded)
                    resolve({
                        width: originalImageCache.value[imagePath].width,
                        height: originalImageCache.value[imagePath].height
                    })
                }
            }, 50)
            return
        }

        // 开始加载原图
        const img = new Image()
        img.crossOrigin = 'anonymous'
        originalImageCache.value[imagePath] = {
            img,
            loading: true,
            loaded: false,
            width: 0,
            height: 0
        }

        img.onload = () => {
            originalImageCache.value[imagePath] = {
                img,
                loading: false,
                loaded: true,
                width: img.naturalWidth,
                height: img.naturalHeight
            }
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight
            })
        }

        img.onerror = () => {
            delete originalImageCache.value[imagePath]
            console.error(`[获取原图尺寸] 加载失败: ${imagePath}`)
            resolve({ width: 0, height: 0 })
        }

        img.src = imagePath
    })
}

// 获取缓存的原图实例
const getCachedOriginalImage = async (imagePath) => {
    if (originalImageCache.value[imagePath]?.loaded) {
        currentImageCached.value = true
        return originalImageCache.value[imagePath].img
    }

    if (originalImageCache.value[imagePath]?.loading) {
        return new Promise((resolve) => {
            const checkLoaded = setInterval(() => {
                if (originalImageCache.value[imagePath]?.loaded) {
                    clearInterval(checkLoaded)
                    currentImageCached.value = true
                    resolve(originalImageCache.value[imagePath].img)
                }
            }, 50)
        })
    }

    // 首次加载：创建实例
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        originalImageCache.value[imagePath] = {
            img,
            loading: true,
            loaded: false,
            width: 0,
            height: 0
        }

        img.onload = () => {
            originalImageCache.value[imagePath] = {
                img,
                loading: false,
                loaded: true,
                width: img.naturalWidth,
                height: img.naturalHeight
            }
            currentImageCached.value = true
            resolve(img)
        }

        img.onerror = () => {
            delete originalImageCache.value[imagePath]
            currentImageCached.value = false
            reject(new Error(`加载图片失败: ${imagePath}`))
        }

        img.src = imagePath
    })
}

const isDropDown = ref(false)
const detectObjects = ref([])
const isModalVisible = ref(false) // 控制原图弹框显示
const isDetailModalVisible = ref(false) // 控制检测框详情弹框显示
const selectedObject = ref(null) // 选中的检测框对象

const canvasRef = ref(null)         // 列表中的画布引用
const imageRef = ref(null)          // 列表中的图片引用（缩略图）
const imageContainerRef = ref(null) // 列表中的图片容器引用
const modalCanvasRef = ref(null)    // 原图弹框中的画布引用
const modalImageRef = ref(null)     // 原图弹框中的图片引用（原图）
const modalRef = ref(null)          // 原图弹框容器引用
const detailCanvasRef = ref(null)   // 详情弹框中的画布引用
const detailImageRef = ref(null)    // 详情弹框中的图片引用（原图）

const props = defineProps({
    rows: {
        type: Object,
        required: true,
        default: () => ({})
    }
})

const approveImage = async () => {
    const res = await aiApprove(props.rows.aiPictureVo.id);
    if (res.code === 200) {
        ElMessage.success('提交成功');
        emit("approve")
    } else {
        ElMessage.error(res.msg || '提交失败');
    }
}

const showManualEditor = ref(false)

/**
 * 处理手动提交的结果（提交给后端）
 */
const handleManualSubmit = async (data) => {
    const response = await manualReview(data)
    if (response.code === 200) {
        ElMessage.success('手动处理结果提交成功')
        detectObjects.value = data.boxes
        showManualEditor.value = false
        emit("approve")
        // 异步重绘检测框
        if (imageRef.value?.complete) {
            handleImageLoad(true)
        }
    } else {
        ElMessage.error(response.msg || '提交失败')
    }
}

const handleManualClose = () => {
    showManualEditor.value = false
}

const parsedDetectResult = computed(() => {
    if (!props.rows.aiPictureVo) {
        return null
    }
    return props.rows.aiPictureVo;
})

const analysisConclusion = computed(() => {
    return parsedDetectResult.value?.conclusion?.replace(/\n/g, '<br>') || '暂无分析结论'
})

const objectCount = computed(() => {
    const count = {
        total: 0,
        types: {}
    };

    detectObjects.value.forEach(obj => {
        const type = obj.name || 'unknown';
        count.types[type] = (count.types[type] || 0) + 1;
        count.total++;
    });

    return count;
});

watch(
    parsedDetectResult,
    async (newResult) => {
        if (newResult?.aiPictureBoxes && Array.isArray(newResult.aiPictureBoxes)) {
            detectObjects.value = newResult.aiPictureBoxes.map(obj => ({
                name: obj.name || 'unknown',
                confidence: Number(obj.confidence) || 0,
                xmin: Number(obj.xmin) || 0,
                ymin: Number(obj.ymin) || 0,
                xmax: Number(obj.xmax) || 0,
                ymax: Number(obj.ymax) || 0,
                aiPictureId: obj.aiPictureId,
                pictureId: obj.aiPictureId,
                type: 0
            }))

            // 异步绘制检测框
            if (imageRef.value?.complete) {
                handleImageLoad(true)
            }

            // 弹框已打开且缓存就绪：异步重绘
            if (isModalVisible.value && currentImageCached.value) {
                nextTick(() => handleModalImageLoad(true))
            }
        } else {
            detectObjects.value = []
            // 清空画布
            if (canvasRef.value?.getContext('2d')) {
                const ctx = canvasRef.value.getContext('2d')
                ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
            }
        }
    },
    { immediate: true }
)

// 缩略图加载
const handleImageLoad = async (isForceRedraw = false) => {
    const img = imageRef.value
    const canvas = canvasRef.value
    const container = imageContainerRef.value
    const imagePath = props.rows.path

    // 同步步骤：优先初始化画布
    if (!img || !canvas || !container) {
        console.log("[列表图片] 依赖未就绪")
        return
    }

    // 1. 同步设置画布尺寸
    const thumbnailNaturalWidth = img.naturalWidth
    const thumbnailNaturalHeight = img.naturalHeight
    const displayWidth = container.clientWidth
    const scale = displayWidth / thumbnailNaturalWidth

    canvas.width = thumbnailNaturalWidth
    canvas.height = thumbnailNaturalHeight
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${thumbnailNaturalHeight * scale}px`

    // 无检测数据
    if (!detectObjects.value.length && !isForceRedraw) return

    // 异步步骤：获取原图尺寸并绘制检测框
    try {
        const originalSize = await getOriginalImageSize(imagePath)
        if (!originalSize.width || !originalSize.height) return

        // 计算比例并绘制检测框
        thumbnailToOriginalRatio.value = Math.min(
            thumbnailNaturalWidth / originalSize.width,
            thumbnailNaturalHeight / originalSize.height
        )
        drawDetectionBoxes(canvasRef, imageRef, detectObjects.value, thumbnailToOriginalRatio.value)
    } catch (error) {
        console.error("[绘制检测框] 失败:", error)
    }
}

// 弹框图片初始化
const handleModalImageLoad = async (isCached = false) => {
    if (!modalImageRef.value || !modalCanvasRef.value || !modalRef.value) return

    const imagePath = props.rows.path
    const cacheData = originalImageCache.value[imagePath]
    let img = modalImageRef.value

    // 缓存就绪：复用实例
    if (isCached || cacheData?.loaded) {
        img = cacheData.img
    }

    const naturalWidth = img.naturalWidth
    const naturalHeight = img.naturalHeight

    const windowWidth = window.innerWidth - 100
    const windowHeight = window.innerHeight - 100

    let scale = 1
    if (naturalWidth > windowWidth) scale = windowWidth / naturalWidth
    if (naturalHeight * scale > windowHeight) scale = windowHeight / naturalHeight

    // 赋值缓存src
    modalImageRef.value.src = img.src
    modalImageRef.value.style.width = `${naturalWidth * scale}px`
    modalImageRef.value.style.height = `${naturalHeight * scale}px`

    modalCanvasRef.value.width = naturalWidth
    modalCanvasRef.value.height = naturalHeight
    modalCanvasRef.value.style.width = `${naturalWidth * scale}px`
    modalCanvasRef.value.style.height = `${naturalHeight * scale}px`

    drawDetectionBoxes(modalCanvasRef, { value: img }, detectObjects.value, 1, true)
}

// 打开弹框
const openModal = async () => {
    const imagePath = props.rows.path
    if (!imagePath) return

    isModalVisible.value = true
    await nextTick()
    if (!modalImageRef.value) return

    try {
        // 仅在弹框时加载缓存
        await getCachedOriginalImage(imagePath)
        handleModalImageLoad(true)
    } catch (error) {
        modalImageRef.value.src = imagePath
    }
}

const closeModal = () => {
    isModalVisible.value = false
}

const handleCanvasClick = (e, isModal = false) => {
    const canvas = isModal ? modalCanvasRef.value : canvasRef.value
    if (!canvas || !detectObjects.value.length) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    let clickX = (e.clientX - rect.left) * scaleX
    let clickY = (e.clientY - rect.top) * scaleY

    if (!isModal) {
        clickX = clickX / thumbnailToOriginalRatio.value
        clickY = clickY / thumbnailToOriginalRatio.value
    }

    const clickedObj = detectObjects.value.find(obj =>
        clickX >= obj.xmin && clickX <= obj.xmax &&
        clickY >= obj.ymin && clickY <= obj.ymax
    )

    if (clickedObj) {
        selectedObject.value = clickedObj
        openDetailModal()
        e.stopPropagation()
    }
}

// 打开详情弹框（缓存复用）
const openDetailModal = async () => {
    const imagePath = props.rows.path
    if (!imagePath || !selectedObject.value) return

    isDetailModalVisible.value = true
    await nextTick()
    if (!detailImageRef.value) return

    try {
        const cachedImg = await getCachedOriginalImage(imagePath)
        detailImageRef.value.src = cachedImg.src
        drawDetailImage()
    } catch (error) {
        detailImageRef.value.src = imagePath
    }
}

// 绘制详情图片
const drawDetailImage = () => {
    if (!selectedObject.value || !detailCanvasRef.value) return

    const imagePath = props.rows.path
    const cachedImg = originalImageCache.value[imagePath]?.img
    // 缓存未就绪：等待加载完成
    if (!cachedImg?.complete) return

    const obj = selectedObject.value
    const canvas = detailCanvasRef.value
    const ctx = canvas.getContext('2d')

    canvas.width = obj.xmax - obj.xmin
    canvas.height = obj.ymax - obj.ymin

    ctx.drawImage(
        cachedImg,
        obj.xmin, obj.ymin,
        obj.xmax - obj.xmin, obj.ymax - obj.ymin,
        0, 0,
        canvas.width, canvas.height
    )

    const color = typeColorMap[obj.name];
    ctx.strokeStyle = color;
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, canvas.width, canvas.height)
}

const closeDetailModal = () => {
    isDetailModalVisible.value = false
    selectedObject.value = null
}

// 详情图片load事件（应对首次加载）
const handleDetailImageLoad = () => {
    drawDetailImage()
}

watch(selectedObject, (newObj) => {
    if (newObj && currentImageCached.value) {
        nextTick(() => drawDetailImage())
    }
})

// 窗口 resize：异步重绘（不阻塞界面）
const handleResize = () => {
    if (imageRef.value?.complete) {
        nextTick(() => handleImageLoad(true))
    }
    if (isModalVisible.value && currentImageCached.value) {
        nextTick(() => handleModalImageLoad(true))
    }
}
window.addEventListener('resize', handleResize)

// 组件卸载：清空缓存
onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    originalImageCache.value = {}
    currentImageCached.value = false
})

const handleModalBackgroundClick = (e) => {
    if (e.target === modalRef.value) {
        closeModal()
    }
}

defineExpose({
    detectObjects
})
</script>

<template>
    <!-- 已分析状态 -->
    <div class="analysis_result_wrap" v-if="rows.identifyStatus === 2">
        <div class="analysis_result_header" @click="isDropDown = !isDropDown">
            <div class="analysis_result_title">AI分析</div>
            <div class="analysis_result_dropdown">
                <UpOutlined v-show="isDropDown" />
                <DownOutlined v-show="!isDropDown" />
            </div>
        </div>

        <div :class="{ analysis_content_active: !isDropDown }" class="analysis_result_content">
            <div class="conclusion" v-html="analysisConclusion"></div>

            <div class="object_stats" v-if="objectCount.total > 0">
                <p>检测统计：共识别了 {{ objectCount.total }} 个物体</p>
                <div class="type_list">
                    <span
                        v-for="(num, type) in objectCount.types"
                        :key="type"
                        class="type_item"
                    >
                      {{ type }}：{{ num }} 个
                    </span>
                </div>
            </div>

            <!-- 缩略图容器：优先显示 -->
            <div class="image_container" v-if="rows.path" ref="imageContainerRef" @click="openModal">
                <img
                    ref="imageRef"
                    :src="rows.thumbnailPath"
                    alt="AI检测图片"
                    @load="handleImageLoad()"
                    class="detect_image"
                    crossorigin="anonymous"
                    style="object-fit: cover; width: 100%; height: 100%;"
                >
                <!-- 叠加画布用于绘制检测框 -->
                <canvas
                    ref="canvasRef"
                    class="detection_canvas"
                    aria-hidden="true"
                    @click="handleCanvasClick($event, false)"
                ></canvas>
                <!-- 点击提示 -->
                <div class="click_hint">点击查看原图 | 点击检测框查看详情</div>
            </div>
        </div>
        <div style="margin-top: 5px">
            <el-button
                type="primary"
                @click="showManualEditor = true"
            >
                手动处理结果
            </el-button>
            <el-button v-if="rows.aiPictureVo && rows.aiPictureVo.status == 0"  @click="approveImage">审核通过</el-button>
        </div>
    </div>

    <!-- 分析中状态 -->
    <div class="analysis_result_wrap" v-else-if="rows.identifyStatus === 1">
        <div class="analysis_result_header">
            <div class="analysis_result_title">AI分析</div>
        </div>
        <div class="analysis_result_content">
            <p>AI正在分析中，请稍候...</p>
        </div>
    </div>

    <!-- 未分析状态 -->
    <div class="analysis_result_wrap" v-else-if="rows.identifyStatus === 0">
        <div class="analysis_result_header">
            <div class="analysis_result_title">AI分析</div>
        </div>
        <div class="analysis_result_content">
            <p>尚未进行AI分析</p>
        </div>
    </div>

    <!-- 原图弹框 -->
    <div
        class="image_modal"
        v-if="isModalVisible"
        ref="modalRef"
        @click="handleModalBackgroundClick"
    >
        <div class="modal_content">
            <button class="close_btn" @click="closeModal">
                <CloseOutlined />
            </button>

            <div class="modal_image_container">
                <img
                    ref="modalImageRef"
                    alt="AI检测原图"
                    @load="handleModalImageLoad()"
                    class="modal_image"
                    crossorigin="anonymous"
                >
                <canvas
                    ref="modalCanvasRef"
                    class="modal_detection_canvas"
                    aria-hidden="true"
                    @click="handleCanvasClick($event, true)"
                ></canvas>
            </div>
        </div>
    </div>

    <!-- 检测框详情弹框 -->
    <div
        class="detail_modal"
        v-if="isDetailModalVisible"
        @click="closeDetailModal"
    >
        <div class="detail_modal_content" @click.stop>
            <div class="detail_header">
                <h3>检测框详情</h3>
                <button class="close_btn" @click="closeDetailModal">
                    <CloseOutlined />
                </button>
            </div>
            <div class="detail_body">
                <div class="detail_image_container">
                    <canvas
                        ref="detailCanvasRef"
                        class="detail_canvas"
                        aria-hidden="true"
                    ></canvas>
                    <img
                        ref="detailImageRef"
                        alt="检测框详情图"
                        @load="handleDetailImageLoad"
                        class="detail_image_hidden"
                        crossorigin="anonymous"
                    >
                </div>
                <div class="detail_info">
                    <h4>物体信息</h4>
                    <table class="detail_table">
                        <tbody>
                        <tr>
                            <td>类型</td>
                            <td>{{ selectedObject?.name || '未知' }}</td>
                        </tr>
                        <tr>
                            <td>置信度</td>
                            <td>{{ selectedObject ? (selectedObject.confidence * 100).toFixed(1) + '%' : '-' }}</td>
                        </tr>
                        <tr>
                            <td>左上角坐标</td>
                            <td>({{ selectedObject?.xmin || 0 }}, {{ selectedObject?.ymin || 0 }})</td>
                        </tr>
                        <tr>
                            <td>右下角坐标</td>
                            <td>({{ selectedObject?.xmax || 0 }}, {{ selectedObject?.ymax || 0 }})</td>
                        </tr>
                        <tr>
                            <td>宽度</td>
                            <td>{{ selectedObject ? (selectedObject.xmax - selectedObject.xmin).toFixed(1) : 0 }}</td>
                        </tr>
                        <tr>
                            <td>高度</td>
                            <td>{{ selectedObject ? (selectedObject.ymax - selectedObject.ymin).toFixed(1) : 0 }}</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <el-dialog
        v-model="showManualEditor"
        title="手动处理AI检测结果"
        width="90%"
        :before-close="handleManualClose"
        destroy-on-close
    >
        <ManualAiEditor
            :image-url="rows.path"
            :original-detects="detectObjects"
            :type-color-map="typeColorMap"
            :aiId="rows.aiPictureVo?rows.aiPictureVo?.id:''"
            :pictureId="rows.aiPictureVo?rows.aiPictureVo?.pictureId:''"
            @submitManualResult="handleManualSubmit"
            @cancel="showManualEditor = false"
        ></ManualAiEditor>
    </el-dialog>
</template>

<style scoped lang="scss">
.analysis_result_wrap {
    margin-top: 24px;
    width: 100%;
    user-select: none;
    border-radius: 8px;
    overflow: hidden;

    .analysis_result_header {
        padding: 0 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        width: 100%;
        height: 59px;
        background: #E9F2FF;

        .analysis_result_title {
            font-weight: bold;
            font-size: 18px;
            color: #333333;
        }

        .analysis_result_dropdown :deep(svg) {
            width: 16px;
            height: 16px;
            transition: transform 0.3s ease;
        }
    }

    .analysis_result_content {
        padding: 16px;
        font-size: 16px;
        color: #333333;
        background: #F5F6FA;
        user-select: text;
        overflow: hidden;
        transition: all 0.3s ease;

        .conclusion {
            margin-bottom: 16px;
            line-height: 1.6;
        }

        .object_stats {
            margin: 12px 0;
            padding: 8px 12px;
            background: #f0f7ff;
            border-radius: 4px;
            font-size: 14px;

            .type_list {
                margin-top: 8px;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }

            .type_item {
                padding: 3px 8px;
                background: rgba(76, 217, 100, 0.1);
                border-radius: 4px;
                color: #333;
            }
        }

        .image_container {
            position: relative;
            width: 336px;
            height: 224px;
            margin-top: 16px;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            cursor: zoom-in;
        }

        .detect_image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .detection_canvas {
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: auto;
            z-index: 10;
            width: 100%;
            height: 100%;
        }

        .click_hint {
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.5);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 5;
        }
    }

    .analysis_content_active {
        height: 0;
        padding: 0;
        max-height: 0;
    }
}

.image_modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 20px;
    box-sizing: border-box;

    .modal_content {
        position: relative;
        max-width: 100%;
        max-height: 100%;
    }

    .close_btn {
        position: absolute;
        top: -40px;
        right: 0;
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;

        &:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        :deep(svg) {
            width: 20px;
            height: 20px;
        }
    }

    .modal_image_container {
        position: relative;
        display: inline-block;
        max-width: 100%;
        max-height: calc(100vh - 50px);
        overflow: auto;
    }

    .modal_image {
        display: block;
        margin: 0 auto;
        max-width: 100%;
        max-height: calc(100vh - 50px);
    }

    .modal_detection_canvas {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: auto;
        z-index: 10;
    }
}

.detail_modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1010;
    padding: 20px;
    box-sizing: border-box;
}

.detail_modal_content {
    position: relative;
    background: white;
    border-radius: 8px;
    width: 70%;
    max-width: 1000px;
    max-height: 90vh;
    overflow: hidden;
}

.detail_header {
    padding: 16px 20px;
    background: #f5f5f5;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
}

.detail_header h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
}

.detail_body {
    display: flex;
    flex-wrap: wrap;
    padding: 20px;
    max-height: calc(90vh - 100px);
    overflow-y: auto;
}

.detail_image_container {
    flex: 1;
    min-width: 300px;
    margin-right: 20px;
    display: flex;
    justify-content: center;
}

.detail_canvas {
    max-width: 100%;
    max-height: 500px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.detail_image_hidden {
    display: none;
}

.detail_info {
    flex: 0 0 300px;
}

.detail_info h4 {
    margin-top: 0;
    margin-bottom: 15px;
    font-size: 16px;
    color: #333;
}

.detail_table {
    width: 100%;
    border-collapse: collapse;
}

.detail_table td {
    padding: 10px 8px;
    border-bottom: 1px solid #eee;
}

.detail_table td:first-child {
    font-weight: bold;
    color: #666;
    width: 40%;
}
</style>
