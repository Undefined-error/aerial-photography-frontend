<template>
    <div class="report-management-container">
        <img src="@/assets/images/backbg2_project.svg" class="back_ground_report" />
        <!-- 标题及搜索、操作区域 -->
        <div v-if="true">
            <div class="header">
                <div class="report_title">报告</div>
                <div class="search-operate">
                    <a-input
                        placeholder="请输入所属任务"
                        v-model:value="queryParams.flightName"
                        class="search-input"
                        @pressEnter="handleSearch"
                    >
                        <template #prefix>
                            <SearchOutlined class="search_icon"/>
                        </template>
                    </a-input>

                    <a-input
                        placeholder="输入关键字搜索"
                        v-model:value="queryParams.name"
                        @pressEnter="handleSearch"
                        class="search-input"
                    >
                        <template #prefix>
                            <SearchOutlined class="search_icon"/>
                        </template>
                    </a-input>

                    <a-button class="button" @click="handleBatchDownload">下载
                        <template #icon>
                            <DownloadOutlined class="icon_size"/>
                        </template>
                    </a-button>

                    <a-button class="button mr-24" style="background-color: #F56845" @click="handleBatchDelete">删除
                        <template #icon>
                            <DeleteOutlined class="icon_size" />
                        </template>
                    </a-button>
                </div>
            </div>
            <!-- 项目卡片列表 -->
            <div class="project-list" ref="listContainer">
                <!-- 加载中状态提示 -->
                <div v-if="isLoading && reportList.length > 0" class="loading-more">
                    <span>加载中...</span>
                </div>

                <div v-if="reportList.length < 1 && !isLoading" class="empty-state">
                    <img src="@/assets//empty/empty.svg"/>
                    <div style="color: #7b9cab">暂无数据</div>
                </div>

                <div
                    class="project-card"
                    v-for="(item, index) in reportList"
                    :key="index"
                >
                    <div class="card-top">
                        <a-checkbox v-model:checked="item.checked" @change="handleCheckChange(item)"></a-checkbox>
                        <div class="task-id">{{ item.name }}</div>
                    </div>
                    <div class="card-middle">
                        <div class="task-name" :style="{ background: taskNameBg }">
                            {{ item.flyRecordName }}
                        </div>
                        <div class="strip-style"></div>
                        <div class="strip-style"></div>
                        <img src="@/assets/images/report_card_bg.png" class="task-cover" />
                    </div>
                    <div class="creator-container">
                        <div class="creator">{{ item.createBy.slice(0,1) }}</div>{{ item.createBy}}
                    </div>
                    <div class="card-bottom">
                        <div class="flex">
                            <ClockCircleOutlined class="time-icon" />
                            <div class="time">{{ item.createTime }}</div>
                        </div>

                        <div class="more-icon">
                            <MoreOutlined class="more-icon-style"/>
                            <div
                                class="operate-menu"
                            >
                                <div class="menu-item" @click="handleDownload(item.id)">下载</div>
                                <div class="menu-item" @click="handleDelete(item.id)">删除</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="loading-status" v-if="isLoading">
                    加载中...
                </div>
                <!-- 已加载全部提示 -->
                <div v-if="!hasMore && !isLoading && reportList.length > 0" class="load-all">
                    <span>已加载全部数据</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, toRefs} from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { listReport, delReport, downloadReport } from "@/api/project/report"
import { SearchOutlined, DownloadOutlined, DeleteOutlined, MoreOutlined, ClockCircleOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';

const router = useRouter();
const route = useRoute();
const { proxy } = getCurrentInstance();

// 引用列表容器，用于监听滚动事件
const listContainer = ref(null);

const ids = ref([]);

const data = reactive({
    reportList: [],
    total: 0,
    queryParams: {
        pageNum: 1,
        pageSize: 10,
        name: '',
        flightName: '',
        projectId: route.query.projectId
    },
    isLoading: false,
    hasMore: true,
});

const { reportList, total, queryParams, hasMore, isLoading } = toRefs(data);
const taskNameBg = ref('#037CFC');


const handleSearch = () => {
    queryParams.value.pageNum = 1;
    getList();
};

const handleBatchDownload = () => {
    ids.value.forEach(id => {
        handleDownload(id);
    });
};

const handleDownload = async (reportId) => {
    try {
        message.config({
            top: `70px`,
        });
        const loading = message.loading('正在下载...', 0);
        const response = await downloadReport(reportId);
        loading();

        if (!(response instanceof Blob)) {
            // throw new Error('响应不是有效的文件流');
        }

        const blob = new Blob([response], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `报告_${reportId}.docx`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            message.success('下载成功');
        }, 100);
    } catch (error) {
        console.error('下载错误:', error);
        message.error(`下载失败: ${error.message}`);
    }
};

