<template>
  <div class="app-container">
    <!-- 隐藏的文件输入框，用于选择 Logo 文件 -->
    <input
      type="file"
      ref="fileInput"
      @change="handleFileChange"
      accept="image/*"
      style="display: none"
    />

    <!-- 编辑信息对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="`编辑 ${editLabel}`"
      width="400px"
      destroy-on-close
    >
      <!-- 表单内容 -->
      <el-form label-position="top">
        <el-form-item :label="editLabel">
          <el-input
            v-model="editValue"
            :type="editType === 'adminPwd' ? 'password' : 'text'"
            :placeholder="`请输入新的${editLabel}`"
            autocomplete="off"
          />
        </el-form-item>
      </el-form>

      <!-- 底部按钮 -->
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="submitEdit"
            :loading="isSaving"
            :disabled="!editValue"
          >
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 主内容容器 -->
    <div class="info-view-container">
      <!-- 系统信息 -->
      <section class="section-block">
        <h2 class="section-title">系统信息</h2>

        <div class="system-header">
          <div class="main-info">
            <div class="logo-group">
              <el-avatar
                class="logo-placeholder"
                fit="cover"
                v-if="enterDetailObj.logo"
                :src="enterDetailObj.logo"
                size="small"
              />
              <el-avatar class="logo-placeholder logo-inner" size="small" v-else>
                {{ getDefaultAvatarText() }}
              </el-avatar>

              <div class="change-logo-link">
                <el-icon class="edit-icon-blue"><Edit /></el-icon>
                <a href="javascript:void(0);" @click="handleLogoChange">更换Logo</a>
              </div>
            </div>

            <div class="title-block">
              <h1 class="company-name">
                {{ enterDetailObj.enterpriseName }}
                <el-icon class="edit-icon-blue" @click="handleEdit('name')"
                  ><Edit />
                </el-icon>
              </h1>
              <p class="company-id">
                ID:<span class="sizeColor">{{ enterDetailObj.id }}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 人员信息 -->
      <section class="section-block">
        <h2 class="section-title">人员信息</h2>

        <div class="info-list">
          <div class="info-item">
            <span class="info-label">企业ID:</span>
            <span class="info-value">{{ enterDetailObj.id }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">创建人:</span>
            <span class="info-value">{{ enterDetailObj.createBy }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">创建时间:</span>
            <span class="info-value">{{ enterDetailObj.createTime }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">变更人:</span>
            <span class="info-value">{{ enterDetailObj.updateBy }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">变更时间:</span>
            <span class="info-value">{{ enterDetailObj.updateTime }}</span>
          </div>
        </div>
      </section>

      <!-- 平台信息 -->
      <section class="section-block">
        <h2 class="section-title">平台信息</h2>

        <div class="info-list">
          <div class="info-item">
            <span class="info-label">平台名称:</span>
            <div class="info-editable-value" @click="handleEdit('platformName')">
              <span>{{ enterDetailObj.platformName }}</span>
              <el-icon class="edit-icon-blue"><Edit /></el-icon>
            </div>
          </div>
          <div class="info-item">
            <span class="info-label">管理员账号:</span>
            <div class="info-editable-value" @click="handleEdit('adminAccount')">
              <span>{{ enterDetailObj.manageUsername }}</span>
              <el-icon class="edit-icon-blue"><Edit /></el-icon>
            </div>
          </div>
          <div class="info-item">
            <span class="info-label">管理员密码:</span>
            <div class="info-editable-value" @click="handleEdit('adminPwd')">
              <span>********</span>
              <el-icon class="edit-icon-blue"><Edit /></el-icon>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { Edit } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { editEnterprise, enterDetail } from "@/api/system/enterprise.js";

// 定义emit
const emit = defineEmits(["refresh"]);

// 接收参数
const props = defineProps({
  enterParams: {
    type: Object,
    default: () => ({}),
  },
});

// 企业详情数据
const enterDetailObj = ref({});

// 编辑状态管理
const dialogVisible = ref(false);
const editType = ref(""); // name, platformName, adminAccount, adminPwd
const editLabel = ref("");
const editValue = ref("");
const isSaving = ref(false);
const fileInput = ref(null);

// 获取默认头像文本
const getDefaultAvatarText = () => {
  return enterDetailObj.value.enterpriseName
    ? enterDetailObj.value.enterpriseName.charAt(0)
    : "企";
};

// 编辑标签映射
const getEditLabel = (type) => {
  const labels = {
    name: "企业名称",
    platformName: "平台名称",
    adminAccount: "管理员账号",
    adminPwd: "管理员密码",
  };
  return labels[type] || type;
};

// 打开编辑对话框
const handleEdit = (type) => {
  editType.value = type;
  editLabel.value = getEditLabel(type);

  switch (type) {
    case "name":
      editValue.value = enterDetailObj.value.enterpriseName || "";
      break;
    case "platformName":
      editValue.value = enterDetailObj.value.platformName || "";
      break;
    case "adminAccount":
      editValue.value = enterDetailObj.value.manageUsername || "";
      break;
    case "adminPwd":
      editValue.value = ""; // 密码不回显
      break;
    default:
      return;
  }

  dialogVisible.value = true;
};

// 提交编辑
const submitEdit = async () => {
  if (!editValue.value || isSaving.value) return;

  isSaving.value = true;

  // 准备提交数据
  const payload = {
    id: props.enterParams.id,
  };

  let fieldKey = "";
  switch (editType.value) {
    case "name":
      fieldKey = "enterpriseName";
      break;
    case "platformName":
      fieldKey = "platformName";
      break;
    case "adminAccount":
      fieldKey = "manageUsername";
      break;
    case "adminPwd":
      fieldKey = "managePassword";
      break;
  }
  payload[fieldKey] = editValue.value;

  try {
    const res = await editEnterprise(payload);
    if (res && res.code === 200) {
      ElMessage.success(`${editLabel.value} 更新成功!`);
      // 延迟刷新避免接口缓存问题
      setTimeout(async () => {
        await getDetail();
        // 强制响应式更新
        enterDetailObj.value = { ...enterDetailObj.value };
      }, 300);
    } else {
      ElMessage.error(res.msg || `${editLabel.value} 更新失败!`);
    }
  } catch (error) {
    console.error("编辑失败:", error);
    ElMessage.error(`编辑失败: ${error.message || "网络错误"}`);
  } finally {
    isSaving.value = false;
    dialogVisible.value = false;
  }
};

// 处理Logo更换
const handleLogoChange = () => {
  fileInput.value.click();
};

// 处理文件选择
const handleFileChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const isConfirmed = await ElMessageBox.confirm(
    `确定要上传新 Logo 文件: ${file.name} 吗?`,
    "确认上传",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    }
  ).catch(() => false);

  if (!isConfirmed) {
    event.target.value = null;
    return;
  }

  const logoPayload = {
    id: props.enterParams.id,
    logoFile: file,
  };

  isSaving.value = true;
  try {
    const res = await editEnterprise(logoPayload);
    if (res && res.code === 200) {
      ElMessage.success("Logo 更新成功!");
      // 刷新数据
      setTimeout(async () => {
        await getDetail();
        enterDetailObj.value = { ...enterDetailObj.value };
      }, 300);
    } else {
      ElMessage.error(res.msg || "Logo 更新失败!");
    }
  } catch (error) {
    console.error("Logo 上传失败:", error);
    ElMessage.error(`Logo 上传失败: ${error.message || "网络错误"}`);
  } finally {
    isSaving.value = false;
    event.target.value = null;
  }
};

// 获取详情数据
const getDetail = async () => {
  try {
    const res = await enterDetail(props.enterParams.id);
    if (res && res.code === 200) {
      // 深拷贝确保响应式生效
      enterDetailObj.value = JSON.parse(JSON.stringify(res.data || {}));
    } else {
      ElMessage.error("获取详情失败，请刷新页面重试");
    }
  } catch (error) {
    console.error("获取详情接口异常:", error);
    ElMessage.error("获取数据失败，请检查网络连接");
  }
};

// 初始化加载
onMounted(() => {
  getDetail();
});
</script>

<style scoped>
.app-container {
  padding: 20px;
  background-color: #f5f7fa;
  height: calc(100vh - 50px);
}

.info-view-container {
  height: 100%;
  padding: 30px 20px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  overflow-y: auto;
}

.section-block {
  margin-bottom: 25px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 20px;
  padding-bottom: 5px;
  border-bottom: 1px solid #ebeef5;
}

.main-info {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.logo-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.logo-placeholder {
  width: 75px;
  height: 75px;
  background-color: #409eff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-inner {
  color: #ffffff;
  font-size: 24px;
  font-weight: bold;
}

.title-block {
  flex-grow: 1;
  margin: auto 0;
}

.company-name {
  font-size: 26px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 5px 0;
  display: flex;
  align-items: center;
}

.company-id {
  font-size: 14px;
  color: #909399;
  margin-top: 18px;
}
.sizeColor{
    color: #303133;
    margin-left: 4px;
}
.change-logo-link {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.change-logo-link a {
  font-size: 12px;
  color: #409eff;
  text-decoration: none;
  cursor: pointer;
}

.info-list {
  display: flex;
  flex-direction: column;
  padding: 0 10px;
}

.info-item {
  display: flex;
  align-items: baseline;
  padding: 8px 0;
  line-height: 1.5;
  font-size: 14px;
}

.info-label {
  width: 80px;
  text-align: left;
  margin-right: 15px;
  color: #909399;
  flex-shrink: 0;
}

.info-value {
  color: #303133;
  font-weight: 500;
  flex-grow: 1;
}

.info-editable-value {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #303133;
  font-weight: 500;
  cursor: pointer;
}

.edit-icon-blue {
  cursor: pointer;
  color: #409eff;
  font-size: 14px;
}

/* 滚动条美化 */
.info-view-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.info-view-container::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background-color: #ddd;
}
.info-view-container::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>
