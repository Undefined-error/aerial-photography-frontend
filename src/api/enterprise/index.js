import request from '@/utils/request'

// 获取用户详细信息
export function getEnterpriseInfo() {
  return request({
    url: '/getEnterpriseInfo',
    method: 'get'
  })
}