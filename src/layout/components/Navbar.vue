<template>
  <div class="navbar">
    <div class="logoSty">
      <!-- 保持collapse属性传递，避免警告 -->
      <Logo :collapse="!appStore.sidebar.opened" />
      <hamburger
        id="hamburger-container"
        :is-active="appStore.sidebar.opened"
        class="hamburger-container"
        @toggleClick="toggleSideBar"
      />
    </div>

    <top-nav
      v-if="settingsStore.topNav"
      id="topmenu-container"
      class="topmenu-container"
    />

    <div class="right-menu">
      <el-dropdown
        @command="handleCommand"
        class="avatar-container right-menu-item hover-effect"
        trigger="hover"
      >
        <div class="avatar-wrapper">
          <img :src="userStore.avatar" class="user-avatar" />
          <span class="user-nickname"> {{ userStore.nickName }} </span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <router-link to="/user/profile">
              <el-dropdown-item>个人中心</el-dropdown-item>
            </router-link>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <div
        class="right-menu-item hover-effect setting moreIcon"
        @click="setLayout"
        v-if="settingsStore.showSettings"
      >
        <svg-icon icon-class="more-up" />
      </div>

      <el-dropdown
        @command="handleCommand"
        class="avatar-container right-menu-item hover-effect"
        trigger="hover"
      >
        <div class="close">
          <img src="@/assets/icons/svg/shotdown.svg" alt="退出系统图标" />
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="logout">
              <span>退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { ElMessageBox } from "element-plus";
import TopNav from "@/components/TopNav";
import Hamburger from "@/components/Hamburger";
import useAppStore from "@/store/modules/app";
import useUserStore from "@/store/modules/user";
import useSettingsStore from "@/store/modules/settings";
import Logo from "./Sidebar/Logo.vue";

const appStore = useAppStore();
const userStore = useUserStore();
const settingsStore = useSettingsStore();

function toggleSideBar() {
  appStore.toggleSideBar();
}

function handleCommand(command) {
  switch (command) {
    case "logout":
      logout();
      break;
    default:
      break;
  }
}

function logout() {
  ElMessageBox.confirm("确定注销并退出系统吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      userStore.logOut().then(() => {
        location.href = "/index";
      });
    })
    .catch(() => {});
}

const emits = defineEmits(["setLayout"]);
function setLayout() {
  emits("setLayout");
}
</script>

<style lang="scss" scoped>
.logoSty {
  display: flex;
  align-items: center;
}

.navbar {
  height: 50px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--sidebar-bg);
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  color: #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .hamburger-container {
    line-height: 46px;
    height: 100%;
    cursor: pointer;
    transition: background 0.3s;
    padding: 0 12px; /* 增加按钮点击区域 */

    &:hover {
      background: rgba(0, 0, 0, 0.025);
    }
  }

  .topmenu-container {
    position: absolute;
    left: 50px;
  }

  .right-menu {
    display: flex;
    align-items: center;

    .right-menu-item {
      display: inline-block;
      padding: 0 8px;
      height: 100%;
      font-size: 18px;
      color: #e0e0e0;
      vertical-align: text-bottom;

      &.hover-effect {
        cursor: pointer;
        transition: background 0.3s;

        &:hover {
          background: rgba(0, 0, 0, 0.025);
        }
      }
    }

    .avatar-container {
      margin-right: 0px;
      padding-right: 0px;

      .avatar-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;

        .user-avatar {
          cursor: pointer;
          width: 30px;
          height: 30px;
          border-radius: 50%;
        }

        .user-nickname {
          color: #e0e0e0;
          margin-left: 6px;
          font-size: 14px;
        }
      }
    }

    .moreIcon {
      margin-left: 10px;
    }
    .close {
      width: 40px;
      margin-right: 10px;
      cursor: pointer;

      img {
        width: 50%;
        margin: 0 auto;
      }
    }
  }
}
</style>
