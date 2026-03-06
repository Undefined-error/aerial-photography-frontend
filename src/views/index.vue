<template>
    <div class="full-screen-wrapper">
        <ProjectManagement />
    </div>
</template>

<script setup>

import ProjectManagement from "@/views/project/management";


const version = "3.8.9";


const goTarget = (href) => {
    window.open(href, "_blank");
};
</script>

<style scoped lang="scss">
.full-screen-wrapper {
  display: flex;
  flex-direction: column;
  // 保持原计算逻辑：减去顶部高度
  min-height: calc(100vh - 50px);
}
</style>

