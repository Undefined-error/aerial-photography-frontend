<template>
    <el-form-item label="项目模型" prop="model" >
        <!-- 上传按钮 -->
        <el-upload
            class="model-upload"
            action="#"
            :auto-upload="false"
            :on-change="handleFileSelect"
            :on-remove="handleFileRemove"
            accept=".glb"
            :disabled="isUploading || isCalculatingMd5"
        >
            <div class="upload_button">
                <el-icon v-if="isCalculatingMd5 || isUploading"><Loading /></el-icon>
                <span v-else>+ 上传模型</span>
            </div>
        </el-upload>

        <!-- MD5计算进度 -->
        <div v-if="md5Progress > 0 && md5Progress < 100" class="progress-container">
            <div class="progress-text">计算文件MD5: {{ md5Progress }}%</div>
            <el-progress :percentage="md5Progress" type="line" />
        </div>

        <!-- 上传进度 -->
        <div v-if="uploadProgress > 0" class="progress-container">
            <div class="progress-text">上传进度: {{ uploadProgress }}%</div>
            <el-progress :percentage="uploadProgress" type="line" :status="getProgressStatus" />
        </div>

<!--        <div v-if="uploadStatus === 'error'" class="error-message">
            <el-icon class="error-icon"><WarningFilled /></el-icon>
            <span>{{ errorMessage }}</span>
        </div>-->
    </el-form-item>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage, ElProgress } from 'element-plus';
import { Loading, WarningFilled, Document, Delete } from '@element-plus/icons-vue';
import { createChunkUploader } from '@/utils/uploadUtils';
import { hasFile } from '@/api/upload/index.js';
import { getToken } from "@/utils/auth"
// 组件属性
const props = defineProps({
    required: {
        type: Boolean,
        default: true
    },
    maxSize: {
        type: Number,
        default: 100 // MB
    },
    chunkSize: {
        type: Number,
        default: 5 // MB
    },
    concurrent: {
        type: Number,
        default: 3 // 并发数
    },
    uploadUrl: {
        type: String,
        default: () => import.meta.env.VITE_APP_BASE_API + '/file/upload/chunk'
    },
    modelValue: {
        type: Number,
        default: null
    }
});


const emit = defineEmits([
    'update:modelValue',
    'upload-start',
    'upload-progress',
    'upload-success',
    'upload-error',
    'md5-calculated'
]);

const modelFile = ref(null);
const uploader = ref(null);
const uploadStatus = ref('idle'); // idle, calculating, uploading, success, error
const md5Progress = ref(0);
const uploadProgress = ref(0);
const isCalculatingMd5 = ref(false);
const isUploading = ref(false);
const errorMessage = ref('');
const resultData = ref();
const getProgressStatus = computed(() => {
    if (uploadProgress.value === 100) return 'success';
    if (uploadProgress.value === 0) return 'info';
    return 'active';
});

// 校验规则
const rules = computed(() => {
    const ruleList = [];
    if (props.required) {
        ruleList.push({
            required: true,
            message: '请上传项目模型',
            trigger: ['change', 'blur']
        });
    }
    return ruleList;
});

// 初始化上传器
const initUploader = () => {
    uploader.value = createChunkUploader({
        url: props.uploadUrl,
        chunkSize: props.chunkSize * 1024 * 1024,
        concurrent: props.concurrent,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    // 设置回调函数
    if (uploader.value) {
        uploader.value.setMd5ProgressCallback((p) => {
            md5Progress.value = p;
            emit('upload-progress', { type: 'md5', progress: p });
        });

        uploader.value.setProgressCallback((p) => {
            uploadProgress.value = p;
            emit('upload-progress', { type: 'upload', progress: p });
        });

        uploader.value.setSuccessCallback(async (result) => {
            isUploading.value = false;
            uploadStatus.value = 'success';

            resultData.value = result.data;
            // 合并模型文件信息和上传结果
            const finalFileData = {
                ...modelFile.value,
                serverPath: result.path,
                uploadResult: result
            };


            emit('upload-success', resultData.value);
            emit('update:modelValue', resultData.value.id);
        });

        uploader.value.setErrorCallback((err) => {
            isUploading.value = false;
            isCalculatingMd5.value = false;
            uploadStatus.value = 'error';
            errorMessage.value = err.message || '上传失败';
            emit('upload-error', err);
        });
    }
};

// 组件挂载时初始化
watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        modelFile.value = newVal;
        uploadStatus.value = 'success';
    }
});

/**
 * 处理文件选择
 */
