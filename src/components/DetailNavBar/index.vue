<script setup>
import { CloseOutlined } from '@ant-design/icons-vue'
const props = defineProps({
  title:{
    type: String,
    default: ''
  }
})
const emit = defineEmits(['close'])
const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div class="detail_navbar_container">
    <div class="detail_navbar_title">{{props.title}}</div>
    <div class="detail_navbar_right">
      <slot name="other" />
      <CloseOutlined class="detail_navbar_close" @click="handleClose" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "./index.scss";
</style>