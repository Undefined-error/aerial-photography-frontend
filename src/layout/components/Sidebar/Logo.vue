<template>
  <div class="sidebar-logo-container">
    <router-link class="sidebar-logo-link" to="/">
      <img
        v-if="userStore.enterpriseInfo.logo"
        :src="userStore.enterpriseInfo.logo"
        class="sidebar-logo"
        alt="系统Logo"
      />
      <span v-else class="sidebar-logo-placeholder">L</span>

      <h1 class="sidebar-title">{{ userStore.enterpriseInfo.platformName || title }}</h1>
    </router-link>
  </div>
</template>

<script setup>
import { computed } from "vue";
import useSettingsStore from "@/store/modules/settings";
import { variables } from "@/assets/js/variables.js";
import useUserStore from "@/store/modules/user";

const userStore = useUserStore();

// 移除未使用的 collapse 属性接收

// 系统标题（确保环境变量有值，若无则手动指定）
const title = import.meta.env.VITE_APP_TITLE || "管理系统";
const settingsStore = useSettingsStore();
const sideTheme = computed(() => settingsStore.sideTheme);

// 获取Logo背景色
const getLogoBackground = computed(() => {
  // 使用 CSS 变量以兼容深色模式
  if (settingsStore.isDark) {
    return "var(--sidebar-bg)";
  }
  return sideTheme.value === "theme-dark" ? variables.menuBg : variables.menuLightBg;
});

// 获取Logo文字颜色
const getLogoTextColor = computed(() => {
  if (settingsStore.isDark) {
    return "var(--sidebar-text)";
  }
  return sideTheme.value === "theme-dark" ? "#ffffff" : variables.menuLightText; // 浅色主题使用深色文字
});
</script>

<style lang="scss" scoped>
.sidebar-logo-container {
  position: relative;
  width: 100%;
  height: 50px; /* 固定高度，通常与顶部栏高度一致 */
  line-height: 50px;
  background: v-bind(getLogoBackground);
  overflow: hidden;
  box-sizing: border-box; /* 确保 padding 不影响总高度 */

  & .sidebar-logo-link {
    height: 100%;
    width: 100%;
    display: flex !important;
    align-items: center; /* 垂直居中 */
    padding: 0 15px; /* 侧边留白 */
    text-decoration: none;

    & .sidebar-logo {
      width: 32px;
      height: 32px;
      margin-right: 12px;
      flex-shrink: 0;
      border-radius: 4px; /* 增加轻微圆角 */
      object-fit: cover; /* 确保图片不变形 */
    }

    & .sidebar-logo-placeholder {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 32px;
      height: 32px;
      margin-right: 12px;
      flex-shrink: 0;
      background-color: #409eff; /* 默认蓝色背景 */
      color: #ffffff;
      font-size: 20px;
      font-weight: bold;
      border-radius: 4px;
    }

    & .sidebar-title {
      margin: 0;
      color: v-bind(getLogoTextColor);
      font-weight: 600;
      font-size: 18px;
      white-space: nowrap;
      overflow: hidden; /* 标题溢出时隐藏 */
      text-overflow: ellipsis; /* 溢出时显示省略号 */
      flex-grow: 1; /* 占据剩余空间 */
    }
  }
}
</style>
