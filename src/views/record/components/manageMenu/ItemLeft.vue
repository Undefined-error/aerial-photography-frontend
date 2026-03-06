<template>
  <div class="leftBox">
    <div class="leftBox_head">
      <!-- 绑定计算属性checked，处理半选状态 -->
      <el-checkbox
        v-model="data.checked"
        :indeterminate="data.isIndeterminate"
        @change="handleCheckChange"
        size="large"
      />

      <template v-if="isEditing">
        <el-input
          v-model="newName"
          size="small"
          @keyup.enter="confirmRename"
          ref="renameInput"
          class="rename-input"
        />
        <span class="fixTips">回车保存</span>
      </template>

      <span v-else class="leftBox_head_title">{{ props.data.name }}</span>
    </div>

    <div class="leftBox_footer">
      <div class="leftBox_footer_left">
        <el-icon class="icon">
          <Clock />
        </el-icon>
        <span>{{ props.data.createTime }}</span>
      </div>

      <div class="leftBox_footer_right">
        <el-dropdown trigger="click">
          <span>
            <img src="@/assets/icons/svg/record_left_more.svg" alt="更多" />
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="Edit" @click="toggleRename">
                {{ isEditing ? "取消" : "重命名" }}
              </el-dropdown-item>
              <el-dropdown-item :icon="Delete" @click="removeItem">
                删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { Clock, Edit, Delete } from "@element-plus/icons-vue";

// 状态管理导入
import { useRecords } from "@/store/modules/records";

// Props定义
const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({
      id: "",
      name: "",
      createTime: "",
      checked: false,
    }),
  },
  tableData: {
    type: Array,
    required: true,
    default: () => [],
  },
  removeRecord: {
    type: Function,
    required: true,
  },
  updateContent: {
    type: Function,
    required: true,
  },
});

// 事件发射定义
const emit = defineEmits(["update:checked", "select-record"]);

// 状态管理实例初始化
let recordsStore = null;
try {
  recordsStore = useRecords();
} catch (err) {
  console.warn("useRecords 初始化失败：", err);
}

// 处理复选框改变事件
function handleCheckChange(val) {
  emit("update:checked", props.data, val);
}

// 编辑重命名相关
const isEditing = ref(false);
const newName = ref(props.data.name);

// 监听数据名称变化，同步到编辑框
watch(
  () => props.data.name,
  (val) => {
    if (!isEditing.value) {
      newName.value = val;
    }
  }
);

const renameInput = ref(null);

// 切换重命名状态
function toggleRename() {
  if (isEditing.value) {
    // 取消编辑
    newName.value = props.data.name;
    isEditing.value = false;
  } else {
    // 进入编辑
    isEditing.value = true;
    newName.value = props.data.name;
    nextTick(() => {
      const input = renameInput.value;
      if (input?.focus) {
        try {
          input.focus();
        } catch {
          const el = input.$el?.querySelector("input");
          if (el?.focus) el.focus();
        }
      }
    });
  }
}

// 确认重命名
async function confirmRename() {
  const trimmed = newName.value.trim();
  if (!trimmed) {
    ElMessage.warning("名称不能为空");
    return;
  }

  if (trimmed === props.data.name) {
    isEditing.value = false;
    return;
  }

  try {
    const res = await props.updateContent(props.data.id, trimmed);
    if (res?.code === 200) {
      isEditing.value = false;
    } else {
      ElMessage.error("重命名失败，请重试");
    }
  } catch (err) {
    console.error("重命名失败", err);
    ElMessage.error("重命名失败，请重试");
  }
}

// 删除条目
function removeItem() {
  props.removeRecord(props.data.id);
}
</script>

<style lang="scss" scoped>
@use "./index.scss";
</style>
