<template>
    <div class="project-management-container">
        <!-- 背景图 -->
        <div class="back_ground"></div>

        <!-- 标题区域 -->
        <div class="header">
            <div class="title">项目管理</div>
            <div class="en-title">Project Management</div>
        </div>

        <!-- 搜索框 -->
        <el-input
            placeholder="输入关键字搜索"
            prefix-icon="Search"
            class="search-input"
            v-model="queryParams.name"
            @change="handleSearch"
        ></el-input>

        <!-- 操作按钮 -->
        <div class="action-btns" @click="dialogVisible = true">
            + 新建项目
        </div>
        <!-- 新建项目弹窗 -->
        <NewProjectDialog
            v-model:visible="dialogVisible"
            @confirm="handleProjectCreate"
        />

        <!-- 项目卡片列表 -->
        <div class="project-list">
            <div
                class="project-card"
                v-for="(item, index) in projectList"
                :key="index"
                @click="goToDetail(item.id,item.name,item.fileOpus?.key,item.fileOpus?.originName)"
            >
                <!-- 卡片封面 -->
                <div class="card-cover">
                    <img :src="item.cover" />
                    <img src="@/assets/icons/svg/more.svg" class="more-btn"  @click.stop/>
                    <div class="context-menu">
                        <div class="menu-item" @click.stop="handleRename(item)">
                            <el-icon size="20px"><EditPen /></el-icon>
                            <div class="ml-8">重命名</div>
                        </div>
                        <div class="menu-item" @click.stop="handleDelete(item, index)">
                            <el-icon size="20px"><Delete /></el-icon>
                            <div class="ml-8">删除</div>
                        </div>
                    </div>
                </div>

                <!-- 卡片信息区域 -->
                <div class="card-info">
                    <div class="card-create-container">
                        <div class="card-avatar">{{ item.createBy.slice(0,1) }}</div>
                        <div class="card-name">{{ item.createBy }}</div>
                    </div>
                    <p class="card-desc">{{ item.name }}</p>
                    <div class="card-time-container">
                        <img class="card-time-img" src="@/assets/icons/svg/time2.svg" />
                        <div class="card-time">{{ item.createTime }}</div>
                    </div>
                </div>
            </div>

            <div class="loading-status" v-if="isLoading">
                加载中...
            </div>
            <div class="no-more" v-if="!hasMore && !isLoading && projectList.length > 0">
                已加载全部项目
            </div>
        </div>
        <el-dialog
            style="background-color: #f5f6fa !important;border-radius: 0;padding:0; padding-top: 14px;margin-top: auto !important;"
            v-model="renameDialog" width="600" :align-center="true" :show-close="false">
            <template #header="{ close, titleId, titleClass }">
                <div class="dialog-header">
                    <strong :id="titleId" :class="titleClass">重命名项目</strong>
                    <!-- 正确绑定关闭事件 -->
                    <img src="@/assets/icons/svg/close.svg" alt="关闭" class="custom-close" @click="close" />
                </div>
            </template>
            <div class="mainContent">
                <el-form :model="form" label-width="100px">
                    <el-form-item label="项目名称" required>
                        <el-input class="ipt" v-model="form.name" placeholder="请输入新的项目名称" autocomplete="off" />
                    </el-form-item>
                </el-form>

                <el-button class="base submit" plain @click="renameProject">重命名</el-button>
            </div>
        </el-dialog>
    </div>
</template>

<script setup>
import {  onMounted, onUnmounted, reactive, toRefs } from 'vue';
import { useRouter } from 'vue-router'

const router = useRouter()
import NewProjectDialog from '@/views/project/management/newProjectDialog';
import { EditPen, Delete } from '@element-plus/icons-vue';
import { listProject,delProject,updateProject } from "@/api/project/project"
import {ElMessage, ElMessageBox} from "element-plus";

const data = reactive({
    projectList: [],
    total: 0,
    queryParams: {
        pageNum: 1,
        pageSize: 10,
        name: ''
    },
    dialogVisible: false,
    isLoading: false,
    hasMore: true,
    form:{},
    renameDialog:false
})
const { projectList, total, queryParams, dialogVisible, isLoading, hasMore ,form,renameDialog} = toRefs(data)
const getList = () => {
    isLoading.value = true;
    listProject(queryParams.value).then(response => {
        const currentData = queryParams.value.pageNum === 1
            ? response.rows
            : [...projectList.value, ...response.rows];
        projectList.value = currentData;
        total.value = response.total;

        hasMore.value = currentData.length < total.value;
    }).finally(() => {
        isLoading.value = false;
    });
};