const handleDelete = async (id) => {
    try {
        await proxy.$modal.confirm('是否确认删除该报告？');
        const res = await delReport(id);

        if (res.code === 200) {
            proxy.$modal.msgSuccess('删除成功');
            ids.value = ids.value.filter(itemId => itemId !== id);
            queryParams.value.pageNum = 1
            getList();
        } else {
            proxy.$modal.msgError(res.msg || '删除失败');
        }
    } catch (error) {
        console.error('删除失败:', error);
    }
};

const handleCheckChange = (item) => {
    if (item.checked) {
        !ids.value.includes(item.id) && ids.value.push(item.id);
    } else {
        ids.value = ids.value.filter(id => id !== item.id);
    }
};

const handleBatchDelete = async () => {
    if (ids.value.length === 0) {
        message.warning('请选择需要删除的报告');
        return;
    }

    try {
        await proxy.$modal.confirm(`是否确认删除选中的 ${ids.value.length} 份报告？`);
        const res = await delReport(ids.value.join(","));
        if (res.code === 200) {
            proxy.$modal.msgSuccess('删除成功');
            ids.value = [];
            queryParams.value.pageNum = 1;
            getList();
        } else {
            proxy.$modal.msgError(res.msg || '删除失败');
        }
    } catch (error) {
        console.error('批量删除失败:', error);
    }
};


const handleScroll = () => {

    const container = listContainer.value;
    if (!container) return;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;


    if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMore();
    }
};

const loadMore = () => {
    if (isLoading.value || !hasMore.value) return;

    if (reportList.value.length >= total.value) {
        hasMore.value = false;
        return;
    }
    queryParams.value.pageNum += 1;
    getList();
};

onMounted(() => {
    getList();
    if (listContainer.value) {
        listContainer.value.addEventListener('scroll', handleScroll);
    }
});

onUnmounted(() => {
    if (listContainer.value) {
        listContainer.value.removeEventListener('scroll', handleScroll);
    }
});
// 改进的列表获取逻辑
const getList = () => {
    isLoading.value = true;

    listReport(queryParams.value).then(response => {
        const currentData = queryParams.value.pageNum === 1
            ? response.rows
            : [...reportList.value, ...response.rows];
        reportList.value = currentData;
        total.value = response.total;

        hasMore.value = currentData.length < total.value;
    }).finally(() => {
        isLoading.value = false;
    });
};
</script>

