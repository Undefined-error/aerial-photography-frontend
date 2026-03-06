// src/utils/uploadUtils.js
import axios from 'axios'
import SparkMD5 from 'spark-md5'

/**
 * 分片上传工具类 (支持文件夹MD5和分片MD5)
 */
class ChunkUploader {
    /**
     * 构造函数
     * @param {Object} options 配置选项
     * @param {string} options.url 上传接口地址
     * @param {number} [options.chunkSize=5*1024*1024] 分片大小，默认5MB
     * @param {number} [options.maxRetries=3] 最大重试次数
     * @param {number} [options.concurrent=3] 并发上传数
     * @param {string} [options.baseURL] axios baseURL
     * @param {number} [options.timeout=60000] 请求超时时间
     * @param {boolean} [options.withCredentials=false] 是否携带凭证
     * @param {Object} [options.headers] 自定义请求头
     */
    constructor(options) {
        if (!options.url) {
            throw new Error('必须提供上传接口URL')
        }

        this.url = options.url
        this.chunkSize = options.chunkSize || 5 * 1024 * 1024
        this.maxRetries = options.maxRetries || 3
        this.concurrent = options.concurrent || 3
        this.file = null
        this.foldMd5 = '' // 完整文件的MD5，用于文件夹命名
        this.chunks = []
        this.uploadedChunks = []
        this.progress = 0
        this.cancelTokenSource = null
        this.onProgress = () => {}
        this.onSuccess = () => {}
        this.onError = () => {}
        this.onMd5Progress = () => {}

        this.axiosInstance = axios.create({
            baseURL: options.baseURL || '',
            timeout: options.timeout || 60000,
            withCredentials: options.withCredentials || false,
            headers: options.headers || {}
        })
    }

    /**
     * 设置上传进度回调
     * @param {Function} callback 回调函数，接收进度百分比(0-100)
     */
    setProgressCallback(callback) {
        if (typeof callback === 'function') {
            this.onProgress = callback
        }
    }

    /**
     * 设置MD5计算进度回调
     * @param {Function} callback 回调函数，接收进度百分比(0-100)
     */
    setMd5ProgressCallback(callback) {
        if (typeof callback === 'function') {
            this.onMd5Progress = callback
        }
    }

    /**
     * 设置上传成功回调
     * @param {Function} callback 回调函数，接收成功响应数据
     */
    setSuccessCallback(callback) {
        if (typeof callback === 'function') {
            this.onSuccess = callback
        }
    }

    /**
     * 设置上传错误回调
     * @param {Function} callback 回调函数，接收错误对象
     */
    setErrorCallback(callback) {
        if (typeof callback === 'function') {
            this.onError = callback
        }
    }

    /**
     * 设置文件并计算MD5
     * @param {File} file 要上传的文件
     * @param {string} [foldMd5] 可选的文件夹MD5
     * @returns {Promise}
     */
    async setFile(file, foldMd5) {
        if (!file || !(file instanceof File)) {
            throw new Error('必须提供有效的File对象')
        }

        this.file = file
        this.uploadedChunks = []
        this.progress = 0

        if (foldMd5) {
            this.foldMd5 = foldMd5
        } else {
            // 计算完整文件的MD5作为文件夹名称
            this.foldMd5 = await this._calculateFileMd5(file)
        }

        // 创建分片
        this.chunks = await this._createChunks(file)
        return Promise.resolve()
    }

