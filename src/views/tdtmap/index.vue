<script setup>
import ToolButton from './components/ToolButton'
import DroneList from './components/DroneList'
import ImageDetail from './components/ImageDetail'
import MoreTask from './components/MoreTask'
import CesiumView from './components/CesiumViewer'
import { ref, computed } from 'vue';
import { getFileModelLink } from "@/utils/index.js";
import { listByRecordId } from "@/api/record/index.js";
import { useDroneStore } from '@/store/modules/droneStore.js';
import { ElMessage } from "element-plus";
const isShowStack = ref(false);
const isShowImage = ref(false);
const isShowMoreTask = ref(false);
const viewerRef = ref(null);
const recordId = ref(null);
const imgList = ref([])
const droneListRef = ref(null);
let droneStore = null;
try {
  droneStore = useDroneStore();
} catch (err) {
  console.warn('droneStore 初始化失败：', err);
}


// 初始化坐标
const modelPosition = ref({
  lon: 113.965785722222,
  lat: 22.5904353055556,
  height: 240
});

const handleStackShow = (val) => {
  isShowStack.value = val;
}
const handleImageShow = (val) => {
  isShowImage.value = val;
}
const handleZoomIn = () => {
  viewerRef.value?.zoomIn();
}
const handleZoomOut = () => {
  viewerRef.value?.zoomOut();
}
const refreshData = () => {
  droneListRef.value?.getList();
};

// const loadModel = () => {
//   const route = useRoute();
//   // console.log(route);

//   // const testUrl = `${import.meta.env.VITE_API_URL}:${import.meta.env.VITE_API_PORT}` + getFileModelLink(route.query.key, route.query.originName)
//   const testUrl = "/models/3dtitle/tileset.json"
//   // const testUrl = "/models/hgd/tileset.json"
//   viewerRef.value?.loadModelOrTileset(testUrl)
//   // viewerRef.value?.loadModel(testUrl, modelPosition.value.lon, modelPosition.value.lat, 200);
//   // viewerRef.value?.loadModel(testUrl, modelPosition.value.lon, modelPosition.value.lat, 200);
// }
const selectShow = (id) => {
  recordId.value = id;
  getPicList();
  isShowImage.value = true

}
const getPicList = async (targetImageId = null) => {
  try {
    const res = await listByRecordId({
      recordId: recordId.value,
      loadingStatus: 2
    });
    if (res && res.code === 200) {
      let list = res.data || [];

      // 如果有目标图片ID，将匹配的图片移至第一个位置
      if (targetImageId) {
        const targetIndex = list.findIndex(item => item.id === targetImageId);
        if (targetIndex > -1) {
          // 提取目标元素并重新排序
          const targetItem = list.splice(targetIndex, 1)[0];
          list.unshift(targetItem); // 插入到数组首位
        }
      }

      imgList.value = list;
    }
  } catch (error) {
    ElMessage.error(`获取图片列表失败`);
  }
};
// onMounted(() => {
//   loadModel();
// })
onUnmounted(() => {
  droneStore.clearStates();
});
watch(
  () => viewerRef.value?.currentClickData,
  (newVal, oldVal) => {
    if (newVal) {

      if (newVal && newVal !== oldVal && newVal.recordId) {
        recordId.value = newVal.recordId;
        if (droneListRef.value && droneListRef.value.selectedTaskId) {
          droneListRef.value.selectedTaskId = recordId.value;
        }
        getPicList(newVal.id);
        isShowImage.value = true;
      }

    }
  },
  { deep: true }
);

</script>

<template>
  <div class="map_container">
    <ToolButton class="ToolButton" :isShowStack="isShowStack" @stack-show="handleStackShow" @zoomIn="handleZoomIn"
      @zoomOut="handleZoomOut" />
    <DroneList ref="droneListRef" class="absolute_left" v-if="isShowStack" @close="handleStackShow(false)"
      @more-task="isShowMoreTask = true" @select-show="selectShow" />
    <ImageDetail class="absolute_right" v-if="isShowImage" @close="handleImageShow(false)" :list="imgList"
      :record-id="recordId" />
    <MoreTask v-if="isShowMoreTask" v-model:open="isShowMoreTask" @load-to-map="refreshData" />
    <CesiumView ref="viewerRef" :init-position="modelPosition" :taskList="droneStore.getAllTaskStates" />
    <!--    <BabylonScene />-->
  </div>
</template>

<style scoped lang="scss">
.map_container {
  position: relative;
  width: 100%;
  height: 100%;

  .ToolButton {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 100;
  }

  .absolute_left {
    position: absolute;
    top: calc(46px + 16px + 16px);
    left: 16px;
    z-index: 100;
  }

  .absolute_right {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 100;
  }
}
</style>
