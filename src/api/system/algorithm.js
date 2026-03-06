import request from '@/utils/request'

// 查询参数列表
export function list(params) {
  return request({
    url: '/data/algorithm/list',
    method: 'get',
    params
  })
}
// 修改
export function edit(data) {
  return request({
    url: '/data/algorithm/edit',
    method: 'post',
    data
  })
}

// 新增
export function add(data) {
  return request({
    url: '/data/algorithm/add',
    method: 'post',
    data
  })
}

// 删除
export function remove(params) {
  return request({
    url: `/data/algorithm/remove?ids=${params}`,
    method: 'get',
  })
}