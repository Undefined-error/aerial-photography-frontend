<template>
    <div class="manual-ai-editor">
        <div class="action-btns">
            <el-button
                type="primary"
                @click="toggleAddMode"
                :disabled="!isCanvasReady || isProcessing || isCanvasLoading"
            >
            {{ isAdding ? '取消新增' : '新增检测框' }}
            </el-button>
            <el-button
                type="danger"
                @click="deleteSelected"
                :disabled="!isCanvasReady || !selectedRect || isProcessing || isAdding || isCanvasLoading"
            >
            删除选中框
            </el-button>
            <el-button
                type="warning"
                @click="showEditTypeDialog"
                :disabled="!isCanvasReady || !selectedRect || isProcessing || isAdding || isCanvasLoading"
            >
            修改框类型
            </el-button>
            <el-button
                type="success"
                @click="showConfirmDialog"
                :disabled="!isCanvasReady || isProcessing || manualDetects.length === 0 || isCanvasLoading"
            >
            处理完成
            </el-button>
        </div>
        <!-- 画布容器：新增加载遮罩 -->
        <div class="canvas-container" :style="{ width: canvasFixedWidth + 'px', height: canvasFixedHeight + 'px' }">
            <!-- 1. 新增：画布加载遮罩（覆盖整个画布，加载中显示） -->
            <div class="canvas-loading" v-if="isCanvasLoading">
                <div class="loading-spinner"></div>
                <p class="loading-text">画布加载中...</p>
            </div>
            <!-- 2. 原有画布 -->
            <canvas ref="canvasRef" id="manualCanvas"></canvas>
        </div>

        <!-- 调试信息 -->
        <div v-if="isDebug" class="debug-info">
            <p>调试信息：</p>
            <p>画布就绪：{{ isCanvasReady }}</p>
            <p>画布加载中：{{ isCanvasLoading }}</p> <!-- 新增：调试显示加载状态 -->
            <p>选中框：{{ selectedRect ? '存在' : '不存在' }}</p>
            <p>检测框数量：{{ manualDetects.length }}</p>
            <p>操作限制：仅允许选中，禁止缩放和移动</p>
            <p>图片位置：left={{ imageInstance?.left }}, top={{ imageInstance?.top }}</p>
            <p>缩放比例：{{ imageScale }}</p>
            <p>临时框状态：{{ drawTempRect ? `存在 (${drawTempRect.width}x${drawTempRect.height})` : '不存在' }}</p>
            <p v-if="isDebug">内存使用：{{ memoryUsage }} MB</p>
        </div>

        <!-- 弹窗组件 -->
        <el-dialog
            v-model="addTypeVisible"
            title="输入检测框类型"
            width="60%"
            destroy-on-close
            :style="{ maxHeight: '90vh', overflow: 'hidden' }"
        >
            <div style="max-height: calc(90vh - 120px); overflow-y: auto; padding: 10px 0;">
                <el-input
                    v-model="newTypeName"
                    placeholder="请输入物体类型"
                    @keyup.enter="confirmAddType"
                    style="width: 100%"
                ></el-input>
            </div>
            <template #footer>
                <el-button @click="handleAddCancel">取消</el-button>
                <el-button type="primary" @click="confirmAddType">确认</el-button>
            </template>
        </el-dialog>

        <el-dialog
            v-model="editTypeVisible"
            title="修改检测框类型"
            width="60%"
            destroy-on-close
            :style="{ maxHeight: '90vh', overflow: 'hidden' }"
        >
            <div style="max-height: calc(90vh - 120px); overflow-y: auto; padding: 10px 0;">
                <el-input
                    v-model="editTypeName"
                    placeholder="请输入新的物体类型"
                    @keyup.enter="confirmEditType"
                    style="width: 100%"
                ></el-input>
            </div>
            <template #footer>
                <el-button @click="editTypeVisible = false">取消</el-button>
                <el-button type="primary" @click="confirmEditType">确认</el-button>
            </template>
        </el-dialog>

        <el-dialog
            v-model="confirmVisible"
            title="提交手动处理结果"
            width="80%"
            destroy-on-close
            :style="{ maxHeight: '90vh', overflow: 'hidden' }"
        >
            <div class="confirm-content" style="max-height: calc(90vh - 120px); overflow-y: auto;">
                <p class="tip">请确认检测框信息，并输入最终AI分析结论：</p>
                <div class="detects-preview">
                    <el-table :data="manualDetects" border max-height="300">
                        <el-table-column label="类型" prop="name" width="120"></el-table-column>
                        <el-table-column label="Xmin" prop="xmin" width="80" align="center"></el-table-column>
                        <el-table-column label="Ymin" prop="ymin" width="80" align="center"></el-table-column>
                        <el-table-column label="Xmax" prop="xmax" width="80" align="center"></el-table-column>
                        <el-table-column label="Ymax" prop="ymax" width="80" align="center"></el-table-column>
                    </el-table>
                </div>
                <el-input
                    v-model="manualConclusion"
                    type="textarea"
                    :rows="5"
                    placeholder="请输入AI分析结论（支持换行）"
                    style="margin-top: 16px; width: 100%"
                ></el-input>
            </div>
            <template #footer>
                <el-button @click="cancelSubmit">取消</el-button>
                <el-button type="primary" @click="submitToParent">确认提交</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as fabric from 'fabric'

