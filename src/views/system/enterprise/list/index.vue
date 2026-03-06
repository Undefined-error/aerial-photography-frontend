<template>
  <div class="page-wrapper">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form size="small" class="formBox">
        <!-- <el-form-item label="企业ID" style="width: 220px;">
          <el-input v-model.trim="params.id" placeholder="请输入" />
        </el-form-item> -->
        <el-form-item label="企业名称" style="width: 220px;margin-left: 16px;">
          <el-input v-model.trim="params.enterpriseName" placeholder="请输入" />
        </el-form-item>
        <el-form-item style="margin-left: auto;">
          <el-button type="primary" @click="getList">搜索</el-button>
          <el-button @click="resetParams">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="tab_area">
      <!-- 表格标题 -->
      <div class="table-active">
        <h3 class="table-title">系统信息</h3>
        <el-button type="primary" plain size="small" @click="openDialog">+ 新建</el-button>
      </div>

      <!-- 表格 -->
      <el-table stripe :data="tableData">
        <el-table-column type="index" label="序号" align="center" min-width="40" />
        <el-table-column prop="id" label="企业ID" min-width="145" align="center" />
        <el-table-column prop="enterpriseName" label="企业名称" min-width="140" align="center" />
        <el-table-column prop="createBy" label="创建人" align="center" />
        <el-table-column prop="createTime" label="创建时间" min-width="120" align="center" />
        <el-table-column prop="updateBy" label="更新人" align="center" />
        <el-table-column prop="updateTime" label="更新时间" min-width="120" align="center" />
        <el-table-column label="操作" align="center">
          <template #default="scope">
            <el-button type="text" size="small" @click="goToDetail(scope.row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container" v-if="total > 10">
        <el-pagination v-model:current-page="params.pageNum" background layout="total, prev, pager, next" :total="total"
          @current-change="handleCurrentChange" />
      </div>
    </div>

    <!-- 新建企业弹窗 -->
    <el-dialog v-model="dialogVisible" title="创建企业" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="企业名称" required>
          <el-input v-model="form.enterpriseName" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="平台 logo">
          <ImageUpload ref="imgUpload" :data="form" customFileName="logoFile" action="/system/enterprise/add"
            :autoUpload="false" :limit="1" :onComplete="onComplete" />
        </el-form-item>
        <el-form-item label="平台名称" required>
          <el-input v-model="form.platformName" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="管理员账号" required>
          <el-input v-model="form.manageUsername" placeholder="请输入" />
        </el-form-item>
        <el-form-item label="管理员密码" required>
          <el-input v-model="form.managePassword" type="password" placeholder="请输入" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">立即创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { listEnter } from '@/api/system/enterprise'
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ImageUpload from "@/components/ImageUpload"
import { useRouter } from 'vue-router';
const router = useRouter();
const tableData = ref([])
const total = ref(0)
const params = ref({
  id: null,
  enterpriseName: null,
  pageSize: 10,
  pageNum: 1,
})
const imgUpload = ref(null)
const dialogVisible = ref(false)
const form = ref({
  enterpriseName: '',
  platformName: '',
  manageUsername: '',
  managePassword: '',
})
const props = defineProps({
  goTarget: {
    type: Function,
    required: true
  }
})

const goToDetail = params => props.goTarget('detail', params)

const openDialog = () => {
  form.value = {
    enterpriseName: '',
    platformName: '',
    manageUsername: '',
    managePassword: '',
  }
  dialogVisible.value = true
}

const onComplete = (e) => {
  try {
    if (e.code === 200) {
      ElMessage.success('创建成功')
      dialogVisible.value = false
      getList()
    }
  } catch (e) {
    console.error(e)
  }
}

const submitForm = async () => {
  imgUpload.value.submit()
}

const resetParams = () => {
  params.value = {
    // id: null,
    enterpriseName: null,
    pageSize: 10,
    pageNum: 1
  }
  getList()
}

const getList = async () => {
  const res = await listEnter(params.value)
  if (res && res.code == 200) {
    tableData.value = res.rows
    total.value = Number(res.total)
  }
}
const handleCurrentChange = (e) => {
  params.value.pageNum = e
  getList()
}

onMounted(async () => {
  await getList()
})
</script>

<style lang="scss" scoped>
.page-wrapper {
  padding: 20px;
  background: #f3f3f4;
  height: calc(100vh - 50px);
}

.search-bar {
  background-color: #fff;
  padding: 10px;
  border-radius: 8px;

  .formBox {
    display: flex;
    align-items: center;
    margin-bottom: 0;

    .el-form-item {
      margin-bottom: 0 !important;
    }
  }
}

.tab_area {
  background-color: #fff;
  padding: 10px;
  border-radius: 8px;
  margin-top: 14px;

  .table-active {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .table-title {
      font-size: 16px;
      font-weight: bold;
      margin-top: 5px;
      margin-bottom: 15px;
    }
  }

  .pagination-container {
    display: flex;
    justify-content: center;
    align-items: center;
  }
}

.avatar-uploader {
  .avatar {
    width: 80px;
    height: 80px;
    display: block;
    border-radius: 6px;
  }

  .avatar-uploader-icon {
    font-size: 28px;
    color: #8c939d;
    width: 80px;
    height: 80px;
    line-height: 80px;
    text-align: center;
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
    cursor: pointer;
  }
}
</style>