    /**
     * 计算文件MD5
     * @param {File} file 文件对象
     * @returns {Promise<string>}
     * @private
     */
    _calculateFileMd5(file) {
        return new Promise((resolve, reject) => {
            const spark = new SparkMD5.ArrayBuffer()
            const fileReader = new FileReader()
            const chunkSize = 2 * 1024 * 1024 // 2MB
            let currentChunk = 0
            const chunks = Math.ceil(file.size / chunkSize)

            fileReader.onload = (e) => {
                spark.append(e.target.result)
                currentChunk++

                // 更新MD5计算进度
                this.onMd5Progress(Math.round((currentChunk / chunks) * 100))

                if (currentChunk < chunks) {
                    loadNext()
                } else {
                    resolve(spark.end())
                }
            }

            fileReader.onerror = () => {
                reject(new Error('文件读取错误'))
            }

            const loadNext = () => {
                const start = currentChunk * chunkSize
                const end = Math.min(start + chunkSize, file.size)
                fileReader.readAsArrayBuffer(file.slice(start, end))
            }

            loadNext()
        })
    }

    /**
     * 计算分片MD5
     * @param {Blob} blob 分片数据
     * @returns {Promise<string>}
     * @private
     */
    _calculateChunkMd5(blob) {
        return new Promise((resolve) => {
            const spark = new SparkMD5.ArrayBuffer()
            const fileReader = new FileReader()

            fileReader.onload = (e) => {
                spark.append(e.target.result)
                resolve(spark.end())
            }

            fileReader.onerror = () => {
                resolve('') // 即使出错也继续上传
            }

            fileReader.readAsArrayBuffer(blob)
        })
    }

    /**
     * 创建文件分片并计算每个分片的MD5
     * @param {File} file 文件对象
     * @returns {Promise<Array>} 分片数组
     * @private
     */
    async _createChunks(file) {
        const chunks = []
        let start = 0
        let index = 0

        while (start < file.size) {
            const end = Math.min(start + this.chunkSize, file.size)
            const blob = file.slice(start, end)

            // 计算每个分片的MD5
            const fileMd5 = await this._calculateChunkMd5(blob)

            chunks.push({
                index,
                start,
                end,
                blob,
                fileMd5 // 分片的MD5
            })

            start = end
            index++
        }

        return chunks
    }

    /**
     * 上传单个分片
     * @param {Object} chunk 分片对象
     * @param {number} retries 当前重试次数
     * @returns {Promise}
     * @private
     */
    async _uploadChunk(chunk, retries = 0) {
        const formData = new FormData()
        formData.append('file', chunk.blob)
        formData.append('chunkIndex', chunk.index)
        formData.append('totalChunks', this.chunks.length)
        formData.append('foldMd5', this.foldMd5) // 文件夹MD5
        formData.append('fileMd5', chunk.fileMd5) // 分片MD5
        formData.append('fileName', this.file.name)
        formData.append('fileSize', this.file.size)

        try {
            const response = await this.axiosInstance.post(this.url, formData, {
                cancelToken: this.cancelTokenSource?.token,
                onUploadProgress: (progressEvent) => {
                    const chunkProgress = Math.round(
                        (progressEvent.loaded / progressEvent.total) * 100
                    )
                    const baseProgress = (chunk.index / this.chunks.length) * 100
                    const incrementalProgress = (1 / this.chunks.length) * (chunkProgress / 100) * 100
                    this.progress = Math.min(100, Math.round(baseProgress + incrementalProgress))
                    this.onProgress(this.progress)
                }
            })

            return response.data
        } catch (error) {
            if (axios.isCancel(error)) {
                throw error
            }

            if (retries < this.maxRetries) {
                console.warn(`分片${chunk.index}上传失败，第${retries + 1}次重试...`)
                return this._uploadChunk(chunk, retries + 1)
            }
            throw error
        }
    }

