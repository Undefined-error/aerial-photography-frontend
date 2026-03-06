<template>
  <a-config-provider :locale="zhCN">
    <a-app>
      <router-view />
    </a-app>
  </a-config-provider>

</template>

<script setup>
import useSettingsStore from '@/store/modules/settings'
import { handleThemeStyle } from '@/utils/theme'
import zhCN from "ant-design-vue/es/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import {getEnterpriseInfo} from "@/api/enterprise"

// 设置dayjs的语言为中文
dayjs.locale("zh-cn");

onMounted(async () => {
  await getEnterpriseInfo()
  nextTick(() => {
    // 初始化主题样式
    handleThemeStyle(useSettingsStore().theme)
  })
})
</script>