// 核心配置
const canvasFixedWidth = ref(1200)
const canvasFixedHeight = ref(700)
const imageScale = ref(1)
const isDebug = ref(false)  // 调试模式开关

// 2. 新增：画布加载状态变量（控制遮罩显示）
const isCanvasLoading = ref(true)  // 初始为true，加载完成后设为false

// 性能监控
const memoryUsage = computed(() => {
    if (window.performance?.memory) {
        return ((window.performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2))
    }
    return 'N/A'
})

// Props & Emits
const props = defineProps({
    imageUrl: {
        type: String,
        required: true,
        validator: (val) => val.startsWith('http') || val.startsWith('/')
    },
    originalDetects: {
        type: Array,
        default: () => []
    },
    typeColorMap: {
        type: Object,
        default: () => ({})
    },
    aiId:{
        type: String,
        default: () => ('')
    },
    pictureId:{
        type: String,
        default: () => ('')
    }
})

const emit = defineEmits(['submitManualResult', 'cancel'])

// 状态管理
const canvasRef = ref(null)
const canvas = ref(null)
const isCanvasReady = ref(false)
const imageInstance = ref(null)  // Fabric.Image 对象
const manualDetects = ref([])
const selectedRect = ref(null)
const isAdding = ref(false)
const drawTempRect = ref(null)  // 临时框（fabric.Rect）
const startPoint = ref({ x: 0, y: 0 })
const addTypeVisible = ref(false)
const editTypeVisible = ref(false)
const confirmVisible = ref(false)
const newTypeName = ref('')
const editTypeName = ref('')
const manualConclusion = ref('')
const isProcessing = ref(false)

// 事件监听器存储，用于彻底清理
const canvasEventListeners = ref({})

// 检测框颜色映射
const colorArray = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF',
    '#00FFFF', '#FF8800', '#8800FF', '#00FF88', '#FF0088'
]
const finalTypeColorMap = ref({ ...props.typeColorMap })

// 工具函数：获取检测框颜色
const getTypeColor = (type) => {
    if (finalTypeColorMap.value[type]) return finalTypeColorMap.value[type]
    const newColor = colorArray[Object.keys(finalTypeColorMap.value).length % colorArray.length]
    finalTypeColorMap.value[type] = newColor
    return newColor
}

const getDetectDataFromRect = (rect) => {
    if (rect.data?.originalXmin !== undefined) {
        return {
            name: rect.data.name,
            xmin: rect.data.originalXmin,
            ymin: rect.data.originalYmin,
            xmax: rect.data.originalXmax,
            ymax: rect.data.originalYmax,
            type: rect.data.type || 0,
            confidence: rect.data.type === 0 ? (rect.data.confidence) : 1,
        }
    }
    return { name: '', xmin: 0, ymin: 0, xmax: 0, ymax: 0, confidence: 1}
}

