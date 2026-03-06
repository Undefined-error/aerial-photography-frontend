<script setup>
import {onMounted, ref} from 'vue';
import {recordList, batchLoading} from "@/api/record/index.js";
import {ElMessage} from "element-plus";
import {useRoute} from "vue-router";
const route = useRoute();
const props = defineProps({
    open: Boolean
});

const emit = defineEmits(['update:open', 'load-to-map']);

// 本地状态管理
const localOpen = ref(props.open);
const selectedRowKeys = ref([]);
const selectedRows = ref([]);

// 分页相关状态
const currentPage = ref(1);
const pageSize = ref(10);
const totalItems = ref(0);

watch(
    () => props.open,
    (newVal) => {
        localOpen.value = newVal;
        if (newVal) {
            currentPage.value = 1;
        } else {
            selectedRowKeys.value = [];
            selectedRows.value = [];
        }
        getList();
    }
);
const loadingToMap = async (id,loadingStatus) => {
    let status = 0;
    if(loadingStatus !== 2){
        status = 2;
    }
    let ids = id;
    if(id == null){
        ids = selectedRowKeys.value.join(",");
    }
    console.log("ids",selectedRowKeys.value,id)
    try {
        const res = await batchLoading({ ids:ids, loadingStatus:status })
        if (res && res.code === 200) {
            ElMessage.success('修改成功！')
            getList();
            emit('load-to-map');
        }
        return res
    } catch (error) {
        ElMessage.error(`修改失败：${error.message}`)
    }
}
onMounted(() => {
    getList();
})
const getList = async () => {
    try {
        const res = await recordList({pageSize:10,pageNum:currentPage.value, projectId: route.query.projectId})
        if (res && res.code === 200) {
            fullDataList.value = res.rows;
            totalItems.value = Number(res.total);

        }
    } catch (error) {
        ElMessage.error(`获取飞行记录失败：${error.message}`)
    }
}
const closeModal = () => {
    localOpen.value = false;
    emit('update:open', false);
};
const loadingStatusMap = {
    0: '未加载',
    1: '部分已加载',
    2: '已全部加载'
}

const fullDataList = ref([]);



const selectedCount = computed(() => selectedRowKeys.value.length);

const handleSelectionChange = (selection) => {
    selectedRows.value = selection;
    selectedRowKeys.value = selection.map(row => row.id);
};

const handlePageChange = (page, size) => {
    currentPage.value = page;
    if (size) {
        pageSize.value = size;
    }
    selectedRowKeys.value = [];
    selectedRows.value = [];
    getList();
};

</script>

<template>
    <div class="more-fly-task-container">
        <el-dialog
            v-model="localOpen"
            title="飞行任务"
            @close="closeModal"
            :show-close="true"
            :footer="null"
            width="50%"
            class="flight-task-modal"
        >
            <div class="button-container">
                <div class="text">已选任务：<span class="text-strong">{{ selectedCount }}</span>个</div>
                <el-button
                    class="load-map-button"
                    @click="loadingToMap(null,0)"
                    :disabled="selectedCount === 0"
                >
                    加载到地图
                </el-button>
            </div>

            <el-table
                :data="fullDataList"
                stripe
                class="task-table"
                @selection-change="handleSelectionChange"
            >
                <el-table-column
                    type="selection"
                    width="55"
                ></el-table-column>
                <el-table-column
                    prop="name"
                    label="名称"
                ></el-table-column>
                <el-table-column
                    prop="createTime"
                    label="创建时间"
                ></el-table-column>
                <el-table-column
                    prop="action"
                    label="操作"
                >
                    <template #default="scope">
                        <div
                            class="action-btn"
                            :class="{ 'load-action': scope.row.loadingStatus !== 2, 'loaded-action': scope.row.loadingStatus === 2 }"
                            @click="loadingToMap(scope.row.id,scope.row.loadingStatus)"
                        >
                            {{scope.row.loadingStatus === 2?"取消加载":"加载到地图"}}
                        </div>
                    </template>
                </el-table-column>
            </el-table>

            <!-- 分页组件 -->
            <el-pagination
                @size-change="handlePageChange"
                @current-change="handlePageChange"
                :current-page="currentPage"
                :page-sizes="[5, 10, 20, 50]"
                :page-size="pageSize"
                layout="total,  pager, next"
                :total="totalItems"
            ></el-pagination>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
:deep(.flight-task-modal) {
    .el-modal__content {
        padding: 20px;
    }

    .button-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0 20px;
        margin-bottom: 10px;

        .text {
            font-weight: 400;
            font-size: 16px;
            color: rgba(51, 51, 51, 0.7);

            .text-strong {
                font-weight: bold;
                font-size: 20px;
                color: #333333;
                margin: 0 4px;
            }
        }

        .load-map-button {
            width: 138px;
            height: 56px;
            background: linear-gradient(90deg, #3769FF 0%, #37B2FF 100%);
            border-radius: 4px;
            font-weight: 500;
            font-size: 18px;
            color: #FFFFFF;
            border: none;

            &:hover {
                background: linear-gradient(90deg, #2a58e6 0%, #2aa3e6 100%);
                color: #FFFFFF;
            }

            &:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }
        }
    }

    .task-table {
        width: 100%;
        margin-bottom: 20px;

        .el-table__header-wrapper {
            .el-table__header {
                th {
                    background-color: #EFF1F6 !important;
                    border-radius: 0 !important;
                }
            }
        }

        .el-table__body-wrapper {
            .el-table__row {
                td {
                    border-radius: 0 !important;
                }
            }
        }

        .action-btn {
            cursor: pointer;
            text-align: left;

            &.load-action {
                color: #3788FF;
            }

            &.loaded-action {
                color: #999999;
                cursor: default;
            }
        }
    }

    // 分页样式
    .pagination-container {
        display: flex;
        justify-content: flex-end;
        margin-top: 15px;
        padding-top: 10px;
        border-top: 1px solid #eee;
    }
}
</style>
