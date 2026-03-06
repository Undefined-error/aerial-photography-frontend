<template>
    <div class="new-project-dialog-container">
        <el-dialog
            title="新建项目"
            v-model="dialogVisible"
            width="560px"
            class="new-project-dialog"
            :close-on-click-modal="false"
            :before-close="handleBeforeClose"
        >
            <!-- 表单区域 -->
            <el-form ref="projectForm" :model="form" :rules="rules">
                <!-- 项目名称 -->
                <el-form-item label="项目名称" prop="name">
                    <el-input v-model="form.name" placeholder="请输入项目名称" clearable></el-input>
                </el-form-item>

                <!-- 项目模型 -->
                <ModelUpload
                    v-model:modelValue="form.model"
                    :maxSize="200"
                    @upload-success="onModelUploadSuccess"
                    @upload-error="onModelUploadError"
                />

                <!-- 项目封面 -->
                <el-form-item label="项目封面" prop="coverFile">
                    <el-upload
                        class="cover-upload"
                        action="#"
                        list-type="picture-card"
                        :auto-upload="false"
                        :multiple="false"
                        :on-change="handleCoverChange"
                        :show-file-list="false"
                        accept="image/png,image/jpeg"
                        v-if="!form.coverFile"
                    >
                        <el-icon class="add_icon"><Plus /></el-icon>
                    </el-upload>

                    <div class="cover-preview" v-if="form.coverFile">
                        <img :src="form.coverFile.url" alt="封面预览">
                        <div class="replace-btn" @click="triggerUpload">替换</div>
                        <el-icon @click="removeCover" class="remove-cover-icon"><Close /></el-icon>
                        <!-- 隐藏的upload组件用于触发文件选择 -->
                        <el-upload
                            ref="uploadRef"
                            style="display: none"
                            action="#"
                            :auto-upload="false"
                            :multiple="false"
                            :on-change="handleCoverChange"
                            accept="image/png,image/jpeg"
                        ></el-upload>
                    </div>
                    <div class="format-tip">仅允许导入png、jpg格式文件</div>
                </el-form-item>

                <!-- 项目成员 -->
                <el-form-item label="项目成员" id="projectMember">
                    <div class="member-invite">
                        <el-input v-model="inviteRole" placeholder="直接邀请团队内成员" @input="searchMember">
                            <template #suffix>
                                <div class="flex">
                                    <div class="role_text">管理员</div>
                                    <el-icon><ArrowDown /></el-icon>
                                </div>
                            </template>
                        </el-input>
                        <div class="search-results">
                            <div v-for="member in searcherMembers" :key="member.userId" class="result-item" @click="selectMember(member)">
                                {{member.userName}}
                            </div>
                        </div>
                    </div>
                    <div v-if="form.projectUserRoles && form.projectUserRoles.length < 1" class="no-members-container flex-center">
                        <div>
                            <img src="@/assets/icons/svg/no-members.svg"/>
                            <div class="format-tip">点击输入框邀请成员</div>
                        </div>
                    </div>
                    <el-table :data="form.projectUserRoles" style="width: 100%" v-if="form.projectUserRoles.length > 0">
                        <el-table-column label="成员" width="320">
                            <template #default="scope">
                                <div class="member-avatar">{{ scope.row.userName.slice(0,1) }}</div>{{ scope.row.userName }}
                            </template>
                        </el-table-column>
                        <el-table-column label="权限" width="100">
                            <template #default="scope">
                                <el-dropdown
                                    @command="(key) => handleRoleChange(scope.$index, key)"
                                    @visible-change="dropdownVisible = $event"
                                >
                                <div class="flex cursor-pointer">
                                    <div class="role_text mr-1">
                                        {{ getRoleLabel(scope.row.roleKey) }}
                                    </div>
                                    <el-icon v-if="dropdownVisible"><ArrowUpBold /></el-icon>
                                    <el-icon v-else><ArrowDown /></el-icon>
                                </div>

                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item command="1">管理员</el-dropdown-item>
                                        <el-dropdown-item command="2">编辑</el-dropdown-item>
                                        <el-dropdown-item command="3">查看者</el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                                </el-dropdown>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="50">
                            <template #default="scope">
                                <el-icon @click="removeMember(scope.$index)" class="remove-member-icon"><Close /></el-icon>
                            </template>
                        </el-table-column>
                    </el-table>
                </el-form-item>
            </el-form>

            <!-- 底部按钮 -->
            <template #footer>
                <div class="flex-center">
                    <div class="cancel-button" @click="handleCancel">取消</div>
                    <div class="create-button" @click="handleSubmit">立即创建</div>
                </div>
            </template>

        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {Plus, Close, ArrowDown, ArrowUpBold} from '@element-plus/icons-vue';
import { addProject,getUserListExifMyself} from "@/api/project/project";
import ModelUpload from '@/views/project/management/ModelUpload';


const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    }
});

