<template>
  <div class="main_container">
    <!-- 背景图 -->
    <img src="@/assets/icons/svg/record_bg.svg" class="record_bg" />

    <div class="mainBox">
      <!-- 左侧内容模块 -->
      <div class="left_content">
        <!-- 左侧头部：标题 + 操作按钮 -->
        <div class="left_content_header">
          <div class="left_content_header_title">
            <span>飞行纪录</span>
          </div>

          <div class="left_content_header_icon">
            <el-tooltip effect="dark" content="导入" placement="top">
              <img
                @click="openImportDialog"
                src="@/assets/icons/svg/allow.svg"
                alt="允许"
              />
            </el-tooltip>

            <el-tooltip effect="dark" content="Ai分析" placement="top">
              <img
                @click="openAiDialog"
                src="@/assets/icons/svg/aiThink.svg"
                alt="AI思考"
              />
            </el-tooltip>

            <el-tooltip effect="dark" content="地图加载" placement="top">
              <img
                @click="() => mapLoading(true)"
                src="@/assets/icons/svg/address.svg"
                alt="地址"
              />
            </el-tooltip>

            <el-tooltip effect="dark" content="取消地图加载" placement="top">
              <img
                @click="() => mapLoading(false)"
                src="@/assets/icons/svg/unAddress.svg"
                alt="取消地址"
              />
            </el-tooltip>

            <el-dropdown trigger="click">
              <span>
                <img src="@/assets/icons/svg/record_left_more.svg" alt="更多" />
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :icon="Download">下载</el-dropdown-item>
                  <el-dropdown-item :icon="Delete" @click="removeRecord()"
                    >删除</el-dropdown-item
                  >
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <!-- 左侧列表内容：飞行记录分组 -->
        <div class="left_content_item">
          <template v-if="data.length">
            <ItemLeft
              v-for="item in data"
              :key="item.id"
              @click="reshData(item)"
              :class="{ active: item.isClick }"
              :data="item"
              :tableData="tableData"
              v-model:checked="item.checked"
              :removeRecord="removeRecord"
              :updateContent="updateContent"
              @update:checked="onCheckedChange"
              :algorithmData="algorithmData"
            />
          </template>
          <el-empty v-else description="暂无飞行记录" />
        </div>
      </div>

      <!-- 右侧内容模块 -->
      <div class="right_content" :key="resizeFlag">
        <!-- 右侧头部：标题 + 搜索 -->
        <div class="right_content_header">
          <span>飞行纪录</span>
          <el-input
            class="searchInput"
            placeholder="输入关键字搜索"
            :prefix-icon="Search"
            v-model="searchKeyword"
            @keyup.enter.native="handleSearch"
          />
        </div>

        <!-- 右侧功能区 & 表格 -->
        <div class="right_content_bord">
          <!-- 功能按钮区 -->
          <div class="right_content_bord_fnArea">
            <el-button size="small" @click="downloadImage">
              <img src="@/assets/icons/svg/record_down.svg" />
              <span>下载</span>
            </el-button>
            <el-button size="small" @click="() => mapLoading(true)">
              <img src="@/assets/icons/svg/record_address.svg" />
              <span>地图加载</span>
            </el-button>
            <el-button size="small" @click="openAiDialog">
              <img src="@/assets/icons/svg/aiThink_light.svg" />
              <span>Ai分析</span>
            </el-button>
            <el-button size="small" @click="openReportDialog">
              <img src="@/assets/icons/svg/record_report.svg" />
              <span>生成报告</span>
            </el-button>
            <el-button size="small" @click="openAddFileDialog">
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
                  <el-dropdown-item :icon="Hide" @click="() => mapLoading(false)"
                    >取消地图加载</el-dropdown-item
                  >
                  <el-dropdown-item :icon="Delete" @click="removeList"
                    >删除</el-dropdown-item
                  >
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- 表格展示区 -->
          <div class="right_content_bord_table">
            <ItemRightTable
              :tableData="tableData"
              :asynDataLeft="asynDataLeft"
              ref="tab"
            />
          </div>

          <!-- 分页 -->
          <div v-if="total > params.pageSize" class="right_content_bord_pages">
            <div class="pagination-placeholder">
              <el-pagination
                :page-size="params.pageSize"
                :current-page="params.pageNum"
                size="default"
                :background="true"
                layout="total, prev, pager, next"
                :total="total"
                @current-change="handlePageChange"
                @size-change="handleSizeChange"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 生成报告弹窗 -->
    <el-dialog
      style="
        background-color: #f5f6fa !important;
        border-radius: 0;
        padding: 0;
        padding-top: 14px;
        margin-top: auto !important;
      "
      v-model="centerDialogVisible"
      width="500"
      :align-center="true"
      :show-close="false"
    >
      <template #header="{ close, titleId, titleClass }">
        <div class="dialog-header">
          <strong :id="titleId" :class="titleClass">生成报告</strong>
          <img
            src="@/assets/icons/svg/close.svg"
            alt="关闭"
            class="custom-close"
            @click="close"
          />
        </div>
      </template>
      <div class="mainContent">
        <el-form :model="form" label-width="100px" :rules="formRules" ref="formRef">
          <el-form-item label="报告名称" required prop="name">
            <el-input
              class="ipt"
              v-model="form.name"
              placeholder="请输入报告名称"
              autocomplete="off"
            />
          </el-form-item>
        </el-form>
        <el-button class="base cancel" plain @click="centerDialogVisible = false"
          >取消</el-button
        >
        <el-button class="base submit" plain @click="createReportFn()"
          >立即生成</el-button
        >
      </div>
    </el-dialog>

    <!-- AI分析弹窗 -->
    <el-dialog
      style="
        background-color: #f5f6fa !important;
        border-radius: 0;
        padding: 0;
        padding-top: 14px;
        margin-top: auto !important;
      "
      v-model="centerDialogVisible3"
      width="500"
      :align-center="true"
      :show-close="false"
    >
      <template #header="{ close, titleId, titleClass }">
        <div class="dialog-header">
          <strong :id="titleId" :class="titleClass">Ai分析</strong>
          <img
            src="@/assets/icons/svg/close.svg"
            alt="关闭"
            class="custom-close"
            @click="close"
          />
        </div>
      </template>
      <div class="mainContent aiStyle">
        <img src="@/assets/icons/svg/aiDialog.svg" />
        <el-form ref="aiFormRef">
          <el-form-item label="算法选择" label-width="150px">
            <el-select
              v-model="currentAlgorithm"
              placeholder="请选择算法"
              style="width: 240px"
            >
              <el-option
                v-for="item in algorithmData"
                :key="item.algorithmName"
                :label="item.algorithmName"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
        <el-button
          class="base cancel"
          plain
          @click="
            centerDialogVisible3 = false;
            currentAlgorithm = null;
          "
          >取消</el-button
        >
        <el-button class="base submit" plain @click="handleAiAnalysis()"
          >开始分析</el-button
        >
      </div>
    </el-dialog>

    <!-- 导入记录弹窗 -->
    <el-dialog
      style="
        background-color: #f5f6fa !important;
        border-radius: 0;
        padding: 0;
        padding-top: 14px;
        margin-top: auto !important;
      "
      v-model="centerDialogVisible2"
      width="500"
      :align-center="true"
      :show-close="false"
      :close-on-click-modal="!isImportUploading"
    >
      <template #header="{ close, titleId, titleClass }">
        <div class="dialog-header">
          <strong :id="titleId" :class="titleClass">导入记录</strong>
          <img
            src="@/assets/icons/svg/close.svg"
            :disabled="isImportUploading"
            alt="关闭"
            class="custom-close"
            @click="handleCloseImportDialog"
          />
        </div>
      </template>
      <div class="mainContent">
        <el-form
          class="form2"
          :model="importForm"
          :rules="importFormRules"
          ref="importFormRef"
        >
          <el-form-item label="记录名称" required label-width="130px" prop="name">
            <el-input
              class="ipt"
              v-model="importForm.name"
              placeholder="请输入项目名称"
              autocomplete="off"
            />
          </el-form-item>
          <el-form-item label="导入媒体" label-width="130px" prop="media">
            <ImageUpload ref="mediaUploadRef" />
          </el-form-item>
          <el-form-item label="同步Ai分析" label-width="130px">
            <el-switch
              v-model="importForm.identifyStatus"
              :active-value="1"
              :inactive-value="0"
            />
          </el-form-item>
          <el-form-item label="同步加载地图" label-width="130px">
            <el-switch
              v-model="importForm.loadingStatus"
              :active-value="2"
              :inactive-value="0"
            />
          </el-form-item>
          <el-form-item label="算法选择" label-width="130px">
            <el-select
              v-model="currentAlgorithm"
              placeholder="请选择算法"
              style="width: 240px"
              :disabled="importForm.identifyStatus != 1"
            >
              <el-option
                v-for="item in algorithmData"
                :key="item.algorithmName"
                :label="item.algorithmName"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
        <el-button
          class="base cancel"
          :disabled="isImportUploading"
          plain
          @click="
            centerDialogVisible2 = false;
            currentAlgorithm = null;
          "
          >取消</el-button
        >
        <el-button
          class="base submit"
          :disabled="isImportUploading"
          plain
          @click="handleImport()"
          >立即导入</el-button
        >
      </div>
    </el-dialog>

    <!-- 追加文件弹窗 -->
    <el-dialog
      style="
        background-color: #f5f6fa !important;
        border-radius: 0;
        padding: 0;
        padding-top: 14px;
        margin-top: auto !important;
      "
      v-model="centerDialogVisible4"
      width="500"
      :align-center="true"
      :show-close="false"
      :close-on-click-modal="!isPushUploading"
    >
      <template #header="{ close, titleId, titleClass }">
        <div class="dialog-header">
          <strong :id="titleId" :class="titleClass">追加文件</strong>
          <img
            src="@/assets/icons/svg/close.svg"
            alt="关闭"
            class="custom-close"
            @click="handleClosePushDialog"
          />
        </div>
      </template>

      <div class="mainContent">
        <el-form ref="addFormRef" class="form2" :model="addForm" :rules="addFormRules">
          <el-form-item label="飞行纪录" required label-width="140px" prop="id">
            <el-select v-model="addForm.id" placeholder="请选择飞行纪录" filterable>
              <el-option
                v-for="item in data"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="地图加载状态" label-width="140px" prop="loadingStatus">
            <el-select v-model="addForm.loadingStatus" placeholder="请选择状态">
              <el-option :label="'不加载'" :value="0" />
              <el-option :label="'已加载'" :value="2" />
            </el-select>
          </el-form-item>

          <el-form-item label="图片识别状态" label-width="140px" prop="identifyStatus">
            <el-select v-model="addForm.identifyStatus" placeholder="请选择状态">
              <el-option :label="'不识别'" :value="0" />
              <el-option :label="'识别'" :value="1" />
            </el-select>
          </el-form-item>

          <el-form-item prop="images" label="选择图片" label-width="140px">
            <ImageUpload ref="pushImages" />
          </el-form-item>

          <el-form-item label="算法选择" label-width="140px">
            <el-select
              v-model="currentAlgorithm"
              placeholder="请选择算法"
              style="width: 240px"
              :disabled="addForm.identifyStatus != 1"
            >
              <el-option
                v-for="item in algorithmData"
                :key="item.algorithmName"
                :label="item.algorithmName"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </el-form>

        <el-button
          class="base cancel"
          :disabled="isPushUploading"
          plain
          @click="
            centerDialogVisible4 = false;
            currentAlgorithm = null;
          "
          >取消</el-button
        >
        <el-button
          class="base submit"
          :disabled="isPushUploading"
          plain
          @click="submitPush"
          >立即追加</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
