<script setup>
const props = defineProps({
    fieldList: {
        required: true,
        type: Array,
        default: () => [

        ]
    },

    rows: {
        type: Object,
        required: true,
        default: () => ({})
    }
})
const identifyStatusMap = {
    0: '未处理',
    1: '处理中',
    2: '处理完成'
}
const typeMap = {
    0: '可见光',
    1: '热图像'
}

// 2. 字段值格式化函数（优先处理identifyStatus，其他字段保持原样）
const formatFieldValue = (row, key) => {
    const rawValue = key.split('.').reduce((obj, k) => obj?.[k], row) ?? '-';

    if (key === 'identifyStatus') {
        return identifyStatusMap[rawValue] ?? `未知状态(${rawValue})`;
    }else if(key === 'type'){
        return typeMap[rawValue]
    }
    return rawValue;
}
const getFieldValue = (row, key) => {
    return key.split('.').reduce((obj, k) => obj?.[k], row) ?? '-'
}
</script>

<template>
    <div class="field_list_wrap">

        <div class="field_list_item" v-for="(item, index) in fieldList" :key="index">
            <div class="field_list_title">{{ item.title }}</div>
            <div class="field_list_value">{{ formatFieldValue(rows, item.value) }}</div>
        </div>
    </div>
</template>

<style scoped lang="scss">

.field_list_wrap{
  width: 100%;
  user-select: none;
  .field_list_item{
    &:last-child{
      margin-bottom: 0;
    }
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    padding: 2px 12px;
    width: 100%;
    //height: 41px;
    border-radius: 4px;
    border: 1px solid #EBEBEB;
    .field_list_title{

      font-weight: 400;
        width: 30%;
      font-size: 16px;
      color: rgba(51,51,51,0.7);
    }
    .field_list_value{
      font-weight: bold;
        width: 70%;
        text-align: right;
      font-size: 20px;
      color: #333333;
        white-space: normal; /* 默认值，可省略，但明确指定更清晰 */
        word-wrap: break-word; /* 强制长单词/URL换行 */
        line-height: 1.4; /* 换行后行间距更舒适 */
        min-height: 28px; /* 避免内容过短时标题与内容对齐错位 */
    }
  }
}
</style>