const loadMore = () => {
    if (isLoading.value || !hasMore.value) {
        return;
    }

    if (projectList.value.length >= total.value) {
        hasMore.value = false;
        return;
    }

    queryParams.value.pageNum += 1;
    getList();
};

const handleScroll = () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
    const clientHeight = document.documentElement.clientHeight || window.innerHeight
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight
    if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMore()
    }
}
const handleSearch = () => {
    queryParams.value.pageNum = 1
    getList()
}

const handleProjectCreate = (projectData) => {
    console.log('新建项目数据：', projectData);
    queryParams.value.pageNum = 1
    getList();
};

const handleRename = (item) => {
    console.log(`重命名项目：${item.name}`);
    renameDialog.value = true;
    form.value = { ...item };
};
const renameProject = async () =>{
    form.value.cover = null;
  const res = await updateProject(form.value)
    if (res.code === 200) {
        ElMessage.success('重命名项目成功');
        queryParams.value.pageNum = 1
        getList();
    } else {
        ElMessage.error(res.msg || '重命名失败');
    }
    renameDialog.value = false
}

const handleDelete = async (item, index) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除项目 "${item.name}" 吗？此操作不可撤销。`,
            '确认删除',
            {
                confirmButtonText: '确认',
                cancelButtonText: '取消',
                type: 'warning',
                center: true,
            }
        );

        const res = await delProject(item.id);
        if (res.code === 200) {
            ElMessage.success('删除项目成功');
            queryParams.value.pageNum = 1
            getList();
        } else {
            ElMessage.error(res.msg || '删除失败');
        }
    } catch (error) {
    }
};

const goToDetail= (projectId,name,key,originName) =>{
    router.push({
        path: '/detail/map',
        query: { projectId,name,key,originName}
    })
}


onMounted(() => {
    getList();
    window.addEventListener('scroll', handleScroll)
});

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped lang="scss">
.ml-8 {
    margin-left: 8px;
}


.project-management-container {
    position: relative;
    background-color: #ECF2FC;
    flex: 1;
    padding: 64px 0 64px 24px;

    .back_ground {
        position: absolute;
        right: 0;
        top: -65px;
        background-image: url("../../../assets/images/project_background.svg");
        background-repeat: no-repeat;
        width: 1058px;
        height: 490px;
        z-index: 0;
    }

    // 标题区域
    .header {
        display: flex;
        align-items: baseline;
        margin-bottom: 24px;
        z-index: 1;
        position: relative;

        .title {
            font-weight: bold;
            font-size: 48px;
            color: #000000;
        }

        .en-title {
            font-weight: bold;
            font-size: 16px;
            color: #3788FF;
            margin-left: 24px;
        }
    }

    // 搜索框样式
    .search-input {
        width: 320px;
        height: 46px;
        margin-bottom: 40px;
        z-index: 1;
        position: relative;
    }

    // 操作按钮样式
    .action-btns {
        cursor: pointer;
        background: linear-gradient(90deg, #3769FF 0%, #37B2FF 100%);
        box-shadow: 2px 2px 6px 0px rgba(55, 136, 255, 0.1),
        7px 9px 11px 0px rgba(55, 136, 255, 0.09),
        15px 20px 15px 0px rgba(55, 136, 255, 0.05),
        27px 35px 18px 0px rgba(55, 136, 255, 0.01),
        42px 54px 19px 0px rgba(55, 136, 255, 0);
        border-radius: 4px;
        font-weight: 400;
        font-size: 16px;
        color: #FFFFFF;
        line-height: 37px;
        width: 127px;
        height: 37px;
        text-align: center;
        margin-bottom: 58px;
        z-index: 1;
        position: relative;
    }

    // 项目列表样式
    .project-list {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        z-index: 1;
        position: relative;
    }

    // 项目卡片样式
    .project-card {
        flex: 0 0 calc(20% - 23px);
        margin-right: 23px;
        margin-bottom: 24px;
        background: rgba(249, 252, 255, 0.9);
        border-radius: 8px;
        border: 3px solid #FFFFFF;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        cursor: pointer;
        position: relative;
        padding: 16px;
        transition: all 0.3s ease;

        // 卡片 hover 效果
        &:hover {
            box-shadow: 6px 9px 24px 0px rgba(55, 136, 255, 0.1),
            26px 35px 44px 0px rgba(55, 136, 255, 0.09),
            58px 79px 59px 0px rgba(55, 136, 255, 0.05),
            103px 140px 70px 0px rgba(55, 136, 255, 0.01),
            162px 219px 76px 0px rgba(55, 136, 255, 0);
            border: 3px solid #3788FF;
        }

        // 卡片封面区域
        .card-cover {
            width: 100%;
            height: 192px;
            position: relative;
            margin-bottom: 24px;
            border-radius: 4px;

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 4px;
            }

            // 更多按钮
            .more-btn {
                position: absolute;
                top: 10px;
                right: 10px;
                width: 32px;
                height: 32px;
                cursor: pointer;
                z-index: 2;
                transition: transform 0.2s ease;

                // 按钮 hover 效果
                &:hover {
                    transform: scale(1.1);
                }
            }

            // 悬停菜单
            .context-menu {
                margin-top: 4px;
                position: absolute;
                top: 40px; // 位于按钮下方
                right: 10px;
                background-color: #fff;
                border: 1px solid #eee;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                z-index: 3;
                width: 135px;
                height: 88px;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s ease, visibility 0.2s ease;

                // 菜单项样式
                .menu-item {
                    display: flex;
                    align-items: center;
                    padding: 12px 16px;
                    font-size: 14px;
                    color: #333;
                    cursor: pointer;
                    transition: background-color 0.2s ease;

                    // 菜单项 hover 效果
                    &:hover {
                        background: rgba(55, 136, 255, 0.1);
                        color: #3788FF;
                        el-icon {
                            color: #3788FF;
                        }
                    }
                }
            }


            .more-btn:hover + .context-menu,
            .context-menu:hover {
                opacity: 1;
                visibility: visible;
            }
        }

        // 卡片信息区域
        .card-info {
            .card-create-container {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }

            .card-avatar {
                width: 24px;
                height: 24px;
                background: #A4C9FF;
                border-radius: 50%;
                border: 1px solid #FFFFFF;
                display: flex;
                justify-content: center;
                align-items: center;
                font-weight: 400;
                font-size: 10px;
                color: #FFFFFF;
            }

            .card-name {
                font-weight: 400;
                font-size: 14px;
                line-height: 24px;
                color: #666666;
                margin-left: 8px;
            }

            .card-desc {
                margin: 0 0 15px 0;
                font-weight: bold;
                font-size: 20px;
                color: #333333;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .card-time-container {
                display: flex;
                align-items: center;

                .card-time-img {
                    width: 24px;
                    height: 24px;
                }

                .card-time {
                    font-weight: 500;
                    font-size: 14px;
                    color: #666666;
                    margin-left: 8px;
                    line-height: 24px;
                }
            }
        }
    }
    .loading-status, .no-more {
        width: 100%;
        text-align: center;
        padding: 20px 0;
        color: #666;
        font-size: 14px;
    }

    .dialog-header {
        display: flex;
        justify-content: space-between;
        padding: 0 16px;

        .title {
            font-weight: bold;
            font-size: 18px;
            color: black;
        }
    }
    /* 取消 label 加粗 */
    :deep(.el-form-item__label) {
        font-weight: normal !important;
        /* 覆盖默认加粗样式 */
        color: #999;
        /* 可选：调整颜色更贴近普通文本 */
        font-size: 17px;
    }

    /* 修复必填项星号的位置和样式（可选） */
    :deep(.el-form-item__label .el-form-item__label__asterisk) {
        color: #F56C6C;
        /* 保持星号为红色 */
        margin-right: 4px;
    }

    .mainContent {
        background-color: white;
        padding: 40px 20px;
        text-align: center;

        .base {
            width: 160px;
            padding: 24px 0;
            border: 1px solid #0095FF;
            margin-top: 34px;
            font-size: 18px;
            font-weight: normal;
        }

        .cancel {
            color: #0095FF;
            margin-right: 14px;
        }

        .submit {
            background: linear-gradient(to right, #3769FF, #37B2FF);
            color: white;
            margin-left: 14px;
        }
    }

}
</style>
