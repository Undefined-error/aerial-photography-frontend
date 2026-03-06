import { message, Modal, notification, Spin } from 'ant-design-vue';
import { h } from 'vue';

let loadingInstance = null;

export default {
    // 消息提示
    msg(content) {
        message.info(content);
    },
    // 错误消息
    msgError(content) {
        message.error(content);
    },
    // 成功消息
    msgSuccess(content) {
        message.success(content);
    },
    // 警告消息
    msgWarning(content) {
        message.warning(content);
    },
    // 弹出提示
    alert(content) {
        Modal.info({
            title: '系统提示',
            content,
        });
    },
    // 错误提示
    alertError(content) {
        Modal.error({
            title: '系统提示',
            content,
        });
    },
    // 成功提示
    alertSuccess(content) {
        Modal.success({
            title: '系统提示',
            content,
        });
    },
    // 警告提示
    alertWarning(content) {
        Modal.warning({
            title: '系统提示',
            content,
        });
    },
    // 通知提示
    notify(content) {
        notification.info({
            message: '通知',
            description: content,
        });
    },
    // 错误通知
    notifyError(content) {
        notification.error({
            message: '错误通知',
            description: content,
        });
    },
    // 成功通知
    notifySuccess(content) {
        notification.success({
            message: '成功通知',
            description: content,
        });
    },
    // 警告通知
    notifyWarning(content) {
        notification.warning({
            message: '警告通知',
            description: content,
        });
    },
    // 确认窗体
    confirm({content,title = '系统提示',okText = '确定',cancelText = '取消'}) {
        return new Promise((resolve, reject) => {
            Modal.confirm({
                title,
                content,
                okText,
                cancelText,
                onOk() {
                    resolve();
                },
                onCancel() {
                    reject();
                }
            });
        })

    },
    // 提交内容
    prompt(content) {
        return new Promise((resolve, reject) => {
            let inputValue = '';
            const modal = Modal.confirm({
                title: '系统提示',
                content: h('div', {}, [
                    h('div', { style: 'margin-bottom: 10px' }, content),
                    h('input', {
                        class: 'ant-input',
                        style: 'width: 100%',
                        onInput: (e) => {
                            inputValue = e.target.value;
                        },
                    }),
                ]),
                okText: '确定',
                cancelText: '取消',
                onOk() {
                    resolve(inputValue);
                },
                onCancel() {
                    reject();
                },
            });
        });
    },
    // 打开遮罩层
    loading(content) {
        loadingInstance = Modal.info({
            title: null,
            content: h('div', { style: 'text-align: center' }, [
                h(Spin, { size: 'large' }),
                h('div', { style: 'margin-top: 10px' }, content),
            ]),
            maskClosable: false,
            keyboard: false,
            footer: null,
            width: 'auto',
            centered: true,
            wrapClassName: 'loading-modal',
        });
    },
    // 关闭遮罩层
    closeLoading() {
        if (loadingInstance) {
            loadingInstance.destroy();
            loadingInstance = null;
        }
    },
};