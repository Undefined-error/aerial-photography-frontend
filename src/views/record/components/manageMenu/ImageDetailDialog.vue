<template>
    <el-dialog width="70vw" style="border-radius: 0; padding: 0;" v-model="dialogVisible" :align-center="true"
        :show-close="false" @close="handleClose" class="custom-dialog">
        <div class="detail-container">
            <!-- 左侧图片预览 -->
            <div class="image-preview">
                <template v-if="detailData.path">
                    <el-image :src="detailData.path" fit="contain" style="width: 100%; height: auto;" />
                </template>
                <template v-else>
                    <div class="image-placeholder">
                        <el-icon><picture-filled /></el-icon>
                        <span>图片加载中...</span>
                    </div>
                </template>
            </div>

            <!-- 右侧信息 -->
            <div class="meta-info">
                <div class="dialog-header">
                    <strong>图片详情</strong>
                    <img src="@/assets/icons/svg/close.svg" alt="关闭" class="custom-close" @click="handleClose" />
                </div>

                <template v-if="isLoading">
                    <!-- 骨架屏 -->
                    <el-skeleton :rows="6" animated style="padding: 12px;" />
                </template>
                <template v-else-if="!detailData || Object.keys(detailData).length === 0">
                    <!-- 无数据提示 -->
                    <div class="empty-data">
                        <el-empty description="暂无数据" />
                    </div>
                </template>
                <template v-else>
                    <!-- 元数据信息 -->
                    <div class="meta-descriptions">
                        <div class="list" v-for="item in detailDataArr" :key="item.param">
                            <span>{{ item.label }}</span>
                            <span v-if="!['拍摄位置', '照片类型', '图片大小', '分辨率'].includes(item.label)">{{ detailData[item.param]
                                || '-'
                                }}</span>
                            <span v-if="item.label == '照片类型'">广角图片</span>
                            <span v-if="item.label == '分辨率'">{{ detailData.imgWidth }} x {{ detailData.imgHeight }}</span>
                            <span v-if="item.label == '图片大小'">{{ formatSize(detailData[item.param]) || '-' }}</span>
                            <div v-if="item.label == '拍摄位置'">
                                <span>{{ detailData[item.param1] }}</span>
                                <span v-if="detailData[item.param1]">+"°N"</span>
                                &nbsp;
                                <span>{{ detailData[item.param2] }}</span>
                                <span v-if="detailData[item.param2]">+"°E"</span>

                                <span v-if="!(detailData[item.param1] && detailData[item.param2])">-</span>
                            </div>
                        </div>
                    </div>
                    <!-- AI 分析模块 -->
                    <AnalysisResult :rows="detailData" />
                </template>
            </div>
        </div>
    </el-dialog>
</template>

<script setup>
import { defineProps, defineEmits, watchEffect, ref } from 'vue';
import { PictureFilled } from '@element-plus/icons-vue'
import AnalysisResult from "@/components/AnalysisResult";

const props = defineProps({
    visible: { type: Boolean, default: false },
    detailData: { type: Object, required: true, default: () => ({}) },
    loading: { type: Boolean, default: false }, // 外部传入的加载状态
    imageUrl: { type: String, default: "" }
});

const emit = defineEmits(['update:visible', 'close']);
const dialogVisible = ref(props.visible);
const isLoading = ref(props.loading);

const detailDataArr = ref([
    { label: '照片名称', param: 'name' },
    { label: '照片类型', param: 'type' },
    { label: '任务名称', param: 'flyRecordName' },
    { label: '分辨率', param: 'resolution' },
    { label: '图片大小', param: 'size' },
    { label: '拍摄负载', param: 'captureDevice' },
    { label: '拍摄时间', param: 'photoTime' },
    { label: '拍摄位置', param1: 'lat', param2: 'lon' },
]);

watchEffect(() => {
    dialogVisible.value = props.visible;
    isLoading.value = props.loading;
});

function formatSize(bytes) {
    if (!bytes) return '0 MB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const handleClose = () => {
    emit('update:visible', false);
    emit('close');
};
</script>

<style scoped lang="scss">
.custom-dialog {
    .el-dialog__body {
        padding: 0;
        margin: 0;
    }
}

.detail-container {
    display: flex;
    gap: 20px;
    padding: 10px;

    .image-preview {
        width: 72%;
        max-height: 55vh;
        overflow: hidden;
        min-height: 300px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: #f5f7fa;
        border-radius: 4px;

        .image-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            color: #999;
        }
    }

    .meta-info {
        flex: 1;
        max-height: 55vh;
        overflow: auto;

        .dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            background-color: #f5f7fb;
            padding: 14px;

            strong {
                font-size: 16px;
                font-weight: bold;
            }

            .custom-close {
                cursor: pointer;
                width: 15px;
                height: 15px;
            }
        }

        .meta-descriptions {
            .list {
                border: 1px solid #EBEBEB;
                display: flex;
                justify-content: space-between;
                margin-top: 6px;
                padding: 8px 12px;
                border-radius: 4px;
            }
        }

        .empty-data {
            padding: 20px;
        }
    }
}
</style>
