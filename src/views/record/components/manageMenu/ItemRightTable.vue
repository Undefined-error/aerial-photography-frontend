<template>
  <div>
    <el-table ref="tableRef" :data="tableData" :row-key="row => row.id" style="width: 100%"
      :row-class-name="tableRowClassName" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" />

      <el-table-column label="媒体名称" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <el-input v-if="editingId === row.id" v-model="newName" size="small" @keyup.enter="confirmRename(row)"
            ref="nameInput" class="name-edit-input" />
          <span v-else>{{ row.name }}</span>
        </template>
      </el-table-column>

      <el-table-column property="createTime" label="创建时间" min-width="150" show-overflow-tooltip />

      <el-table-column label="大小">
        <template #default="{ row }">{{ formatSize(row.size) }}</template>
      </el-table-column>

      <el-table-column property="createBy" label="创建人" />

      <el-table-column label="状态">
        <template #default="{ row }">
          <div class="status" :class="{ graySty: row.loadingStatus === 0 }">
            {{ mapStatus(row.loadingStatus) }}
          </div>
        </template>
      </el-table-column>

      <el-table-column label="识别状态">
        <template #default="{ row }">
          <div class="status" :class="{ graySty: row.identifyStatus === 0 }">
            {{ mapIdentStatus(row.identifyStatus) }}
          </div>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <div class="action">
            <span @click="openDetail(row)">详情</span>

            <span v-if="editingId !== row.id" @click="startEditing(row)">重命名</span>

            <div v-else class="rename-actions">
              <span @click="confirmRename(row)" class="save">保存</span>
              <span @click="cancelRename" class="cancel">取消</span>
            </div>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <ImageDetailDialog v-model:visible="dialogVisible" :detail-data="currentDetail" :image-url="imageUrl"
      @close="closeDetail" @switch="switchImage" />
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';

// 组件导入
import ImageDetailDialog from './ImageDetailDialog.vue';

// API导入
import { rename, picDetail } from '@/api/record';

// 状态管理导入
import { useRecords } from '@/store/modules/records';

//  props定义
const props = defineProps({
  tableData: {
    type: Array,
    required: true,
    default: () => [],
  },
  currentRecord: {
    type: Object,
    required: true,
    default: () => ({}),
  },
  asynDataLeft: Function
});

// 组件引用与状态定义
const tableRef = ref(null);
const nameInput = ref(null);

// 编辑状态管理
const editingId = ref(null);
const newName = ref('');
const selectedRows = ref([]);

// 详情弹窗相关
const dialogVisible = ref(false);
const currentDetail = ref({});
const imageUrl = ref('');
const currentImageIndex = ref(-1);

// 状态管理实例
let recordsStore = null;
try {
  recordsStore = useRecords();
} catch (err) {
  console.warn('useRecords 初始化失败：', err);
}

// 获取当前分组ID
const getGroupId = () => {
  // 优先使用props传入的currentRecord.id
  if (props.currentRecord?.id) {
    return props.currentRecord.id;
  }
  // 若currentRecord.id不存在，从tableData第一条数据取recordId
  if (props.tableData?.length) {
    return props.tableData[0].recordId;
  }
  // 无有效分组ID时返回null
  return null;
};

const isSyncingSelection = ref(false);

// 监听表格数据和当前记录变化，同步选中状态
watch(
  () => [props.tableData, props.currentRecord?.id ?? ''],
  async () => {
    if (!props.tableData?.length || !recordsStore) return;

    const groupId = getGroupId();
    if (!groupId) {
      console.warn('未获取到有效分组ID，无法同步选中状态');
      return;
    }

    const fileIds = recordsStore.getFileIdsByGroup(groupId) || [];

    isSyncingSelection.value = true;
    await nextTick();

    // 只清当前页可见行的选择，然后按 store 勾回
    tableRef.value.clearSelection();
    props.tableData.forEach(row => {
      const checked = fileIds.includes(row.id);
      if (checked) tableRef.value.toggleRowSelection(row, true);
      row.checked = checked;
    });

    selectedRows.value = props.tableData.filter(r => r.checked);
    isSyncingSelection.value = false;
  },
  { immediate: true } // 删掉 deep:true
);