const handleAddCancel = () => {
    if (drawTempRect.value && canvas.value) {
        canvas.value.remove(drawTempRect.value);
        drawTempRect.value.dispose();
        drawTempRect.value = null;
    }
    addTypeVisible.value = false;
    isAdding.value = false;
    newTypeName.value = '';
    canvas.value?.renderAll();
}

const syncManualDetects = () => {
    if (!canvas.value) return
    const rects = canvas.value.getObjects().filter(obj =>
        obj.type === 'group' && obj.getObjects().some(o => o.data?.isDetectBox)
    ).map(group => {
        const rect = group.getObjects().find(o => o.data?.isDetectBox)
        if (rect) rect.group = group
        return rect
    }).filter(rect => rect)

    manualDetects.value = rects.map(getDetectDataFromRect)
}

const registerCanvasEvent = (eventName, handler) => {
    if (canvas.value && !canvasEventListeners.value[eventName]) {
        canvas.value.on(eventName, handler);
        canvasEventListeners.value[eventName] = handler;
    }
}

// 画布初始化（Fabric.js 初始化逻辑）
const initCanvas = async () => {
    try {
        isProcessing.value = true
        isCanvasLoading.value = true  // 启动加载：显示遮罩
        console.log('开始初始化画布...')

        // 1. 预加载图片（验证有效性）
        const testImg = new Image()
        testImg.crossOrigin = 'anonymous'
        await new Promise((resolve, reject) => {
            testImg.onload = () => {
                testImg.onload = null;
                resolve()
            }
            testImg.onerror = () => {
                testImg.onerror = null;
                reject(new Error('图片预加载失败'))
            }
            testImg.src = props.imageUrl
        })

        // 2. 创建Fabric画布实例
        if (!canvasRef.value) {
            throw new Error('Canvas DOM元素未找到')
        }

        canvas.value = new fabric.Canvas(canvasRef.value, {
            selection: true,
            selectionBorderColor: '#1890FF',
            selectionCornerColor: '#FFF',
            selectionCornerSize: 8,
            preserveObjectStacking: true,
            width: canvasFixedWidth.value,
            height: canvasFixedHeight.value,
            backgroundColor: '#f0f0f0'
        })

        // 3. 加载图片为Fabric.Image对象
        const img = await new Promise((resolve, reject) => {
            const imgObj = new Image()
            imgObj.crossOrigin = 'anonymous'
            imgObj.onload = () => {
                imgObj.onload = null;
                const fabricImg = new fabric.Image(imgObj, {
                    left: 0, top: 0, selectable: false, evented: false, zIndex: 1
                })
                resolve(fabricImg)
            }
            imgObj.onerror = (err) => {
                imgObj.onerror = null;
                reject(new Error(`图片加载失败: ${err.message}`))
            }
            imgObj.src = props.imageUrl
        })
        imageInstance.value = img
        canvas.value.add(img)

        // 4. 计算图片缩放比例（原有逻辑不变）
        const scaleX = canvasFixedWidth.value / img.width
        const scaleY = canvasFixedHeight.value / img.height
        const scale = Math.min(scaleX, scaleY, 1)
        imageScale.value = scale || 1

        const imgScaledWidth = img.width * scale
        const imgScaledHeight = img.height * scale
        img.set({
            left: (canvasFixedWidth.value - imgScaledWidth) / 2,
            top: (canvasFixedHeight.value - imgScaledHeight) / 2,
            scaleX: scale,
            scaleY: scale,
            selectable: false
        })

        // 5. 强制渲染并初始化检测框（原有逻辑不变）
        canvas.value.renderAll()
        await nextTick()
        renderOriginalDetects()
        listenCanvasEvents()

        isCanvasReady.value = true
        ElMessage.success(`画布初始化完成（尺寸：${canvasFixedWidth.value}x${canvasFixedHeight.value}）`)
    } catch (err) {
        emit('cancel')
    } finally {
        isProcessing.value = false
        isCanvasLoading.value = false  // 结束加载：隐藏遮罩（无论成功/失败）
    }
}

