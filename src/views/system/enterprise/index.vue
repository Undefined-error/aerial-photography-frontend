<template>
  <div class="component-wrapper">
    <transition name="fade" mode="out-in">
      <div v-if="activeComponent" :key="activeComponentName" class="transition-component">
        <component :is="activeComponent" :goTarget="goTarget" :enterParams="enterParams" />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { shallowRef, defineAsyncComponent, markRaw } from 'vue'

// 缓存已加载的组件
const cachedComponents = shallowRef({})

// 当前显示的组件
const activeComponent = shallowRef(null)
const activeComponentName = shallowRef('')
const enterParams = shallowRef({})

// 匹配当前目录下每个子目录的 index.vue
const components = import.meta.glob('./*/index.vue')

// 动态加载组件
const loadComponent = (name) => {
  if (!cachedComponents.value[name]) {
    const path = `./${name}/index.vue`
    const loader = components[path]
    if (!loader) throw new Error(`组件 ${name} 不存在`)
    const comp = defineAsyncComponent(loader)
    cachedComponents.value[name] = markRaw(comp)
  }
  return cachedComponents.value[name]
}

// 切换目标组件
const goTarget = (name, params = {}) => {
  enterParams.value = params
  activeComponent.value = loadComponent(name)
  activeComponentName.value = name
}

// 初始化默认组件
activeComponent.value = loadComponent('list')
activeComponentName.value = 'list'
</script>

<style scoped>
.component-wrapper {
  position: relative;
}

.transition-component {
  width: 100%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