// ========================
// 基础与组件导入
// ========================
import { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";

// 组件导入
import ItemLeft from "./ItemLeft.vue";
import ItemRightTable from "./ItemRightTable.vue";
import ImageUpload from "../UploadImages.vue";

// 图标导入
import { Search, MoreFilled, Delete, Hide, Download } from "@element-plus/icons-vue";

// API导入
import {
  recordList,
  pictureList,
  remove,
  update,
  download,
  loading,
  doAi,
  createReport,
  removePic,
  add,
  addFiles,
  batchLoading,
  algorithm,
} from "@/api/record";

// 状态管理导入
import { useRecords } from "@/store/modules/records";

// ========================
// 路由与基础变量
// ========================
const route = useRoute();
const projectId = ref(null);
const resizeFlag = ref(0);

// ========================
// 分页与数据存储
// ========================
const params = reactive({
  pageSize: 10,
  pageNum: 1,
});
const data = ref([]); // 左侧分组数据
const tableData = ref([]); // 当前页表格数据
const total = ref(0);
const currentRecordId = ref(null);
const tab = ref(null);
const currentRecord = ref({}); // 当前被选中的分组对象

// ========================
// 状态管理
// ========================
let recordsStore = null;
const searchKeyword = ref("");

// ========================
// 弹窗控制
// ========================
const centerDialogVisible = ref(false); // 生成报告
const centerDialogVisible2 = ref(false); // 导入记录
const centerDialogVisible3 = ref(false); // AI分析
const centerDialogVisible4 = ref(false); // 追加文件

// ========================
// 表单数据
// ========================
const form = reactive({ name: "" });
const formRules = {
  name: [{ required: true, message: "请输入报告名称", trigger: "blur" }],
};
const formRef = ref(null);
const aiFormRef = ref(null);

const importForm = reactive({
  projectId: null,
  name: "",
  identifyStatus: 0,
  loadingStatus: 0,
});
const importFormRules = {
  name: [{ required: true, message: "请输入项目名称", trigger: "blur" }],
};
const importFormRef = ref(null);
const mediaUploadRef = ref(null);

const addForm = reactive({
  projectId: null,
  id: null,
  loadingStatus: 0,
  identifyStatus: 0,
});
const addFormRules = {
  id: [{ required: true, message: "请选择飞行纪录", trigger: "change" }],
};
const addFormRef = ref(null);
const pushImages = ref(null);
const currentAlgorithm = ref(null);
const algorithmData = ref(null);
// ========================
// watch 同步
// ========================
watch(
  projectId,
  (val) => {
    importForm.projectId = val;
    addForm.projectId = val;
  },
  { immediate: true }
);

// ========================
// 弹窗打开方法
// ========================
function openImportDialog() {
  centerDialogVisible2.value = true;
}
function openAiDialog() {
  centerDialogVisible3.value = true;
}
function openReportDialog() {
  centerDialogVisible.value = true;
}
function openAddFileDialog() {
  centerDialogVisible4.value = true;
}

// ========================
// 生命周期
// ========================
onMounted(() => {
  try {
    recordsStore = useRecords();
    if (!recordsStore.fileIds || typeof recordsStore.fileIds !== "object") {
      recordsStore.fileIds = {};
    }
  } catch (e) {
    console.warn("useRecords init failed", e);
  }

  projectId.value = route.query.projectId || null;
  window.addEventListener("resize", handleResize);
  getList();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
});

// ========================
// 路由变化监听
// ========================
watch(
  () => route.query.projectId,
  (newVal) => {
    projectId.value = newVal || null;
    getList();
  }
);

// ========================
// 搜索防抖
// ========================
function handleSearch() {
    params.pageNum = 1;
    params.name = searchKeyword.value;
    getPictureList();
}

// ========================
// 左侧分组和表格逻辑
// ========================
function updateGroupCheckState(recordId) {
  if (!recordsStore) return;
  const fileIds = recordsStore.fileIds[recordId] || [];
  const rows = tableData.value.filter((r) => r.recordId === recordId);
  const group = data.value.find((d) => d.id === recordId);
  if (!group) return;

  if (!rows.length) {
    group.checked = Array.isArray(fileIds) && fileIds.length > 0;
    group.isIndeterminate = false;
    return;
  }

  const selectedCount = rows.filter((r) => fileIds.includes(r.id)).length;
  if (selectedCount === 0) {
    group.checked = false;
    group.isIndeterminate = false;
  } else if (selectedCount === rows.length) {
    group.checked = true;
    group.isIndeterminate = false;
  } else {
    group.checked = false;
    group.isIndeterminate = true;
  }
}

async function getPictureList() {
  if (!data.value.length) return;
  const recordId = currentRecordId.value || (data.value[0] && data.value[0].id);

  try {
    const res = await pictureList({ ...params, recordId });
    if (res && res.code === 200) {
      const group = data.value.find((d) => d.id === recordId);
      const selectedIds = recordsStore?.fileIds?.[recordId] || [];

      // === 初始化右侧表格 ===
      if (group && group.checked === true && group.isIndeterminate === false) {
        // 如果左侧已经是全选状态 → 右侧直接全选
        tableData.value = (res.rows || []).map((item) => ({
          ...item,
          checked: true,
        }));
        // 确保 store 同步全量 id
        if (typeof recordsStore.addFileIds === "function") {
          const visibleIds = tableData.value.map((r) => r.id);
          recordsStore.addFileIds(visibleIds, recordId);
        }
      } else {
        // 否则按已有记录初始化
        tableData.value = (res.rows || []).map((item) => ({
          ...item,
          checked: selectedIds.includes(item.id),
        }));
      }

      total.value = Number(res.total || 0);

      // === 更新左侧复选框状态 ===
      if (group) {
        if (selectedIds.length === 0) {
          group.checked = false;
          group.isIndeterminate = false;
        } else if (selectedIds.length === total.value) {
          group.checked = true;
          group.isIndeterminate = false;
        }
      }
    }
  } catch (error) {
    ElMessage.error(`获取图片列表失败：${error.message || "未知错误"}`);
  }
}

async function getList() {
  try {
    const res = await recordList({ ...params, projectId: projectId.value });
    const resAlg = await algorithm();
    if (res && res.code === 200) {
      data.value = res.rows || [];
      data.value.forEach((d) => {
        if (typeof d.checked === "undefined") d.checked = false;
        if (typeof d.isIndeterminate === "undefined") d.isIndeterminate = false;
        d.isClick = d.isClick || false;
      });
      if (data.value.length && !currentRecordId.value) {
        currentRecordId.value = data.value[0].id;
        data.value[0].isClick = true;
      }
      await getPictureList();
    }

    if (resAlg && resAlg.code == 200) {
      algorithmData.value = resAlg.data;
    }
  } catch (error) {
    ElMessage.error(`获取飞行记录失败：${error.message || "未知错误"}`);
  }
}

function handlePageChange(page) {
  params.pageNum = page;
  getPictureList();
}

function handleSizeChange(size) {
  params.pageSize = size;
  params.pageNum = 1;
  getList();
}

async function reshData(item) {
  currentRecord.value = item;
  currentRecordId.value = item.id;
  data.value.forEach((record) => (record.isClick = record.id === item.id));
  await getPictureList();
  asynDataLeft(item.id);
}

function tableListStore(status, record) {
  if (!recordsStore || !record) return;

  const relatedRows = tableData.value.filter((item) => item.recordId === record.id);
  const ids = relatedRows.map((r) => r.id);

  if (status) {
    recordsStore.addFileIds(ids, record.id);
  } else {
    recordsStore.fileIds[record.id] = [];
    // recordsStore.removeFileIds(ids, record.id);
  }

  tableData.value.forEach((r) => {
    if (r.recordId === record.id) r.checked = status;
  });

  updateGroupCheckState(record.id);
  asynDataLeft(record.id);
}

async function onCheckedChange(record, status) {
  record.checked = status;
  currentRecord.value = record;
  tableListStore(status, record);
}

function asynDataLeft(targetRecordId = null, forceAll = false) {
  const visibleRecordIds = new Set(tableData.value.map((row) => row.recordId));
  data.value.forEach((item) => {
    if (!forceAll) {
      if (targetRecordId) {
        if (item.id !== targetRecordId) return;
      } else {
        if (!visibleRecordIds.has(item.id)) return;
      }
    }

    const fileIds =
      (recordsStore && recordsStore.fileIds && recordsStore.fileIds[item.id]) || [];
    const rows = tableData.value.filter((row) => row.recordId === item.id);
    const tableIds = rows.map((row) => row.id);

    if (!tableIds.length) {
      if (Array.isArray(fileIds) && fileIds.length > 0) {
        item.checked = true;
        item.isIndeterminate = false;
      } else {
        item.checked = false;
        item.isIndeterminate = false;
      }
      return;
    }

    const selectedCount = tableIds.filter((id) => fileIds.includes(id)).length;

    if (selectedCount === 0) {
      item.checked = false;
      item.isIndeterminate = false;
    } else if (selectedCount === tableIds.length) {
      item.checked = true;
      item.isIndeterminate = false;
    } else {
      item.checked = false;
      item.isIndeterminate = true;
    }
  });
}

// ========================
// 图片下载与删除
// ========================
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage() {
  const selected = (tab.value && tab.value.selectedRows) || [];
  if (!selected.length) {
    return ElMessage.warning("请先选择需要下载的图片");
  }

  try {
    for (const [index, item] of selected.entries()) {
      ElMessage.info(`正在下载第 ${index + 1}/${selected.length} 个文件`);
      await download(item.id, item.name);
      await sleep(500 + Math.floor(Math.random() * 500));
    }
    ElMessage.success(`共 ${selected.length} 个文件下载完成`);
  } catch (error) {
    ElMessage.error(`下载失败：${error.message || "未知错误"}`);
  }
}

async function removeList() {
  const selected = (tab.value && tab.value.selectedRows) || [];
  const ids = selected.map((item) => item.id);
  if (!ids.length) {
    return ElMessage.warning("请选择需要删除的记录");
  }

  try {
    const res = await removePic({ ids: ids.join(",") });
    if (res && res.code === 200) {
      ElMessage.success("删除成功");
      getList();
    }
  } catch (error) {
    ElMessage.error("删除失败");
  }
}

async function removeRecord(id) {
  let ids = [];
  if (id) {
    ids = [id];
  } else {
    const selected = (tab.value && tab.value.selectedRows) || [];
    ids = selected.map((item) => item.id);
  }
  if (!ids.length) return;

  try {
    const res = await remove({ ids: ids.join(",") });
    if (res && res.code === 200) {
      ElMessage.success("删除成功");
      getList();
    }
  } catch (error) {
    ElMessage.error("删除失败");
  }
}

// ========================
// 更新记录与重命名
// ========================
async function updateContent(id, name) {
  if (!id || !name) return;
  const res = await update({ id, name });
  if (res && res.code === 200) {
    ElMessage.success("更新成功");
    getList();
    return res;
  }
}

// ========================
// 地图加载
// ========================
async function mapLoading(isLoading) {
  if (!recordsStore) {
    ElMessage.warning("store 未初始化，无法加载地图");
    return;
  }

  const loadingStatus = isLoading ? 2 : 0;
  const groupIds = []; // 整组选中
  const fileIds = []; // 部分勾选

  const fileIdsMap = recordsStore.fileIds || {};

  data.value.forEach((group) => {
    const selectedFiles = fileIdsMap[group.id] || [];

    if (group.checked && !group.isIndeterminate) {
      // 整组选中
      groupIds.push(group.id);
    } else if (group.isIndeterminate) {
      // 部分选中
      fileIds.push(...selectedFiles);
    }
  });

  if (!groupIds.length && !fileIds.length) {
    ElMessage.info("没有选中的数据");
    return;
  }

  try {
    if (groupIds.length) {
      await batchLoading({ ids: groupIds.join(","), loadingStatus });
    }
    if (fileIds.length) {
      await loading(fileIds.join(","), loadingStatus);
    }

    ElMessage.success(isLoading ? "加载成功！" : "取消成功！");

    // ✅ 清空 store
    recordsStore.fileIds = {};

    // ✅ 重置左侧勾选状态
    data.value.forEach((group) => {
      group.checked = false;
      group.isIndeterminate = false;
    });

    await getPictureList();
  } catch (e) {
    ElMessage.error("地图加载失败");
    console.error(e);
  }
}

// ========================
// 生成报告 / AI分析 / 导入 / 追加文件
// ========================
// 生成报告
async function createReportFn() {
  try {
    await formRef.value.validate();
    const ids = tab.value?.selectedRows?.map((item) => item.id) || [];
    if (ids.length === 0) {
      return ElMessage.warning("请选择需要生成报告的记录");
    }
    const res = await createReport({ ...form, ids: String(ids) });
    if (res && res.code === 200) {
      ElMessage.success(res.msg);
      centerDialogVisible.value = false;
    }
  } catch (error) {
    ElMessage.error(`生成报告失败：${error.message}`);
  }
}

// AI分析
async function handleAiAnalysis() {
  if (!currentAlgorithm.value) {
    ElMessage.warning("请选择算法！");
    return;
  }
  const ids = tab.value?.selectedRows?.map((item) => item.id) || [];
  if (ids.length === 0) {
    return ElMessage.warning("请先选择需要分析的记录");
  }
  try {
    await aiFormRef.value.validate();
    const params = {
      ids: String(ids),
    };
    if (currentAlgorithm.value) {
      params.algorithmId = currentAlgorithm.value;
    }

    const res = await doAi(params);
    if (res && res.code === 200) {
      ElMessage.success(res.msg);
      centerDialogVisible3.value = false;
    }
  } catch (error) {
    ElMessage.error(`AI分析失败：${error.message}`);
  }
}

// 导入记录
async function handleImport() {
  if (importForm.identifyStatus == 1 && !currentAlgorithm.value) {
    ElMessage.warning("请选择算法！");
    return;
  }
  try {
    await importFormRef.value.validate();
    const pictureIds = (mediaUploadRef.value?.fileInfos || [])
      .map((item) => item.resId)
      .filter(Boolean);
    importForm.pictureIds = pictureIds;
    if (currentAlgorithm.value) {
      importForm.algorithmId = currentAlgorithm.value;
    }
    const res = await add(importForm);
    if (res && res.code === 200) {
      centerDialogVisible2.value = false;
      ElMessage.success("导入成功！");
      await getList();
      mediaUploadRef.value?.resetData();
    }
  } catch (error) {
    ElMessage.error(`导入失败：${error.message}`);
  }
}

// 追加文件
async function submitPush() {
  if (addForm.identifyStatus == 1 && !currentAlgorithm.value) {
    ElMessage.warning("请选择算法！");
    return;
  }
  try {
    await addFormRef.value.validate();
    const pictureIds = (pushImages.value?.fileInfos || [])
      .map((item) => item.resId)
      .filter(Boolean);
    addForm.pictureIds = pictureIds;
    if (currentAlgorithm.value) {
      addForm.algorithmId = currentAlgorithm.value;
    }
    const res = await addFiles(addForm);
    if (res && res.code === 200) {
      centerDialogVisible4.value = false;
      ElMessage.success("追加成功！");
      await getPictureList();
      pushImages.value?.resetData();
    }
  } catch (error) {
    ElMessage.error(`追加失败：${error.message}`);
  }
}

// 导入记录关闭弹窗
async function handleCloseImportDialog() {
  if (isImportUploading.value) {
    ElMessage.warning("文件上传中，请勿进行窗口外的其他操作！");
    return;
  }
  centerDialogVisible2.value = false;
}

// 追加文件关闭弹窗
async function handleClosePushDialog() {
  if (isPushUploading.value) {
    ElMessage.warning("文件上传中，请勿进行窗口外的其他操作！");
    return;
  }
  centerDialogVisible4.value = false;
}

// ========================
// 计算属性
// ========================
const isImportUploading = computed(() => {
  return (
    mediaUploadRef.value?.overallProgress > 0 &&
    mediaUploadRef.value?.overallProgress < 100
  );
});

const isPushUploading = computed(() => {
  return pushImages.value?.overallProgress > 0 && pushImages.value?.overallProgress < 100;
});

// ========================
// 窗口 resize
// ========================
function handleResize() {
  resizeFlag.value++;
}
</script>

<style lang="scss" scoped>
@use "./index.scss";
</style>