// 渲染原始检测框（原有代码不变）
const renderOriginalDetects = () => {
    if (!canvas.value || !props.originalDetects.length || !imageScale.value) return
    const imgLeft = imageInstance.value?.left || 0
    const imgTop = imageInstance.value?.top || 0

    props.originalDetects.forEach((detect, index) => {
        try {
            if (detect.xmin >= detect.xmax || detect.ymin >= detect.ymax || detect.xmin < 0 || detect.ymin < 0) {
                throw new Error(`第${index+1}个检测框坐标无效，跳过渲染`)
            }

            const scaledXmin = detect.xmin * imageScale.value + imgLeft
            const scaledYmin = detect.ymin * imageScale.value + imgTop
            const scaledXmax = detect.xmax * imageScale.value + imgLeft
            const scaledYmax = detect.ymax * imageScale.value + imgTop
            const scaledWidth = scaledXmax - scaledXmin
            const scaledHeight = scaledYmax - scaledYmin

            const rect = new fabric.Rect({
                left: scaledXmin,
                top: scaledYmin,
                width: scaledWidth,
                height: scaledHeight,
                fill: 'transparent',
                stroke: getTypeColor(detect.name),
                strokeWidth: 4,
                selectable: true,
                hasBorders: true,
                hasControls: false,
                lockMovementX: true,
                lockMovementY: true,
                lockScalingX: true,
                lockScalingY: true,
                lockRotation: true,
                data: {
                    isDetectBox: true,
                    name: detect.name,
                    originalXmin: detect.xmin,
                    originalYmin: detect.ymin,
                    originalXmax: detect.xmax,
                    originalYmax: detect.ymax,
                    type: 0,
                    confidence: detect.confidence
                },
                zIndex: 10
            })

            const label = new fabric.Text(detect.name, {
                left: scaledXmin,
                top: Math.max(10, scaledYmin - 20),
                fontSize: 16,
                fill: '#FFF',
                backgroundColor: getTypeColor(detect.name),
                padding: 5,
                selectable: false,
                data: { isDetectLabel: true },
                zIndex: 20
            })

            const group = new fabric.Group([rect, label], {
                selectable: true,
                hasBorders: true,
                hasControls: false,
                lockMovementX: true,
                lockMovementY: true,
                lockScalingX: true,
                lockScalingY: true,
                lockRotation: true,
                zIndex: 5
            })
            rect.group = group
            canvas.value.add(group)

        } catch (err) {
            ElMessage.warning(err.message)
            console.warn(err.message)
        }
    })
    syncManualDetects()
    canvas.value.renderAll()
}

