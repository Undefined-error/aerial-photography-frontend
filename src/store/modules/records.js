import { defineStore } from 'pinia';

export const useRecords = defineStore('records', {
  state: () => ({
    fileIds: {}  // 用对象存储，每个组一个数组
  }),
  actions: {
    // 追加指定组的id，支持单个或数组
    addFileIds(ids, groupId) {
      if (!groupId) {
        console.warn('addFileIds 必须传 groupId');
        return;
      }
      const newIds = Array.isArray(ids) ? ids : [ids];
      const currentIds = this.fileIds[groupId] || [];
      this.fileIds[groupId] = Array.from(new Set([...currentIds, ...newIds]));
    },

    // 删除指定组的id，支持单个或数组
    removeFileIds(ids, groupId) {
      if (!groupId) {
        console.warn('removeFileIds 必须传 groupId');
        return;
      }
      const removeIds = Array.isArray(ids) ? ids : [ids];
      const currentIds = this.fileIds[groupId] || [];
      this.fileIds[groupId] = currentIds.filter(id => !removeIds.includes(id));
    },

    // 获取某组的所有 id，方便初始化时用
    getFileIdsByGroup(groupId) {
      return this.fileIds[groupId] || [];
    },

    // 清空所有组的id
    cleanFileIds() {
      this.fileIds = {};
    },

    // 清空指定组的 id
    cleanFileIdsByGroup(groupId) {
      if (this.fileIds[groupId]) {
        delete this.fileIds[groupId];
      }
    }
  }
});
