<script setup>
import { ref, onMounted } from 'vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import DetailNavBar from "@/components/DetailNavBar";
import Empty from "@/components/Empty";
import {recordList, update} from "@/api/record/index.js";
import {ElMessage} from "element-plus";
import {useRoute} from "vue-router";
const { proxy } = getCurrentInstance();
import { useDroneStore } from '@/store/modules/droneStore.js';
const emit = defineEmits(['close','moreTask',"selectShow"]);
const taskList = ref([]);
const route = useRoute();
const currentPage = ref(1);
const taskTotal = ref(0);
const selectedTaskId = ref(null); // 记录选中的任务ID

let droneStore = null;
try {
    droneStore = useDroneStore();
} catch (err) {
    console.warn('droneStore 初始化失败：', err);
}
const handleChange = (page) => {
  if (page === currentPage.value) return;
  currentPage.value = page;
}
const getList = async () => {
    try {
        const res = await recordList({pageSize:10,pageNum:currentPage.value, projectId: route.query.projectId,loadingStatus:2 })
        if (res && res.code === 200) {
            taskList.value = res.rows;
            const allTaskStates = droneStore.getAllTaskStates;
            const updateData = [];
            taskList.value.forEach(item => {
                item.isShow = true;
                if (allTaskStates && allTaskStates.length > 0) {
                    allTaskStates.forEach(i => {
                        if (item.id === i.id) {
                            item.isShow = i.isShow;
                        }
                    });
                }
                updateData.push({ id: item.id, isShow: item.isShow });
            });
            droneStore.initTaskStates(updateData);
            taskTotal.value = Number(res.total);
            if(taskList.value.length>0){
                selectedTaskId.value = taskList.value[0].id;
                emit("selectShow",taskList.value[0].id)
            }
        }
    } catch (error) {
        ElMessage.error(`获取飞行记录失败：${error.message}`)
    }
}
const removeTask = (id,status) => {
    removeTaskById(id,status);
    // proxy.$antv.msgSuccess('取消加载成功');
  // proxy.$antv.confirm({
  //   title: '确定要删除该任务吗？',
  //   content: '删除后将无法恢复，请谨慎操作。'
  //
  // }).then(() => {
  // });
}
const removeTaskById =async (id,status) => {
    try {
        const res = await update({ id, loadingStatus:status })
        if (res && res.code === 200) {
            ElMessage.success('取消加载成功！')
            getList()
        }
        return res
    } catch (error) {
        ElMessage.error(`取消加载失败：${error.message}`)
    }
}
const selectShow = (item) =>{
    selectedTaskId.value = item.id;
    emit("selectShow",item.id)
}
const handleShowChange = (id, isShow) => {
    droneStore.updateTaskShow(id, isShow);
};
const taskClose = () => {
  emit('close')
}
onMounted(() => {
    getList();
})
defineExpose({
    getList,
    selectedTaskId,
});
</script>

<template>
  <div class="drone_list_container">
    <DetailNavBar title="飞行任务" @close="taskClose">
      <template #other>
        <div class="more_task_wrap" @click="emit('moreTask')">
          <PlusOutlined />
          <div class="more_task_text">更多任务</div>
        </div>
      </template>
    </DetailNavBar>
    <div class="task_list_container">
      <template v-if="taskList.length === 0">
        <Empty />
      </template>
      <template v-else>
        <div class="task_list_item" v-for="item in taskList" :key="item.id" @click="selectShow(item)" :class="{ 'task_list_item_selected': selectedTaskId === item.id }">
          <div class="task_item_title">
            <div class="task_item_title_text">{{ item.name }}</div>
            <img class="task_item_remove" src="@/assets/map/remove.svg" alt="" @click="removeTask(item.id,0)" />
          </div>
          <div class="task_item_time">
            <img class="task_item_time_icon" src="@/assets/map/clock.svg" alt="" />
            <div class="task_item_time_text">{{ item.createTime }}</div>
          </div>
          <div class="task_item_status">
            <div class="task_item_status_text">是否显示：</div>
              <el-switch
                      v-model="item.isShow"
                      size="small"
                      @change="handleShowChange(item.id, $event)"
              ></el-switch>
          </div>
        </div>
        <div class="task_list_pagination" v-if="taskList.length>0">
          <a-pagination @change="handleChange" v-model:current="currentPage" :total="taskTotal" />
        </div>
      </template>
    </div>

  </div>
</template>

<style scoped lang="scss">
.drone_list_container {
  padding: 16px;
  width: 400px;
  height: calc(100% - 16px - 46px - 16px - 16px);
  background: rgba(255,255,255,0.95);
  border-radius: 8px;
  .task_list_container{
    margin-top: 24px;
    width: 100%;
    height: calc(100% - 29px - 24px);
    overflow-y: auto;
    &::-webkit-scrollbar {
      display: none;
    }
    .task_list_item_selected{
      border-color: #317af1 !important;
      background-color: rgba(55, 136, 255, 0.05);
      box-shadow: 0 2px 8px rgba(55, 136, 255, 0.15);
    }
    .task_list_item{
      &:last-child{
        margin-bottom: 0;
      }
      margin-bottom: 16px;
      padding: 16px;
      width: 100%;
      height: 127px;
      background: #FFFFFF;
      border-radius: 4px;
      border: 1px solid #EBEBEB;
      .task_item_title{
        display: flex;
        justify-content: space-between;
        align-items: center;
        .task_item_title_text{
          font-family: OPPOSans, OPPOSans;
          font-weight: bold;
          font-size: 20px;
          color: #333333;
        }
        .task_item_remove{
          width: 24px;
          height: 24px;
          cursor: pointer;
        }
      }
      .task_item_time{
        display: flex;
        align-items: center;
        margin-top: 8px;
        .task_item_time_icon{
          width: 24px;
          height: 24px;
        }
        .task_item_time_text{
          font-family: OPPOSans, OPPOSans;
          font-weight: 500;
          font-size: 14px;
          color: #666666;
          margin-left: 8px;
        }
      }
      .task_item_status{
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
        .task_item_status_text{
          font-family: OPPOSans, OPPOSans;
          font-weight: 400;
          font-size: 16px;
          color: rgba(51,51,51,0.7);
        }
      }
    }
  }
}
//更多任务
.more_task_wrap {
  margin-right: 8px;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 8px;
  height: 29px;
  background: #E9F2FF;
  color: #3788FF;
  border-radius: 4px;
  :deep(svg){
    width: 14px;
    height: 14px;
  }
  .more_task_text {
    margin-left: 8px;
    font-size: 16px;
  }
}
.task_list_pagination{
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
</style>