const handleFileSelect = async (file) => {
    // 重置状态
    resetUploadState();

    // 文件类型校验
    if (!file.name.endsWith('.glb')) {
        uploadStatus.value = 'error';
        errorMessage.value = '请上传.glb格式的模型文件';
        return;
    }

    // 文件大小校验
    if (file.size > props.maxSize * 1024 * 1024) {
        uploadStatus.value = 'error';
        errorMessage.value = `文件大小不能超过${props.maxSize}MB`;
        return;
    }

    modelFile.value = file;
    isCalculatingMd5.value = true;
    uploadStatus.value = 'calculating';
    emit('upload-start');

    try {
        // 初始化上传器
        initUploader();

        // 设置文件并计算MD5
        await uploader.value.setFile(file.raw);

        // 获取计算出的MD5
        const fileMd5 = uploader.value.foldMd5;

        // 更新文件信息
        modelFile.value = {
            ...modelFile.value,
            md5: fileMd5,
            size: file.size,
            name: file.name
        };

        isCalculatingMd5.value = false;
        emit('md5-calculated', fileMd5);

        // 检查文件是否已存在
        checkFileExistence(fileMd5);
    } catch (error) {
        isCalculatingMd5.value = false;
        uploadStatus.value = 'error';
        errorMessage.value = 'MD5计算失败: ' + error.message;
        emit('upload-error', error);
    }
};

/**
 * 检查文件是否已存在
 */
const checkFileExistence = async (fileMd5) => {
    try {
        const res = await hasFile({ fileMd5 });

        if (res && res.code === 200) {
            if (res.data) {
                // 文件已存在，直接使用
                uploadStatus.value = 'success';
                modelFile.value = {
                    ...modelFile.value,
                    serverPath: res.data.path,
                    exists: true
                };
                resultData.value = res.data;
                emit('upload-success', resultData.value);
                emit('update:modelValue', resultData.value.id);
            } else {
                // 文件不存在，开始上传
                startUpload();
            }
        } else {
            uploadStatus.value = 'error';
            errorMessage.value = res?.msg || '查询文件状态失败';
        }
    } catch (error) {
        uploadStatus.value = 'error';
        errorMessage.value = '检查文件状态失败: ' + error.message;
        emit('upload-error', error);
    }
};

/**
 * 开始上传文件
 */
const startUpload = async () => {
    if (!modelFile.value || !uploader.value) return;

    isUploading.value = true;
    uploadStatus.value = 'uploading';

    try {
        await uploader.value.startUpload();
    } catch (error) {
        isUploading.value = false;
        uploadStatus.value = 'error';
        errorMessage.value = '上传过程中出错: ' + error.message;
        emit('upload-error', error);
    }
};

/**
 * 处理文件移除
 */
const handleFileRemove = () => {
    if (uploader.value) {
        uploader.value.cancelUpload();
    }

    resetUploadState();
    emit('update:modelValue', null);
};

/**
 * 重置上传状态
 */
const resetUploadState = () => {
    modelFile.value = null;
    uploadStatus.value = 'idle';
    md5Progress.value = 0;
    uploadProgress.value = 0;
    isCalculatingMd5.value = false;
    isUploading.value = false;
    errorMessage.value = '';
};

/**
 * 处理文件预览
 */
const handleFilePreview = () => {
    if (!modelFile.value) return;

    if (modelFile.value.serverPath) {
        // 从服务器预览
        window.open(modelFile.value.serverPath, '_blank');
    } else if (modelFile.value.url) {
        // 从本地预览
        window.open(modelFile.value.url, '_blank');
    } else {
        ElMessage.warning('无法预览模型文件');
    }
};

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped lang="scss">
.upload_button {
    font-weight: 400;
    font-size: 16px;
    color: #FFFFFF;
    padding: 8px 16px;
    background: #0095FF;
    border-radius: 2px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    &:hover {
        background: #0080e6;
    }

    &:disabled {
        background: #8cc8ff;
        cursor: not-allowed;
    }
}

.progress-container {
    margin-top: 12px;
    width: 100%;
    max-width: 400px;

    .progress-text {
        margin-bottom: 6px;
        font-size: 14px;
        color: #666;
    }
}

.error-message {
    margin-top: 12px;
    padding: 8px 12px;
    background: #fff1f0;
    border: 1px solid #ffe3e0;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 400px;

    .error-icon {
        color: #f5222d;
        width: 16px;
        height: 16px;
    }

    span {
        font-size: 14px;
        color: #f5222d;
    }
}

.model-file {
    margin-top: 12px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 400px;

    .file-info {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        width: 100%;

        .file-icon {
            color: #0095ff;
            width: 24px;
            height: 24px;
            margin-top: 2px;
        }

        .file-name {
            font-size: 14px;
            font-weight: 500;
            color: #333;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .file-details {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 4px;

            .file-size, .file-md5 {
                font-size: 12px;
                color: #666;
            }
        }
    }

    .file-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 8px;

        .preview-btn {
            color: #0095ff;
            padding: 0;
            height: auto;
            font-size: 14px;

            &:hover {
                color: #0080e6;
                background: transparent;
            }
        }

        .remove-icon {
            color: #999;
            width: 18px;
            height: 18px;
            cursor: pointer;

            &:hover {
                color: #ff4d4f;
            }
        }
    }
}
</style>
