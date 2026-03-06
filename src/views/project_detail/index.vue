<script setup>
import {LeftOutlined} from '@ant-design/icons-vue'
const props = defineProps({
  rows: {
    type: [Object,String],
    default: () => ({
      name:"前海深港现代服务业合作区"
    }),
  },
})
const menuNav = ref([
  {
    path: '/map',
    name: '地图',
    id:"map"
  },
  {
    path: '/record',
    name: '记录',
    id:"record"
  },
  {
    path: '/report',
    name: '报告',
    id:"report"
  },
])
const currentMenu = ref('map')
const router = useRouter()
const route = useRoute()
const handleBack = () => {
 router.replace('/index')
}
const handleMenu = (item) => {
  currentMenu.value = item.id
  router.push({
    path:`/detail${item.path}`,
    query: {
      ...route.query,
    }
  })
}
// 监听路由变化path 改变currentMenu
watch(() => router.currentRoute.value.path, (newVal) => {
  menuNav.value.forEach(item => {
    if (newVal === `/detail${item.path}`) {
      currentMenu.value = item.id
        props.rows.name = route.query.name
    }
  })
}, {immediate: true})
</script>

<template>
    <div class="detail_container">
      <div class="nav_header">
        <div class="nav_left" :title="rows.name" @click="handleBack">
          <div class="nav_left_icon">
            <LeftOutlined />
          </div>
          <div class="nav_header_title">{{rows.name}}</div>
        </div>
        <div class="menu_container">
          <div :class="{active:currentMenu===item.id}" class="menu_item" v-for="item in menuNav" :key="item.id" @click="handleMenu(item)">
            <div class="menu_item_title">{{ item.name }}</div>
          </div>
        </div>
      </div>
      <div class="router_container">
        <transition name="fade">
          <router-view></router-view>
        </transition>
      </div>
    </div>
</template>

<style scoped lang="scss">
.detail_container{
  width: 100%;
  height: 100vh;
  background: rgba(255,255,255,0.95);
}
.nav_header{
  position: relative;
  padding: 16px;
  width: 100%;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  .nav_left{
    display: flex;
    align-items: center;
    cursor: pointer;
    position: absolute;
    left: 16px;
    top: 16px;
    .nav_left_icon{
      margin-right: 16px;
      width: 32px;
      height: 32px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      border: 1px solid #4e95fe;
      color: #4e95fe;
      font-weight: bold;
    }
    .nav_header_title{
      font-family: OPPOSans, OPPOSans;
      font-weight: bold;
      font-size: 20px;
      color: #333333;
      min-width: 240px;
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      word-break: break-all;
    }
  }
}

.menu_container{
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin: 0 auto;
  //width: 330px;
  border: 1px solid #EBEBEB;
  border-radius: 4px;
  .menu_item{
    padding: 8px 40px;
    font-family: Source Han Sans CN, Source Han Sans CN;
    font-weight: 400;
    font-size: 16px;
    color: #333333;
    cursor: pointer;
  }
  .active{
    background: #037CFC;
    color: #FFFFFF;
    border-radius: 4px;
  }
}
.router_container{
  width: 100%;
  height: calc(100vh - 64px);
  overflow-y: auto;
}
.router_container::-webkit-scrollbar {
  display: none;
}
</style>