<style scoped lang="scss">
.report-management-container {
    position: relative;
    min-height: 100%;
    background-color: #ECF2FC;
    padding: 40px 0 40px 24px;
    box-sizing: border-box;

    .mr-24 {
        margin-right: 24px;
    }

    .flex {
        display: flex;
    }

    .back_ground_report {
        position: absolute;
        right: 0;
        top: 0;
        background-repeat: no-repeat;
        width: 646px;
        height: 244px;
        z-index: 0;
    }

    .icon_size {
        font-size: 21px;
    }

    .header {
        z-index: 2;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 40px;

        .report_title {
            font-weight: bold;
            font-size: 48px;
            color: #000000;
        }

        .search_icon {
            font-size: 21px;
            color: #999999;
        }

        .search-operate .search-input {
            width: 320px;
            height: 46px;
            margin-left: 16px;
        }

        :deep(.ant-input::placeholder) {
            font-weight: 400;
            font-size: 16px;
            color: #999999;
        }

        .button {
            height: 37px;
            background: #3788FF;
            box-shadow: 2px 2px 6px 0px rgba(55,136,255,0.1),
            7px 9px 11px 0px rgba(55,136,255,0.09),
            15px 20px 15px 0px rgba(55,136,255,0.05),
            27px 35px 18px 0px rgba(55,136,255,0.01),
            42px 54px 19px 0px rgba(55,136,255,0);
            border-radius: 4px 4px 4px 4px;
            font-weight: 400;
            font-size: 16px;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            margin-left: 16px;
        }

        .search-operate {
            display: flex;
            align-items: center;
        }
    }

    .project-list {
        display: flex;
        justify-content: flex-start;
        flex-wrap: wrap;
        min-height: 60vh;
        max-height: calc(100vh - 100px);
        overflow-y: auto;

        // 加载中样式
        .loading-more {
            width: 100%;
            text-align: center;
            padding: 20px 0;
            color: #666;
            font-size: 14px;
        }

        // 已加载全部样式
        .load-all {
            width: 100%;
            text-align: center;
            padding: 15px 0;
            color: #999;
            font-size: 14px;
        }
        .loading-status {
            width: 100%;
            text-align: center;
            padding: 20px 0;
            color: #666;
            font-size: 14px;
        }
        .empty-state {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 0;
        }
    }

    .project-card {
        flex: 0 0 calc(20% - 23px);
        margin-right: 23px;
        margin-bottom: 24px;
        height: 360px;
        background: rgba(249,252,255,0.9);
        border-radius: 8px 8px 8px 8px;
        border: 3px solid #FFFFFF;
        padding: 16px;
        position: relative;
        cursor: pointer;

        &:hover {
            box-shadow: 6px 9px 24px 0px rgba(55,136,255,0.1),
            26px 35px 44px 0px rgba(55,136,255,0.09),
            58px 79px 59px 0px rgba(55,136,255,0.05),
            103px 140px 70px 0px rgba(55,136,255,0.01),
            162px 219px 76px 0px rgba(55,136,255,0);
            border: 3px solid #3788FF;
        }

        .card-top {
            display: flex;
            align-items: center;
            margin-bottom: 8px;

            .task-id {
                margin-left: 8px;
                font-weight: bold;
                font-size: 20px;
                color: #333333;
            }
        }

        .card-middle {
            margin-bottom: 24px;

            .task-name {
                padding: 4px 8px;
                border-radius: 4px;
                color: #fff;
                margin-bottom: 8px;
                display: inline-block;
            }

            .strip-style {
                height: 20px;
                width: 100%;
                background-color: #F3F3F3;
                margin-bottom: 8px;
            }

            .task-cover {
                width: 100%;
                height: auto;
                border-radius: 4px;
            }
        }

        .creator-container {
            display: flex;
            font-weight: 400;
            font-size: 14px;
            color: #666666;
            align-items: center;
            margin-bottom: 28px;

            .creator {
                margin-right: 8px;
                width: 24px;
                height: 24px;
                background: #A4C9FF;
                border-radius: 50%;
                border: 1px solid #FFFFFF;
                font-weight: 400;
                font-size: 10px;
                color: #FFFFFF;
                text-align: center;
                line-height: 24px;
            }
        }

        .card-bottom {
            display: flex;
            justify-content: space-between;
            align-items: center;

            .time-icon {
                font-size: 21px;
                color: #666666;
            }

            .time {
                font-weight: 500;
                font-size: 14px;
                color: #666666;
                margin-left: 8px;
            }

            .more-icon {
                position: relative;
                cursor: pointer;
                width: 32px;
                height: 32px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;

                .more-icon-style {
                    color: #FFFFFF;
                    font-size: 21px;
                }

                &:hover {
                    transform: scale(1.1);
                }
            }

            .operate-menu {
                position: absolute;
                right: 0;
                top: 100%;
                margin-top: 4px;
                background-color: #fff;
                border: 1px solid #eee;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                width: 135px;
                height: 88px;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s ease, visibility 0.2s ease;


                .menu-item {
                    padding: 12px 16px;
                    font-size: 14px;
                    color: #333;
                    cursor: pointer;
                    transition: background-color 0.2s ease;

                    &:hover {
                        background: rgba(55, 136, 255, 0.1);
                        color: #3788FF;
                    }
                }
            }

            &:hover .operate-menu {
                opacity: 1;
                visibility: visible;
            }
        }
    }
}
</style>
