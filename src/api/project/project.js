import request from '@/utils/request'

// 查询项目列表
export function listProject(query) {
  return request({
    url: '/project/list',
    method: 'get',
    params: query
  })
}


// 新增项目
export function addProject(data) {
  return request({
    url: '/project/add',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
// 获取人员列表
export function getUserListExifMyself(data) {
  return request({
    url: '/project/getUserListExifMyself',
    method: 'get',
    params: data,
  })
}

// 查询项目详细
export function getProject(projectId) {
  return request({
    url: '/project/' + projectId,
    method: 'get'
  })
}

// 修改项目
export function updateProject(data) {
  return request({
    url: '/project/update',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

// 删除项目
export function delProject(ids) {
  return request({
    url: '/project/remove',
    method: 'get',
    params:{ids:ids}
  })
}


