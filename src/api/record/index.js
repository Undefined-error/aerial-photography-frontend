import request from '@/utils/request'

// 飞行纪录分页列表
export function recordList(params) {
    return request({
        url: '/records/list',
        method: 'get',
        params
    })
}

// 飞行纪录新增
export function add(data) {
    // 创建FormData对象
    const formData = new FormData();

    // 遍历数据对象，将属性添加到FormData中
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            formData.append(key, data[key]);
        }
    }

    return request({
        url: '/records/add',
        method: 'post',
        data: formData,
        // 通常需要设置请求头，具体根据你的request配置
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}

// 飞行记录追加文件
export function addFiles(data) {
    // 创建FormData对象
    const formData = new FormData();

    // 遍历数据对象，将属性添加到FormData中
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            formData.append(key, data[key]);
        }
    }

    return request({
        url: '/records/addFiles',
        method: 'post',
        data: formData,
        // 通常需要设置请求头，具体根据你的request配置
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}


// 飞行纪录删除
export function remove(params) {
    return request({
        url: '/records/remove',
        method: 'get',
        params
    })
}

// 资源删除
export function removePic(params) {
    return request({
        url: '/picture/remove',
        method: 'get',
        params
    })
}

// 飞行纪录修改
export function update(data) {
    return request({
        url: '/records/update',
        method: 'post',
        data
    })
}

// 媒体分页列表
export function pictureList(params) {
    return request({
        url: '/picture/list',
        method: 'get',
        params
    })
}
// 查所有图片
export function listByRecordId(params) {
    return request({
        url: 'picture/listByRecordId',
        method: 'get',
        params
    })
}

// ai识别
export function doAi(params) {
    return request({
        url: '/picture/doAi',
        method: 'get',
        params
    })
}

export function download(id, filename) {
    return request({
        url: `/picture/download?id=${id}`,
        method: 'get',
        responseType: 'blob',
    }).then((blob) => {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename || `downloaded_${id}` // 如果没传就默认一个
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
    }).catch(() => {
        console.error('文件下载失败')
    })
}

// 飞行纪录修改
export function rename(data) {
    return request({
        url: '/picture/rename',
        method: 'post',
        data
    })
}

// 生成报告
export function createReport(params) {
    return request({
        url: '/picture/createReport',
        method: 'get',
        params
    })
}

// 图片详情
export function picDetail(id) {
    return request({
        url: `/picture/${id}`,
        method: 'get',
    })
}

// 加载图片到地图上
export function loading(ids, loadingStatus) {
    return request({
        url: `/picture/loading`,
        method: 'get',
        params: {
            ids,
            loadingStatus
        }
    })
}

// 加载图片到地图上
export function getLoading(projectId) {
    return request({
        url: `/picture/loading/${projectId}`,
        method: 'get',
    })
}
//飞行记录批量加载/取消加载
export function batchLoading(params) {
    return request({
        url: '/records/batchLoading',
        method: 'get',
        params
    })
}

// 获取算法列表
export function algorithm(params) {
    return request({
        url: 'data/algorithm/listAll',
        method: 'get',
        params
    })
}