// 处理选择变化
function handleSelectionChange(selection) {
  // 程序化同步过程中的事件直接忽略，避免误清空
  if (isSyncingSelection.value) return;

  selectedRows.value = selection;

  // 仅更新当前页的 checked
  const selectedIds = selection.map(row => row.id);
  props.tableData.forEach(row => {
    row.checked = selectedIds.includes(row.id);
  });

  if (recordsStore) {
    const groupId = getGroupId();
    if (!groupId) return;

    const currentPageIds = props.tableData.map(row => row.id);
    const unselectedIds = currentPageIds.filter(id => !selectedIds.includes(id));

    // 只增删当前页
    if (selectedIds.length) recordsStore.addFileIds(selectedIds, groupId);
    if (unselectedIds.length) recordsStore.removeFileIds(unselectedIds, groupId);
  }

  props.asynDataLeft?.(null,true);
}



// 格式化文件大小
function formatSize(size) {
  if (!size) return '0 MB';
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

// 表格行样式
function tableRowClassName({ row }) {
  return selectedRows.value.some(item => item.id === row.id) ? 'active-row' : '';
}

// 开始编辑（重命名）
function startEditing(row) {
  editingId.value = row.id;
  newName.value = row.name;
  nextTick(() => {
    const input = nameInput.value;
    if (!input) return;

    try {
      if (typeof input.focus === 'function') {
        input.focus();
      } else if (input.$el) {
        const el = input.$el.querySelector('input');
        if (el?.focus) el.focus();
      }
    } catch { }
  });
}

// 确认重命名
async function confirmRename(row) {
  const trimmed = newName.value.trim();
  if (!trimmed) {
    ElMessage.warning('名称不能为空');
    return;
  }

  if (trimmed === row.name) {
    editingId.value = null;
    return;
  }

  try {
    const res = await rename({ id: row.id, name: trimmed });
    if (res?.code === 200) {
      row.name = trimmed;
      editingId.value = null;
      ElMessage.success('修改成功！');
    } else {
      ElMessage.error('修改失败，请重试');
    }
  } catch (err) {
    console.error('重命名失败', err);
    ElMessage.error('修改失败，请重试');
  }
}

// 取消重命名
function cancelRename() {
  editingId.value = null;
}

// 状态映射（加载状态）
function mapStatus(key) {
  const statusMap = {
    0: '未加载',
    1: '处理中',
    2: '已加载',
  };
  return statusMap[key] ?? '未知状态';
}

// 状态映射（识别状态）
function mapIdentStatus(key) {
  const statusMap = {
    0: '待识别',
    1: '识别中',
    2: '已识别',
  };
  return statusMap[key] ?? '未知状态';
}

// 打开详情弹窗
async function openDetail(row) {
  dialogVisible.value = true;
  try {
    const res = await picDetail(row.id);
    if (res?.code === 200) {
      currentDetail.value = res.data || [];
    } else {
      ElMessage.error('获取详情失败');
    }
  } catch (err) {
    console.error('获取详情失败', err);
    ElMessage.error('获取详情失败，请重试');
  }
}

// 关闭详情弹窗
function closeDetail() {
  dialogVisible.value = false;
  currentDetail.value = {};
  imageUrl.value = '';
  currentImageIndex.value = -1;
}

// 切换图片（上一张/下一张）
function switchImage(direction) {
  if (!props.tableData || props.tableData.length <= 1) return;

  let newIndex = currentImageIndex.value;
  if (direction === 'prev') {
    newIndex = newIndex > 0 ? newIndex - 1 : props.tableData.length - 1;
  } else {
    newIndex = newIndex < props.tableData.length - 1 ? newIndex + 1 : 0;
  }

  currentImageIndex.value = newIndex;
  const nextRow = props.tableData[newIndex];
  if (nextRow) openDetail(nextRow);
}

// 暴露组件内部状态
defineExpose({
  selectedRows,
})
</script>

<style lang="scss" scoped>
@use "./index.scss";
</style>