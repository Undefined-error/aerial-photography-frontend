import request from '@/utils/request'

// 查询企业列表
export function listEnter(params) {
  return request({
    url: '/system/enterprise/list',
    method: 'get',
    params
  })
}

// 查询企业详情
export function enterDetail(id) {
  return request({
    url: `/system/enterprise/${id}`,
    method: 'get',
  })
}

/**
 * 编辑企业信息 (FormData格式优化，确保后端正确识别)
 * @param {Object} data - 企业信息对象
 * @param {string} data.id - 企业ID (必填)
 * @param {File} [data.logo] - Logo文件 (根据后端实际字段名调整)
 * @param {string} [data.name] - 企业名称等其他普通字段
 */
export function editEnterprise(data) {
  const formData = new FormData()

  // 处理普通字段和文件字段，确保FormData格式正确
  Object.entries(data).forEach(([key, value]) => {
    // 跳过null/undefined值，避免后端解析异常
    if (value === null || value === undefined) return

    // 处理文件类型（支持单文件）
    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value, value.name) // 显式指定文件名
    }
    // 处理数组类型（如果有批量数据）
    else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        formData.append(`${key}[${index}]`, item)
      })
    }
    // 处理普通字段（转换为字符串，避免类型问题）
    else {
      formData.append(key, String(value))
    }
  })

  // 调试：检查FormData内容（生产环境可删除）
  console.group("FormData参数检查")
  formData.forEach((value, key) => {
    console.log(`${key}:`, value instanceof File ? `[文件: ${value.name}]` : value)
  })
  console.groupEnd()

  return request({
    url: '/system/enterprise/edit',
    method: 'post',
    data: formData,
    // 关键：避免axios默认添加Content-Type，让浏览器自动生成正确的multipart/form-data格式（包含boundary）
    headers: {
      'Content-Type': undefined
    },
    // 禁止axios对数据进行序列化（FormData需要原生传递）
    transformRequest: [data => data]
  })
}
