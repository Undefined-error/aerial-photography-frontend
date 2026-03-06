<template>
    <div class="detailEnter-management-container">
        <div class="nav_header_container">
            <div class="nav_left">
                <img src="@/assets/icons/svg/back.svg" class="back_img" @click="goBack"/>
                <div class="project_title">{{ projectName }}</div>
            </div>
            <div class="tab-container">
                <div
                    class="tab-item"
                    :class="{ tab_default: activeTab !== '1', tab_active: activeTab === '1' }"
                    @click="activeTab = '1'"
                >
                    地图
                </div>
                <div
                    class="tab-item"
                    :class="{ tab_default: activeTab !== '2', tab_active: activeTab === '2' }"
                    @click="activeTab = '2'"
                >
                    记录
                </div>
                <div
                    class="tab-item"
                    :class="{ tab_default: activeTab !== '3', tab_active: activeTab === '3' }"
                    @click="activeTab = '3'"
                >
                    报告
                </div>
            </div>
        </div>
        <div class="content_container">
         <Report v-if="activeTab === '3'"  :project-id="projectId" />
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter  } from 'vue-router'
import Report from '@/views/project/report';
const router = useRouter()
const route = useRoute()


const activeTab = ref("3")


const projectId = route.query.projectId
const projectName = route.query.name
const goBack = () => {
    router.go(-1)
}

onMounted(() => {
    console.log("页面加载完成");
});
</script>

<style scoped lang="scss">
.detailEnter-management-container {
    height: 100vh;

    .nav_left {
        display: flex;
        position: absolute;
        left: 16px;
        top: 16px;
    }

    .nav_header_container {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 64px;
        background: rgba(255,255,255,0.95);


        .tab-container {
            display: flex;
        }


        .tab-item {
            cursor: pointer;
            transition: all 0.2s;
        }
    }

    .back_img {
        width: 32px;
        height: 32px;
    }

    .project_title {
        font-weight: bold;
        font-size: 20px;
        color: #333333;
        margin-left: 16px;
    }


    .tab_default {
        width: 109px;
        height: 40px;
        background: #F5F6FA;
        font-weight: 400;
        font-size: 16px;
        color: #333333;
        line-height: 40px;
        text-align: center;
        border: 1px solid #EBEBEB;
    }

    .tab_active {
        width: 109px;
        height: 40px;
        background: #037CFC;
        font-weight: 400;
        font-size: 16px;
        color: #FFFFFF;
        line-height: 40px;
        text-align: center;
    }
    .content_container{
        min-height: calc(100% - 64px);
        background-color: #ECF2FC;
    }
}
</style>