const dropdownVisible = ref(false);
const rules = {
    name: [
        { required: true, message: '请输入项目名称', trigger: ['blur'] }
    ],
    coverFile:[
        { required: true, message: '请上传封面', trigger: ['change'] }
    ],
    model:[
        { required: true, message: '请上传模型文件', trigger: [ 'change'] }
    ]
};
const searcherMembers = ref([])


const emit = defineEmits(['update:visible', 'confirm']);

const dialogVisible = ref(props.visible);
watch(
    () => props.visible,
    (newVal) => {
        dialogVisible.value = newVal;
    },
    { immediate: true }
);

watch(dialogVisible, (val) => {
    emit('update:visible', val);
    if (!val) {
        resetForm();
    }
});

const form = ref({
    name: '',
    model: null,
    coverFile: null,
    projectUserRoles: [
    ]
});


const memberDialogVisible = ref(false);
const memberForm = reactive({ name: '' });
const inviteRole = ref();
const uploadRef = ref(null);

const handleCoverChange = (file) => {
    const url = URL.createObjectURL(file.raw);
    form.value.coverFile = {
        file: file.raw,
        url: url
    };
};

const removeCover = () => {
    if (form.value.coverFile?.url) {
        URL.revokeObjectURL(form.value.coverFile.url);
    }
    form.value.coverFile = null;
};


const triggerUpload = () => {
    uploadRef.value?.$el?.querySelector('input[type="file"]')?.click();
};


const removeMember = (index) => {
    form.value.projectUserRoles.splice(index, 1);
};

// 取消按钮
const handleCancel = () => {
    dialogVisible.value = false;
    resetForm()
};

const handleBeforeClose = () => {
    dialogVisible.value = false;
    resetForm();
};

// 提交表单
const handleSubmit = () => {
    // 简单校验
    if (!form.value.name.trim()) {
        ElMessage.warning('请输入项目名称');
        return;
    }
    if (!form.value.model) {
        ElMessage.warning('请上传项目模型');
        return;
    }
    if (!form.value.coverFile) {
        ElMessage.warning('请上传项目封面');
        return;
    }
    add();
};

const add = async () => {
    try {
        const formData = new FormData();
        formData.append('name', form.value.name);
        formData.append('model', form.value.model);
        formData.append('projectUserRoles', JSON.stringify(form.value.projectUserRoles));
        if (form.value.coverFile?.file) {
            formData.append('coverFile', form.value.coverFile.file);
        }

        const response = await addProject(formData);
        if (response.code === 200) {
            ElMessage.success('项目创建成功');
            emit('confirm', response.data);
            dialogVisible.value = false;
            resetForm();
        } else {
            ElMessage.error(response.msg || '创建失败');
        }
    } catch (error) {
        console.error('创建项目失败', error);
        ElMessage.error('创建项目失败');
    }
};

// 重置表单
const resetForm = () => {

    if (form.value.coverFile?.url) {
        URL.revokeObjectURL(form.value.coverFile.url);
    }

    form.value = {
        name: '',
        model: null,
        coverFile: null,
        projectUserRoles: [
        ]
    };

    memberDialogVisible.value = false;
    memberForm.name = '';
    inviteRole.value = '管理员';
};

// 模型上传成功回调
const onModelUploadSuccess = (data) => {
    form.value.model = data.id;
};

// 模型上传失败回调
const onModelUploadError = (error) => {
    console.error('模型上传失败', error);
    ElMessage.error('模型上传失败，请重试');
};
const searchMember = async() =>{
 const res = await  getUserListExifMyself({userName:inviteRole.value})
    if(res.code === 200){
        searcherMembers.value = res.data
    }

}
const selectMember = (item) => {

    const exists = form.value.projectUserRoles.some(
        (member) => member.userId === item.userId
    );
    if (!exists) {
        form.value.projectUserRoles.push({
            userId: item.userId,
            userName: item.userName,
            roleKey: 1
        });
    }
    searcherMembers.value = [];
};
const roleMap = {
    1: '管理员',
    2: '编辑',
    3: '查看者'
};

// 获取显示文本（和你原来的roleKey转label需求一致）
const getRoleLabel = (roleKey) => {
    return roleMap[roleKey] || '未知角色';
};

// 处理角色变更
const handleRoleChange = (index, roleKey) => {
    form.value.projectUserRoles[index].roleKey = roleKey;
};
</script>

