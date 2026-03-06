<template>
    <div class="right_content">
        <div class="right_content_header">
            <span>飞行纪录名称</span>
            <el-input class="searchInput" placeholder="输入关键字搜索" :prefix-icon="Search" v-model="searchKeyword"
                @input="handleInput" />
        </div>

        <div class="right_content_bord">
            <div class="right_content_bord_fnArea">
                <el-button size="small" @click="$emit('download')">
                    <img src="@/assets/icons/svg/record_down.svg" />
                    <span>下载</span>
                </el-button>
                <el-button size="small" @click="$emit('mapLoading', true)">
                    <img src="@/assets/icons/svg/record_address.svg" />
                    <span>地图加载</span>
                </el-button>
                <el-button size="small" @click="$emit('openAiDialog')">
                    <img src="@/assets/icons/svg/aiThink_light.svg" />
                    <span>Ai分析</span>
                </el-button>
                <el-button size="small" @click="$emit('openReportDialog')">
                    <img src="@/assets/icons/svg/record_report.svg" />
                    <span>生成报告</span>
                </el-button>
                <el-button size="small" @click="$emit('openAddFileDialog')">
                    <img src="@/assets/icons/svg/record_report.svg" />
                    <span>追加文件</span>
                </el-button>

                <el-dropdown trigger="click">
                    <span>
                        <el-icon class="fn_more">
                            <MoreFilled />
                        </el-icon>
                    </span>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item :icon="Hide" @click="$emit('mapLoading', false)">取消地图加载</el-dropdown-item>
                            <el-dropdown-item :icon="Delete" @click="$emit('remove')">删除</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>

            <div class="right_content_bord_table">
                <ItemRightTable :tableData="tableData" :data="data" ref="tab" />
            </div>

            <div v-if="total > params.pageSize" class="right_content_bord_pages">
                <div class="pagination-placeholder">
                    <el-pagination :page-size="params.pageSize" :current-page="params.pageNum" size="default"
                        :background="true" layout="total, prev, pager, next" :total="total"
                        @current-change="$emit('pageChange', $event)" @size-change="$emit('sizeChange', $event)" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import ItemRightTable from './ItemRightTable.vue';
import { Search, MoreFilled, Delete, Hide } from '@element-plus/icons-vue';

const props = defineProps({
    tableData: Array,
    data: Array,
    total: Number,
    params: Object,
});

const searchKeyword = ref('');

function handleInput() {
    // 这里可以触发搜索事件，emit给父组件
}
</script>