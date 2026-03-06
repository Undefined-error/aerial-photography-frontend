<script setup>
import { ref, computed, toRefs, watch, onMounted, onUnmounted } from 'vue'
import { getAssetUrl } from "@/utils/index.js";
import FieldList from "@/components/FieldList";
import AnalysisResult from "@/components/AnalysisResult";
import DetailNavBar from "@/components/DetailNavBar";
import { doAi, picDetail, algorithm } from "@/api/record/index.js";
import { ElMessage, ElDialog, ElSelect, ElOption } from "element-plus";

const props = defineProps({
    list: {
        type: Array,
        default: [],
    },
    recordId: null,
})

const emit = defineEmits(['close'])
const rows = ref([]);
const currentImage = ref({});
const imageIndex = ref(0);
const loading = ref(true);

// 图片预览状态
const previewVisible = ref(false);
const previewImageUrl = ref('');

// 算法选择相关
const algorithmDialogVisible = ref(false);
const algorithms = ref([]);
const selectedAlgorithm = ref('');

const { list } = toRefs(props);

// 字段列表配置
const fieldList = ref([
    { title: "照片名称", value: "name" },
    { title: "照片类型", value: "type" },
    { title: "识别状态", value: "identifyStatus" },
    { title: "GPS高度", value: "alt" },
    { title: "照片经度", value: "lon" },
    { title: "照片纬度", value: "lat" },
    { title: "照片大小", value: "size" },
    { title: "照片高度", value: "imgWidth" },
    { title: "照片宽度", value: "imgHeight" },
    { title: "拍摄时间", value: "photoTime" },
])

const analysisTextMap = {
    0: 'AI分析',
    1: 'AI正在进行分析',
    2: 'AI重新分析'
}

// 组件挂载时获取算法列表
onMounted(async () => {
    await getAlgorithmList();
});

// 获取算法列表
const getAlgorithmList = async () => {
    try {
        const res = await algorithm();
        if (res && res.code === 200 && Array.isArray(res.data)) {
            algorithms.value = res.data.map(item => ({
                value: item.id,
                label: item.algorithmName
            }));
        } else {
            algorithms.value = [];
            ElMessage.warning("未获取到有效算法列表");
        }
    } catch (error) {
        algorithms.value = [];
    }
};

// 打开预览
const handlePreviewImage = () => {
    previewImageUrl.value = currentImage.value?.path || currentImage.value?.thumbnailPath;
    if (previewImageUrl.value) {
        previewVisible.value = true;
        document.body.style.overflow = 'hidden';
    } else {
        ElMessage.warning("暂无图片可预览");
    }
};

// 关闭预览
const handleClosePreview = () => {
    previewVisible.value = false;
    document.body.style.overflow = '';
};

// ESC关闭预览
const handleKeyDown = (e) => {
    if (e.key === 'Escape' && previewVisible.value) {
        handleClosePreview();
    }
};

window.addEventListener('keydown', handleKeyDown);
onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
    document.body.style.overflow = '';
});

// 点击AI分析显示算法选择弹窗
const handleAnalysis = () => {
    if (algorithms.value.length === 0) {
        ElMessage.warning("暂无可用算法");
        return;
    }
    selectedAlgorithm.value = '';
    algorithmDialogVisible.value = true;
}

// 确认选择算法后执行分析
const confirmAlgorithm = () => {
    if (!selectedAlgorithm.value) {
        ElMessage.warning("请选择算法");
        return;
    }

    algorithmDialogVisible.value = false;
    handleAiAnalysis(selectedAlgorithm.value);
}

// 执行AI分析
const handleAiAnalysis = async (algorithm) => {
    try {
        const res = await doAi({
            ids: String(currentImage.value.id),
            algorithmId: algorithm
        })
        if (res && res.code === 200) {
            ElMessage.success(res.msg);
            currentImage.value.identifyStatus = 1;
            const intervalTime = 5000;
            const maxAttempts = 20;
            let attempts = 0;

            const checkStatusInterval = setInterval(async () => {
                attempts++;
                await getPictureDetail(currentImage.value.id);

                if (currentImage.value.identifyStatus === 2) {
                    clearInterval(checkStatusInterval);
                    ElMessage.success("AI分析完成！");
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkStatusInterval);
                    ElMessage.warning("AI分析超时,请稍后再查看结果");
                }
            }, intervalTime);
        }
    } catch (error) {
        ElMessage.error(`AI分析失败：${error.message || '请求异常'}`);
    }
};

// 切换图片
const handleChangeImage = (type) => {
    if (!rows.value || rows.value.length === 0) return;

    if (type === 'left') {
        imageIndex.value = (imageIndex.value - 1 + rows.value.length) % rows.value.length;
    } else {
        imageIndex.value = (imageIndex.value + 1) % rows.value.length;
    }

    const currentItem = rows.value[imageIndex.value];
    if (currentItem?.id) {
        getPictureDetail(currentItem.id);
    } else {
        ElMessage.warning("图片ID无效");
    }
}

const getCurrentImage = computed(() => {
    return currentImage.value?.thumbnailPath
        ?? getAssetUrl({ folder: "images", name: "login-background.jpg" });
});