// 注册画布事件（原有代码不变）
const listenCanvasEvents = () => {
    registerCanvasEvent('selection:created', (e) => {
        const activeObj = canvas.value.getActiveObject()
        if (!activeObj) {
            selectedRect.value = null
            return
        }
        const rect = activeObj.getObjects().find(obj => obj.data?.isDetectBox)
        if (rect) {
            selectedRect.value = rect
            rect.group = activeObj
        } else {
            selectedRect.value = null
        }
    })

    registerCanvasEvent('selection:cleared', () => {
        selectedRect.value = null
    })

    registerCanvasEvent('selection:updated', (e) => {
        const activeObj = canvas.value.getActiveObject()
        if (!activeObj) {
            selectedRect.value = null
            return
        }
        const rect = activeObj.getObjects().find(obj => obj.data?.isDetectBox)
        if (rect) {
            selectedRect.value = rect
            rect.group = activeObj
        } else {
            selectedRect.value = null
        }
    })

    registerCanvasEvent('mouse:down', (e) => {
        if (!isAdding.value || !e.pointer) return;

        if (drawTempRect.value) {
            if (canvas.value) canvas.value.remove(drawTempRect.value);
            drawTempRect.value.dispose();
            drawTempRect.value = null;
        }

        const pointer = e.pointer;
        const isXValid = typeof pointer.x === 'number' && !isNaN(pointer.x) && isFinite(pointer.x);
        const isYValid = typeof pointer.y === 'number' && !isNaN(pointer.y) && isFinite(pointer.y);
        if (!isXValid || !isYValid) {
            console.error('无效的鼠标坐标:', pointer);
            return;
        }

        startPoint.value = { x: pointer.x, y: pointer.y };
        drawTempRect.value = new fabric.Rect({
            left: startPoint.value.x,
            top: startPoint.value.y,
            width: 0,
            height: 0,
            fill: 'rgba(255, 0, 0, 0.1)',
            stroke: '#FF0000',
            strokeWidth: 3,
            strokeDashArray: [5, 5],
            selectable: false,
            zIndex: 30
        });
        canvas.value.add(drawTempRect.value);
        canvas.value.renderAll();
    });

    registerCanvasEvent('mouse:move', (e) => {
        if (!isAdding.value || !drawTempRect.value || !e.pointer) return;

        const pointer = e.pointer;
        const isXValid = typeof pointer.x === 'number' && !isNaN(pointer.x) && isFinite(pointer.x);
        const isYValid = typeof pointer.y === 'number' && !isNaN(pointer.y) && isFinite(pointer.y);
        if (!isXValid || !isYValid) {
            console.error('无效的移动坐标:', pointer);
            return;
        }

        const width = pointer.x - startPoint.value.x;
        const height = pointer.y - startPoint.value.y;
        const absWidth = Math.abs(width);
        const absHeight = Math.abs(height);
        if (absWidth < 5 || absHeight < 5) return;

        drawTempRect.value.set({
            left: width < 0 ? pointer.x : startPoint.value.x,
            top: height < 0 ? pointer.y : startPoint.value.y,
            width: absWidth,
            height: absHeight
        });
        canvas.value.renderAll();
    });

    registerCanvasEvent('mouse:up', () => {
        if (!isAdding.value || !drawTempRect.value) return;
        const { width, height } = drawTempRect.value;
        if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
            canvas.value.remove(drawTempRect.value);
            drawTempRect.value.dispose();
            drawTempRect.value = null;
            ElMessage.error('临时框数据无效，绘制失败');
            return;
        }
        addTypeVisible.value = true;
    });
}

// 切换新增模式（原有代码不变）
const toggleAddMode = () => {
    isAdding.value = !isAdding.value;
    if (!isAdding.value && drawTempRect.value) {
        canvas.value.remove(drawTempRect.value);
        drawTempRect.value.dispose();
        drawTempRect.value = null;
    }
    canvas.value.discardActiveObject();
    canvas.value.renderAll();
    selectedRect.value = null;
    ElMessage.info(isAdding.value ? '进入新增模式：鼠标拖拽绘制检测框' : '退出新增模式');
}

// 删除选中检测框（原有代码不变）
const deleteSelected = () => {
    if (!selectedRect.value) {
        ElMessage.warning('未选中任何检测框');
        return;
    }

    let group = selectedRect.value.group;
    if (!group || !canvas.value) {
        ElMessage.error('未找到关联的检测框组');
        return;
    }

    group.getObjects().forEach(childObj => {
        if (childObj.dispose) childObj.dispose();
        childObj = null;
    });

    canvas.value.remove(group);
    group.dispose();
    group = null;

    canvas.value.discardActiveObject();
    selectedRect.value = null;
    canvas.value.renderAll();
    syncManualDetects();
    ElMessage.success('检测框已删除');
}

// 打开修改类型弹窗（原有代码不变）
const showEditTypeDialog = () => {
    if (!selectedRect.value) {
        ElMessage.warning('未选中任何检测框');
        return;
    }
    editTypeName.value = selectedRect.value.data.name;
    editTypeVisible.value = true;
}

