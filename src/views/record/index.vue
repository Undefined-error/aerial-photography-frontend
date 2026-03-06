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
const cachedComponents = shallowRef({})
const activeComponent = shallowRef(null)
const activeComponentName = shallowRef('')
const enterParams = shallowRef({})

// 加载 components 目录下的组件
const loadComponent = (name) => {
  if (!cachedComponents.value[name]) {
    const comp = defineAsyncComponent(() => import(`./components/${name}/index.vue`))
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
activeComponent.value = loadComponent('manageMenu')
activeComponentName.value = 'manageMenu'

</script>


<style scoped>
.component-wrapper {
  position: relative;
  min-height: 300px;
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
