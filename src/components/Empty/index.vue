<script setup>
const props = defineProps({
  description: {
    type: String,
    default: '暂无数据'
  }
})
</script>

<template>
  <div class="custom_empty_container">
    <img class="empty_icon" src="@/assets/empty/empty.svg" alt="empty">
    <div class="empty_description">{{props.description}}</div>
  </div>
</template>

<style scoped lang="scss">
.custom_empty_container{
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  .empty_description{
    margin-top: 16px;
    font-size: 16px;
    color: #999;
  }
}
</style>