<style scoped lang="scss">
.new-project-dialog-container {
    .flex{
        display: flex;
        align-items: center;
    }
    .flex-center{
        display: flex;
        align-items: center;
        justify-content: center;
    }
    :deep(.el-form-item__label){
        font-weight: 400;
        font-size: 16px;
        color: rgba(51,51,51,0.7);
        margin-right: 24px;
        line-height: 48px;
    }

    .upload_button{
        font-weight: 400;
        font-size: 16px;
        color: #FFFFFF;
        padding:8px;
        background: #0095FF;
        border-radius: 2px 2px 2px 2px;
    }
    :deep(.el-upload--picture-card){
        background: rgba(245,246,250,0.5);
        border-radius: 4px 4px 4px 4px;
        border: 1px solid #EBEBEB;
        width: 160px;
        height: 90px;
        margin-right:24px;

    }
    :deep(.el-upload-list--picture-card .el-upload-list__item){
        width: 160px;
        height: 90px;
        border-radius: 0 0 0 0;
        border:none;
    }
    :deep(.el-dialog){
        margin-bottom: 32px;
    }
    .add_icon{
        width: 30px;
        height: 30px;
        padding: 7px;
        background: #EBEBEB;
        border-radius: 50%;

    }
    .format-tip {
        font-weight: 400;
        font-size: 16px;
        color: #999999;
    }
    :deep(#projectMember.el-form-item){
        display: block;
    }
    .replace-btn {
        position: absolute;
        top: 50%;
        left: 50%; /* 左边界对齐父容器中线 */
        transform: translate(-50%,-50%);
        font-weight: 400;
        font-size: 18px;
        color: #FFFFFF;
        padding:4px 12px;
        background: rgba(0,0,0,0.6);
        border-radius: 2px 2px 2px 2px;
        text-align: center;
        cursor: pointer;
        display: none;
    }

    .cover-preview {
        position: relative;
        display: inline-block;
        margin-right:24px;
        img {
            width: 158px;
            height: 88px;
            object-fit: cover;
        }

        .remove-cover-icon {
            position: absolute;
            top: 0;
            right: 0;
            color: #fff;
            width: 24px;
            height: 24px;
            background: #999999;
            padding: 6px;
            cursor: pointer;
            display: none;
        }
        &:hover {
            .replace-btn, .remove-cover-icon {
                display: block;
            }
        }
    }
    .role_text{
        font-weight: 400;
        font-size: 14px;
        color: #333333;
        margin-right: 8px;
    }
    .member-invite {
        position: relative;
        display: flex;
        align-items: center;
        height: 48px;
        margin-top: 16px;
        width: 100%;
        margin-bottom: 10px;
        :deep(.el-input){
            height:48px;
        }

        .search-results {
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            max-height: 200px;
            overflow-y: auto;
            margin-top: 4px;
            background-color: white;
            border: 1px solid #e4e7ed;
            border-radius: 4px;
            box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
            z-index: 1000;
            display: none;
        }

        .search-results:has(> div) {
            display: block;
        }

        .result-item {
            padding: 8px 12px;
            cursor: pointer;
        }

        /* 悬停效果 */
        .result-item:hover {
            background-color: #f5f7fa;
        }

    }
    :deep(.el-table td.el-table__cell, .el-table th.el-table__cell.is-leaf){
        border-bottom:none !important;
    }
    :deep(.el-table){
        background-color: transparent !important;
        --el-table-border:none;
        --el-table-index:none;
        overflow: auto;
    }
    :deep(.el-table__body-wrapper) {
        overflow: hidden !important;
    }

    .member-avatar {
        display: inline-block;
        width: 32px;
        height: 32px;
        line-height: 32px;
        text-align: center;
        background: #A4C9FF;
        border-radius: 50% 50%;
        border: 1px solid #FFFFFF;
        font-weight: 400;
        font-size: 14px;
        color: #FFFFFF;
        text-shadow: 0px 1px 1px #3788FF;
        margin-right: 8px;
    }
    .member-table{
        //background: rgba(245,246,250,0.5);
        //border-radius: 8px 8px 8px 8px;
        //border: 1px solid #EBEBEB;
        //padding: 16px;
    }
    .remove-member-icon {
        cursor: pointer;
        color: #404040;
        width: 16px;
        height:16px;
    }
    :deep(.el-table__cell){
        background-color: transparent !important;
    }
    /* 移除表格背景色 */
    :deep(.el-table) {
        background: rgba(245,246,250,0.5);
        border-radius: 8px 8px 8px 8px;
        border: 1px solid #EBEBEB;
        padding: 16px;
    }
    .cancel-button{
        width: 184px;
        height: 56px;
        background: #FFFFFF;
        border-radius: 4px 4px 4px 4px;
        border: 1px solid #0095FF;
        font-weight: 500;
        font-size: 18px;
        color: #0095FF;
        line-height: 56px;
        margin-right: 32px;
        text-align: center;
        cursor: pointer;
    }
    .create-button{
        width: 184px;
        height: 56px;
        background: linear-gradient( 90deg, #3769FF 0%, #37B2FF 100%);
        border-radius: 4px 4px 4px 4px;
        font-weight: 500;
        font-size: 18px;
        color: #FFFFFF;
        line-height: 56px;
        text-align: center;
        cursor: pointer;
    }
    .no-members-container{
        width: 100%;
        height: 139px;
        background: rgba(245,246,250,0.5);
        border-radius: 8px 8px 8px 8px;
        border: 1px solid #EBEBEB;

    }


}

</style>
