import request from '@/utils/request'

/**
 *  @description: 判断文件是否存在
 *  @param {Object} params
 *  @param {String} params.fileMd5 文件md5
 *
 * */
export function hasFile(params) {
    return request({
        url: '/file/hasFile',
        method: 'get',
        params
    })
}