import { defineStore } from 'pinia';

export const useDroneStore = defineStore('drone', {
    state: () => ({
        taskStates: []
    }),

    actions: {
        initTaskStates(states) {
            this.taskStates = states;
        },

        updateTaskShow(id, isShow) {
            const task = this.taskStates.find(item => item.id === id);
            if (task) {
                task.isShow = isShow;
            }
        },

        clearStates() {
            this.taskStates = [];
        }
    },

    getters: {
        getTaskShow: (state) => (id) => {
            const task = state.taskStates.find(item => item.id === id);
            return task ? task.isShow : true;
        },

        getAllTaskStates: (state) => {
            return [...state.taskStates];
        }
    }
});

