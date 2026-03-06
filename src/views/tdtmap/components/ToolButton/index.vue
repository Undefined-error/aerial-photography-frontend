<script setup>
import { ZoomInOutlined,ZoomOutOutlined } from '@ant-design/icons-vue';
import { ref, toRefs,computed,watch} from 'vue';
import stack from '@/assets/map/stack.svg'
import stack_active from '@/assets/map/stack_active.svg'
const props = defineProps({
  isShowStack:{
    type:Boolean,
    default:false
  },
})
watch(() => props.isShowStack, (newVal) => {
  currentStack.value = newVal
})
const emit = defineEmits(['stackShow','zoomIn','zoomOut'])

const { isShowStack } = toRefs(props)

const currentStack = ref(isShowStack.value)

const handleStack = () => {
  currentStack.value = !currentStack.value
  emit('stackShow',currentStack.value)
}

const stackIcon = computed(() => {
  return  currentStack.value ? stack_active:stack
})
const isActive = computed(() => {
  return currentStack.value
})
</script>

<template>
  <div class="ToolButton_wrap">
    <div :class="{stack_title_active:isActive}" class="stack_title" @click="handleStack">
      <img :src="stackIcon" alt="">
      <span>图层显示</span>
    </div>
    <div class="zoom_in_btn" @click="emit('zoomIn')">
      <ZoomInOutlined :style="{color:'#6b6b6b'}" />
    </div>
    <div class="zoom_in_btn" @click="emit('zoomOut')">
      <ZoomOutOutlined  :style="{color:'#6b6b6b'}"  />
    </div>
  </div>
</template>

<style scoped lang="scss">
.ToolButton_wrap{
  display: flex;
  align-items: center;
  .stack_title{
    display: flex;
    align-items: center;
    background-color: #fff;
    font-family: OPPOSans, OPPOSans;
    font-weight: 400;
    font-size: 18px;
    color: #333333;
    padding: 11px 16px;
    border-radius: 4px 4px 4px 4px;
    cursor: pointer;
    user-select: none;
    img{
      margin-right: 8px;
      width: 24px;
      height: 24px;
    }
  }
  .stack_title_active{
    background-color: #037CFC;
    color: #fff;
  }
  .zoom_in_btn{
    margin-left: 16px;
    width: 46px;
    height: 46px;
    background: #FFFFFF;
    border-radius: 4px;
    border: 1px solid #EBEBEB;
    display: flex;
    justify-content: center;
    align-items: center;
    user-select: none;
    :deep(svg){
      width: 24px;
      height: 24px;
      cursor: pointer;
    }
  }
}
</style>