const getPictureDetail = async (id) => {
    if (!id) {
        ElMessage.warning("缺少图片ID");
        loading.value = false;
        return;
    }

    try {
        const res = await picDetail(id);
        if (res && res.code === 200) {
            currentImage.value = res.data;
        }
    } catch (error) {
        ElMessage.error(`获取图片详情失败：${error.message}`);
        currentImage.value = {};
    } finally {
        loading.value = false;
    }
}
const approveAi = () =>{
    getPictureDetail(currentImage.value.id);
}

watch(
    () => props.list,
    async (newList) => {
        loading.value = true;

        if (Array.isArray(newList)) {
            rows.value = newList;
            if (newList.length > 0 && newList[0]?.id) {
                imageIndex.value = 0;
                await getPictureDetail(newList[0].id);
            }
        } else {
            setTimeout(() => {
                currentImage.value = {};
                loading.value = false;
            }, 300);
        }
    },
    { deep: true, immediate: true }
);
</script>

<template>
    <div class="image_detail_container">
        <DetailNavBar title="图片详情" @close="emit('close')" />

        <div class="scroll_content">
            <div v-if="loading" class="content-loading">
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p>加载中...</p>
                </div>
            </div>

            <div class="image_list_wrap">
                <div class="float_arrow left_arrow" @click="handleChangeImage('left')" v-if="rows.length > 0">
                    <img src="@/assets/map/arrow_left.svg" alt="左箭头">
                </div>
                <div class="float_arrow right_arrow" @click="handleChangeImage('right')" v-if="rows.length > 0">
                    <img src="@/assets/map/arrow_right.svg" alt="右箭头">
                </div>

                <div class="empty-state" v-if="rows.length === 0 && !loading">
                    <img src="@/assets/empty/empty.svg" alt="暂无图片数据" class="empty-icon">
                    <p>暂无图片信息</p>
                </div>

                <img
                    :src="getCurrentImage"
                    alt="图片封面"
                    v-if="rows.length > 0 && !loading"
                    @click="handlePreviewImage"
                    class="preview-image"
                />

                <div class="image_indicator" v-if="rows.length > 0 && !loading">
                    <div
                        v-for="(item, idx) in rows"
                        :key="item.id"
                        class="indicator_bar"
                        :class="{ 'active': idx === imageIndex }"
                    ></div>
                </div>
            </div>

            <FieldList :rows="currentImage" :fieldList="fieldList" v-if="!loading" />
            <AnalysisResult :rows="currentImage" v-if="!loading && currentImage.identifyStatus == 2" @approve="approveAi"/>

            <div
                class="shining_text_btn"
                :class="{analysis_state:currentImage.identifyStatus===1}"
                @click="handleAnalysis"
                v-if="!loading"
            >
                <img src="@/assets/map/analysis.svg" alt="分析图标">
                <span :class="{shimmer_text:currentImage.identifyStatus===1}">
                    {{ analysisTextMap[currentImage.identifyStatus] }}
                </span>
            </div>
        </div>

        <div v-if="previewVisible" class="preview-backdrop" @click="handleClosePreview">
            <div class="preview-close" @click="handleClosePreview">
                <img src="@/assets/map/close.svg" alt="关闭">
            </div>
            <div class="preview-img-container" @click.stop>
                <img :src="previewImageUrl" alt="图片预览" class="preview-img">
            </div>
        </div>

        <!-- 算法选择弹窗 -->
        <ElDialog
            title="选择分析算法"
            v-model="algorithmDialogVisible"
            :close-on-click-modal="false"
            width="50%"
        >
            <div class="algorithm-select-container">
                <ElSelect
                    v-model="selectedAlgorithm"
                    placeholder="请选择算法"
                    style="width: 100%"
                    clearable
                >
                    <ElOption
                        v-if="algorithms.length === 0"
                        label="暂无算法"
                        value=""
                        disabled
                    />
                    <ElOption
                        v-for="item in algorithms"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                </ElSelect>
            </div>
            <template #footer>
                <button
                    class="el-button el-button--default"
                    @click="algorithmDialogVisible = false"
                >
                    取消
                </button>
                <button
                    class="el-button el-button--primary"
                    @click="confirmAlgorithm"
                    :disabled="!selectedAlgorithm"
                >
                    确认分析
                </button>
            </template>
        </ElDialog>
    </div>
</template>

<style scoped lang="scss">
@use "./index.scss";

.image_detail_container{
    .scroll_content {
        position: relative;
    }

    .content-loading {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        padding: inherit;
        box-sizing: border-box;
    }

    .loading-content {
        text-align: center;
    }

    .spinner {
        width: 40px;
        height: 40px;
        margin: 0 auto;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .loading-content p {
        margin-top: 16px;
        color: #666;
        font-size: 16px;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        gap: 16px;

        .empty-icon {
            width: 60px;
            height: 60px;
            opacity: 0.5;
        }

        p {
            color: #999;
            font-size: 14px;
        }
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .preview-image {
        cursor: pointer;
    }

    .preview-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
    }

    .preview-close {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 36px;
        height: 36px;
        cursor: pointer;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        transition: background-color 0.2s;

        &:hover {
            background-color: rgba(0, 0, 0, 0.7);
        }

        img {
            width: 20px;
            height: 20px;
            filter: brightness(100);
        }
    }

    .preview-img-container {
        max-width: 100%;
        max-height: 80vh;
    }

    .preview-img {
        max-width: 100%;
        max-height: 80vh;
        object-fit: contain;
        box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
    }

    .algorithm-select-container {
        padding: 10px 0;
    }
}
</style>