    /**
     * 合并分片
     * @returns {Promise}
     * @private
     */
    async _mergeChunks() {
        try {
            const response = await this.axiosInstance.get(`${this.url}/merge`, {
                params:{
                    foldMd5: this.foldMd5, // 文件夹MD5
                    fileName: this.file.name,
                    totalChunks: this.chunks.length,
                    fileSize: this.file.size
                }
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            return response.data
        } catch (error) {
            throw error
        }
    }

    /**
     * 开始上传
     * @returns {Promise}
     */
    async startUpload() {
        if (!this.file) {
            throw new Error('请先设置要上传的文件')
        }

        if (!this.foldMd5) {
            throw new Error('文件MD5未计算')
        }

        this.cancelTokenSource = axios.CancelToken.source()

        try {
            // 并发上传控制
            const queue = [...this.chunks]
            const activeUploads = []
            let completed = 0

            while (queue.length > 0 || activeUploads.length > 0) {
                // 填充活跃上传队列
                while (activeUploads.length < this.concurrent && queue.length > 0) {
                    const chunk = queue.shift()
                    if (!this.uploadedChunks.includes(chunk.index)) {
                        const uploadPromise = this._uploadChunk(chunk).then((result) => {
                            // 上传完成，从活跃队列中移除
                            activeUploads.splice(activeUploads.indexOf(uploadPromise), 1)
                            this.uploadedChunks.push(chunk.index)
                            completed++

                            // 更新进度 (更精确的计算)
                            this.progress = Math.round((completed / this.chunks.length) * 100)
                            this.onProgress(this.progress)

                            return result
                        }).catch(error => {
                            activeUploads.splice(activeUploads.indexOf(uploadPromise), 1)
                            throw error
                        })
                        activeUploads.push(uploadPromise)
                    } else {
                        completed++
                        this.progress = Math.round((completed / this.chunks.length) * 100)
                        this.onProgress(this.progress)
                    }
                }

                // 等待任意一个上传完成
                if (activeUploads.length > 0) {
                    await Promise.race(activeUploads)
                }
            }

            // 所有分片上传完成，通知服务器合并
            try {
                const result = await this._mergeChunks()
                console.log('所有分片上传完成，开始合并...', result)

                return new Promise((resolve, reject) => {
                    if(result.code !== 200){
                        this.onError(result)
                    }else {
                        this.progress = 100
                        this.onProgress(this.progress)
                        this.onSuccess(result)
                    }
                    resolve(result)
                })
            } catch (mergeError) {
                // 合并失败时调用错误回调
                this.onError(mergeError)
                throw mergeError
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error('上传失败:', error)
                this.onError(error)
                throw error
            }
        } finally {
            this.cancelTokenSource = null
        }
    }

    /**
     * 暂停上传
     */
    pauseUpload() {
        if (this.cancelTokenSource) {
            this.cancelTokenSource.cancel('用户暂停上传')
        }
    }

    /**
     * 继续上传
     */
    resumeUpload() {
        return this.startUpload()
    }

    /**
     * 取消上传
     */
    cancelUpload() {
        this.pauseUpload()
        this.uploadedChunks = []
        this.progress = 0
    }
}

/**
 * 创建分片上传实例
 * @param {Object} options 配置选项
 * @returns {ChunkUploader} 分片上传实例
 */
export function createChunkUploader(options) {
    return new ChunkUploader(options)
}

/**
 * 计算文件MD5
 * @param {File} file 文件对象
 * @param {Function} [onProgress] 进度回调
 * @returns {Promise<string>}
 */
export async function calculateFileMd5(file, onProgress) {
    return new Promise((resolve, reject) => {
        const spark = new SparkMD5.ArrayBuffer()
        const fileReader = new FileReader()
        const chunkSize = 2 * 1024 * 1024 // 2MB
        let currentChunk = 0
        const chunks = Math.ceil(file.size / chunkSize)

        fileReader.onload = (e) => {
            spark.append(e.target.result)
            currentChunk++

            if (onProgress) {
                onProgress(Math.round((currentChunk / chunks) * 100))
            }

            if (currentChunk < chunks) {
                loadNext()
            } else {
                resolve(spark.end())
            }
        }

        fileReader.onerror = () => {
            reject(new Error('文件读取错误'))
        }

        function loadNext() {
            const start = currentChunk * chunkSize
            const end = Math.min(start + chunkSize, file.size)
            fileReader.readAsArrayBuffer(file.slice(start, end))
        }

        loadNext()
    })
}