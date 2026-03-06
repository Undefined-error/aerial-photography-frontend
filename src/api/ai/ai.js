import request from '@/utils/request'



// 审核通过ai结果
export function aiApprove(projectId) {
  return request({
    url: '/data/picture/approved/' + projectId,
    method: 'get'
  })
}

export function manualReview(data) {
  return request({
    url: '/data/box/review',
    method: 'post',
    data:data
  })
}
