<template>
  <div class="app-container">
    <!-- 查询表单 -->
    <el-form :model="params" ref="queryRef" :inline="true" v-show="true">
      <el-form-item label="算法名称" prop="algorithmName">
        <el-input
          v-model="params.algorithmName"
          placeholder="请输入算法名称"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="启用状态" prop="enableStatus">
        <el-select
          v-model="params.enableStatus"
          placeholder="请选择"
          clearable
          style="width: 120px"
        >
          <el-option label="启用" :value="1" />
          <el-option label="禁用" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

     <!-- 操作按钮区 -->
     <div class="handle-btn" style="margin-bottom: 15px">
      <el-button type="primary" icon="Plus" @click="handleAdd">新增</el-button>
      <el-button
        type="danger"
        icon="Delete"
        @click="handleBatchDelete"
        :disabled="selectedIds.length === 0"
      >
        批量删除
      </el-button>
    </div>

    <!-- 数据表格 -->
    <el-table
      v-loading="loading"
      :data="algorithmList"
      @selection-change="handleSelectionChange"
    >
      <!-- 复选框列 -->
      <el-table-column type="selection" width="55" align="center" />

      <el-table-column label="算法ID" prop="id" align="center" />

      <el-table-column
        label="算法名称"
        prop="algorithmName"
        :show-overflow-tooltip="true"
      />

      <el-table-column label="模型路径" prop="path" :show-overflow-tooltip="true" />

      <el-table-column label="创建时间" prop="createTime" align="center" />

      <el-table-column label="启用状态" align="center" prop="enableStatus" width="100">
        <template #default="{ row }">
          <el-switch
            :model-value="row.enableStatus"
            :active-value="1"
            :inactive-value="0"
            disabled
          />
        </template>
      </el-table-column>

      <el-table-column
        label="操作"
        align="center"
        width="180"
        class-name="small-padding fixed-width"
      >
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)"
            >修改</el-button
          >
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="params.pageNum"
      v-model:limit="params.pageSize"
      @pagination="getList"
    />

    <!-- 新增/修改弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="50%"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        style="margin-top: 20px"
      >
        <el-form-item label="算法ID" prop="id" v-if="dialogType === 'edit'">
          <el-input v-model="form.id" disabled />
        </el-form-item>

        <el-form-item label="算法名称" prop="algorithmName">
          <el-input v-model="form.algorithmName" placeholder="请输入算法名称" />
        </el-form-item>

        <el-form-item label="模型路径" prop="path">
          <el-input v-model="form.path" placeholder="请输入模型路径" />
        </el-form-item>

        <el-form-item label="启用状态" prop="enableStatus">
          <el-select v-model="form.enableStatus" placeholder="请选择启用状态">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { list, add, edit, remove } from "@/api/system/algorithm.js"; // 导入接口
import Pagination from "@/components/Pagination";

// 查询参数
const params = reactive({
  pageSize: 10,
  pageNum: 1,
  algorithmName: "",
  enableStatus: undefined,
});

// 表格数据
const algorithmList = ref([]);
const total = ref(0);
const loading = ref(true);
const queryRef = ref(null);

// 选中的ID集合（用于批量删除）
const selectedIds = ref([]);

// 弹窗相关变量
const dialogVisible = ref(false);
const dialogTitle = ref("");
const dialogType = ref(""); // add:新增, edit:编辑
const formRef = ref(null);
const form = reactive({
  id: "",
  algorithmName: "",
  path: "",
  enableStatus: 1,
});

// 表单验证规则
const rules = reactive({
  algorithmName: [{ required: true, message: "请输入算法名称", trigger: "blur" }],
  path: [{ required: true, message: "请输入模型路径", trigger: "blur" }],
  enableStatus: [{ required: true, message: "请选择启用状态", trigger: "change" }],
});

// 获取列表数据
const getList = async () => {
  loading.value = true;
  try {
    const res = await list(params);
    if (res.code === 200) {
      algorithmList.value = res.rows || [];
      total.value = Number(res.total) || 0;
    } else {
      algorithmList.value = [];
      total.value = 0;
      ElMessage.error(res.msg || "获取数据失败");
    }
  } catch (error) {
    algorithmList.value = [];
    total.value = 0;
    ElMessage.error("获取数据失败");
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleQuery = () => {
  params.pageNum = 1;
  getList();
};

// 重置搜索条件
const resetQuery = () => {
  if (queryRef.value) {
    queryRef.value.resetFields();
  }
  params.pageNum = 1;
  params.algorithmName = "";
  params.enableStatus = undefined;
  getList();
};

// 处理复选框选择变化
const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map((item) => item.id);
};

// 打开新增弹窗
const handleAdd = () => {
  dialogType.value = "add";
  dialogTitle.value = "新增算法";
  // 重置表单
  if (formRef.value) {
    formRef.value.resetFields();
  }
  // 重置表单数据
  form.id = "";
  form.algorithmName = "";
  form.path = "";
  form.enableStatus = 1;
  dialogVisible.value = true;
};

// 打开修改弹窗并回显数据
const handleUpdate = (row) => {
  dialogType.value = "edit";
  dialogTitle.value = "修改算法";
  // 重置表单
  if (formRef.value) {
    formRef.value.resetFields();
  }
  // 回显数据
  form.id = row.id;
  form.algorithmName = row.algorithmName;
  form.path = row.path;
  form.enableStatus = row.enableStatus;
  dialogVisible.value = true;
};

// 提交表单（新增或修改）
const handleSubmit = async () => {
  // 表单验证
  if (!formRef.value) return;

  try {
    await formRef.value.validate();

    if (dialogType.value === "add") {
      // 新增操作
      const res = await add(form);
      if (res.code === 200) {
        ElMessage.success("新增成功");
        dialogVisible.value = false;
        getList();
      } else {
        ElMessage.error(res.msg || "新增失败");
      }
    } else {
      // 修改操作
      const res = await edit(form);
      if (res.code === 200) {
        ElMessage.success("修改成功");
        dialogVisible.value = false;
        getList();
      } else {
        ElMessage.error(res.msg || "修改失败");
      }
    }
  } catch (error) {
    // 验证失败不做处理
    return;
  }
};

// 单个删除
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除算法"${row.algorithmName}"吗？`, "确认删除", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      // 传递逗号分隔的ID字符串
      const res = await remove([row.id].join(','));
      if (res.code === 200) {
        ElMessage.success("删除成功");
        getList();
      } else {
        ElMessage.error(res.msg || "删除失败");
      }
    })
    .catch(() => {
      // 取消删除
    });
};

// 批量删除
const handleBatchDelete = () => {
  ElMessageBox.confirm(
    `确定要删除选中的${selectedIds.value.length}条数据吗？`,
    "确认删除",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    }
  )
    .then(async () => {
      // 传递逗号分隔的ID字符串
      const res = await remove(selectedIds.value.join(','));
      if (res.code === 200) {
        ElMessage.success("删除成功");
        getList();
      } else {
        ElMessage.error(res.msg || "删除失败");
      }
    })
    .catch(() => {
      // 取消删除
    });
};

// 页面加载时获取数据
onMounted(() => {
  getList();
});
</script>

<style scoped>
.handle-btn {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
}
</style>
