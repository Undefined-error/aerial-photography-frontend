import router from '@/router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { login, logout, getInfo } from '@/api/login'
// 引入企业信息接口
import { getEnterpriseInfo } from '@/api/enterprise'
import { getToken, setToken, removeToken } from '@/utils/auth'
import { isHttp, isEmpty } from "@/utils/validate"
import defAva from '@/assets/images/profile.jpg'

const useUserStore = defineStore(
  'user',
  {
    state: () => ({
      token: getToken(),
      id: '',
      name: '',
      nickName: '',
      avatar: '',
      roles: [],
      permissions: [],
      // 新增：存储企业信息
      enterpriseInfo: {}
    }),
    actions: {
      // 登录
      login(userInfo) {
        const username = userInfo.username.trim()
        const password = userInfo.password
        const code = userInfo.code
        const uuid = userInfo.uuid
        return new Promise((resolve, reject) => {
          login(username, password, code, uuid).then(res => {
            setToken(res.token)
            this.token = res.token
            resolve()
          }).catch(error => {
            reject(error)
          })
        })
      },
      // 获取用户信息和企业信息
      getInfo() {
        return new Promise((resolve, reject) => {
          getInfo().then(res => {
            const user = res.user
            let avatar = user.avatar || ""
            if (!isHttp(avatar)) {
              avatar = (isEmpty(avatar)) ? defAva : import.meta.env.VITE_APP_BASE_API + avatar
            }
            if (res.roles && res.roles.length > 0) { // 验证返回的roles是否是一个非空数组
              this.roles = res.roles
              this.permissions = res.permissions
            } else {
              this.roles = ['ROLE_DEFAULT']
            }
            this.id = user.userId
            this.name = user.userName
            this.nickName = user.nickName
            this.avatar = avatar
            
            // 获取企业信息
            this.getEnterpriseInfo().then(() => {
              /* 初始密码提示 */
              if(res.isDefaultModifyPwd) {
                ElMessageBox.confirm('您的密码还是初始密码，请修改密码！',  '安全提示', {  confirmButtonText: '确定',  cancelButtonText: '取消',  type: 'warning' }).then(() => {
                  router.push({ name: 'Profile', params: { activeTab: 'resetPwd' } })
                }).catch(() => {})
              }
              /* 过期密码提示 */
              if(!res.isDefaultModifyPwd && res.isPasswordExpired) {
                ElMessageBox.confirm('您的密码已过期，请尽快修改密码！',  '安全提示', {  confirmButtonText: '确定',  cancelButtonText: '取消',  type: 'warning' }).then(() => {
                  router.push({ name: 'Profile', params: { activeTab: 'resetPwd' } })
                }).catch(() => {})
              }
              resolve(res)
            }).catch(error => {
              reject(error)
            })
          }).catch(error => {
            reject(error)
          })
        })
      },
      
      // 获取企业信息并存储在当前user store中
      getEnterpriseInfo() {
        return new Promise((resolve, reject) => {
          getEnterpriseInfo().then(res => {
            // 直接存储在当前store的enterpriseInfo中
            this.enterpriseInfo = res.enterpriseInfo || {}
            resolve(res)
          }).catch(error => {
            reject(error)
          })
        })
      },
      
      // 退出系统
      logOut() {
        return new Promise((resolve, reject) => {
          logout(this.token).then(() => {
            this.token = ''
            this.roles = []
            this.permissions = []
            // 清空企业信息
            this.enterpriseInfo = {}
            removeToken()
            resolve()
          }).catch(error => {
            reject(error)
          })
        })
      }
    }
  })

export default useUserStore