// 确认新增检测框（原有代码不变）
const confirmAddType = () => {
    if (!newTypeName.value.trim()) {
        ElMessage.warning('请输入有效的物体类型');
        return;
    }
    if (!drawTempRect.value) {
        ElMessage.error('未找到绘制的检测框，请重新绘制');
        return;
    }

    const tempRectData = {
        left: drawTempRect.value.left,
        top: drawTempRect.value.top,
        width: drawTempRect.value.width,
        height: drawTempRect.value.height
    };
    const invalidProps = [];
    Object.entries(tempRectData).forEach(([key, value]) => {
        if (typeof value !== 'number' || isNaN(value) || !isFinite(value) || value <= 0) {
            invalidProps.push(key);
        }
    });
    if (invalidProps.length > 0) {
        ElMessage.error(`检测框数据无效（${invalidProps.join('、')}错误）`);
        return;
    }

    try {
        const imgLeft = imageInstance.value?.left || 0;
        const imgTop = imageInstance.value?.top || 0;
        const scale = imageScale.value || 1;

        const originalXmin = (tempRectData.left - imgLeft) / scale;
        const originalYmin = (tempRectData.top - imgTop) / scale;
        const originalXmax = (tempRectData.left + tempRectData.width - imgLeft) / scale;
        const originalYmax = (tempRectData.top + tempRectData.height - imgTop) / scale;

        const newRect = new fabric.Rect({
            left: tempRectData.left,
            top: tempRectData.top,
            width: tempRectData.width,
            height: tempRectData.height,
            fill: 'transparent',
            stroke: getTypeColor(newTypeName.value),
            strokeWidth: 4,
            selectable: true,
            hasBorders: true,
            hasControls: false,
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            data: {
                isDetectBox: true,
                name: newTypeName.value,
                originalXmin: originalXmin,
                originalYmin: originalYmin,
                originalXmax: originalXmax,
                originalYmax: originalYmax,
                type: 1
            },
            zIndex: 10
        });

        const newLabel = new fabric.Text(newTypeName.value, {
            left: newRect.left,
            top: Math.max(10, newRect.top - 20),
            fontSize: 16,
            fill: '#FFF',
            backgroundColor: getTypeColor(newTypeName.value),
            padding: 5,
            selectable: false,
            data: { isDetectLabel: true },
            zIndex: 20
        });

        const group = new fabric.Group([newRect, newLabel], {
            selectable: true,
            hasBorders: true,
            hasControls: false,
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            zIndex: 5
        });
        newRect.group = group;
        canvas.value.add(group);

        canvas.value.remove(drawTempRect.value);
        drawTempRect.value.dispose();
        drawTempRect.value = null;
        addTypeVisible.value = false;
        newTypeName.value = '';
        isAdding.value = false;

        syncManualDetects();
        canvas.value.renderAll();
        ElMessage.success(`检测框新增成功`);

    } catch (err) {
        ElMessage.error(`新增失败: ${err.message}`);
    }
}

// 确认修改检测框类型（原有代码不变）
const confirmEditType = () => {
    if (!editTypeName.value.trim()) {
        ElMessage.warning('请输入有效的物体类型');
        return;
    }
    if (!selectedRect.value) {
        ElMessage.warning('未选中检测框');
        return;
    }

    try {
        const rect = selectedRect.value;
        const group = rect.group;
        const label = group.getObjects().find(o => o.data?.isDetectLabel);

        rect.data.name = editTypeName.value;
        rect.data.type = 1;
        rect.set({ stroke: getTypeColor(editTypeName.value) });
        label.set({
            text: editTypeName.value,
            backgroundColor: getTypeColor(editTypeName.value)
        });

        editTypeVisible.value = false;
        editTypeName.value = '';
        syncManualDetects();
        canvas.value.renderAll();
        ElMessage.success('检测框类型修改成功');
    } catch (err) {
        ElMessage.error(`修改失败: ${err.message}`);
    }
}

// 打开提交确认弹窗（原有代码不变）
const showConfirmDialog = () => {
    if (props.originalDetects[0]?.conclusion) {
        manualConclusion.value = props.originalDetects[0].conclusion;
    }
    confirmVisible.value = true;
}

// 取消提交（原有代码不变）
const cancelSubmit = () =>{
    confirmVisible.value = false
    manualConclusion.value = ""
}

