import request from '@/utils/request'

// 查询报告列表
export function listReport(query) {
  return request({
    url: '/report/list',
    method: 'get',
    params: query
  })
}




// 下载报告
export function downloadReport(reportId) {
  return request({
    url: '/report/download/' +reportId,
    method: 'get',
    responseType: 'blob'
  })
}

// 删除报告
export function delReport(ids) {
  return request({
    url: '/report/remove',
    method: 'get',
    params:{ids:ids}
  })
}