// 提交数据到父组件（原有代码不变）
const submitToParent = async () => {
    if (!manualConclusion.value.trim()) {
        ElMessage.warning('请输入AI分析结论');
        return;
    }

    isProcessing.value = true;
    const submitData = {
        boxes: manualDetects.value.map(detect => ({
            ...detect,
            xmin: detect.xmin,
            ymin: detect.ymin,
            xmax: detect.xmax,
            ymax: detect.ymax,
            aiPictureId: props.aiId,
            pictureId: props.pictureId
        })),
        conclusion: manualConclusion.value,
        aiPictureId: props.aiId,
        pictureId: props.pictureId
    };
    emit('submitManualResult', submitData);
    manualConclusion.value = "";
    confirmVisible.value = false;
    isProcessing.value = false;
}

// 初始化与清理（原有代码不变）
onMounted(() => {
    initCanvas();
    window.resizeHandler = () => {
        canvas.value?.renderAll();
    };
    window.addEventListener('resize', window.resizeHandler);
});

onUnmounted(() => {
    if (canvas.value) {
        Object.entries(canvasEventListeners.value).forEach(([eventName, handler]) => {
            canvas.value.off(eventName, handler);
            canvasEventListeners.value[eventName] = null;
        });
        canvasEventListeners.value = {};

        canvas.value.getObjects().forEach(obj => {
            canvas.value.remove(obj);
            if (obj.getObjects) {
                obj.getObjects().forEach(childObj => {
                    if (childObj.dispose) childObj.dispose();
                    childObj = null;
                });
            }
            if (obj.dispose) obj.dispose();
            obj = null;
        });
        canvas.value.dispose();
        canvas.value = null;
    }

    if (drawTempRect.value) {
        drawTempRect.value.dispose();
        drawTempRect.value = null;
    }

    if (imageInstance.value) {
        imageInstance.value.dispose();
        imageInstance.value = null;
    }

    if (window.resizeHandler) {
        window.removeEventListener('resize', window.resizeHandler);
        window.resizeHandler = null;
    }

    canvasRef.value = null;
    selectedRect.value = null;
    manualDetects.value = [];
    startPoint.value = { x: 0, y: 0 };
    newTypeName.value = '';
    editTypeName.value = '';
    manualConclusion.value = '';
    isCanvasLoading.value = false; // 新增：卸载时重置加载状态
});

// 监听原始检测框变化（原有代码不变）
watch(() => props.originalDetects, (newVal) => {
    if (isCanvasReady.value && newVal.length) {
        canvas.value.getObjects().forEach(obj => {
            if (obj.type === 'group' && obj.getObjects().some(o => o.data?.isDetectBox)) {
                obj.getObjects().forEach(childObj => {
                    if (childObj.dispose) childObj.dispose();
                    childObj = null;
                });
                obj.dispose();
                canvas.value.remove(obj);
                obj = null;
            }
        });
        renderOriginalDetects();
    }
}, { deep: true });
</script>

<style scoped lang="scss">
.manual-ai-editor {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
}

.canvas-container {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    position: relative; /* 新增：为加载遮罩提供定位上下文 */
    box-sizing: border-box;
    margin: 0 auto;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

#manualCanvas {
    display: block;
    position: relative;
}

/* 4. 新增：画布加载遮罩样式 */
.canvas-loading {
    position: absolute; /* 绝对定位覆盖画布 */
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.8); /* 半透明白色背景 */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 999; /* 层级高于画布，确保可见 */
    backdrop-filter: blur(2px); /* 可选：毛玻璃效果 */
}

/* 加载动画（旋转圆圈） */
.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top: 4px solid #1890FF; /* 主色调 */
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
}

/* 加载文字 */
.loading-text {
    color: #666;
    font-size: 16px;
    font-weight: 500;
}

/* 加载动画关键帧 */
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* 原有样式不变 */
.action-btns {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
    padding: 10px 0;
}

.confirm-content {
    .tip {
        color: #333;
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 12px;
    }

    .detects-preview {
        border: 1px solid #eee;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 16px;
    }
}

.debug-info {
    padding: 10px;
    background-color: #f9f9f9;
    border: 1px solid #eee;
    border-radius: 4px;
    font-size: 12px;
    color: #666;
    margin-top: 10px;
}

@media (max-width: 1400px) {
    .canvas-container {
        width: 90vw !important;
        height: 70vh !important;
    }
}
</style>
