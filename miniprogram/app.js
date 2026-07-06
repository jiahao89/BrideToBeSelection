// app.js - 六朝松相亲会
App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: 'cloudbase-d4gu70bs98392f16e',
      traceUser: true,
    })

    // 计算设备及胶囊安全区信息，用于自定义导航栏
    try {
      const sysInfo = wx.getSystemInfoSync()
      const capsule = wx.getMenuButtonBoundingClientRect()
      const statusBarHeight = sysInfo.statusBarHeight || 20
      const navBarHeight = (capsule.top - statusBarHeight) * 2 + capsule.height

      this.globalData.navBarHeight = navBarHeight
      this.globalData.statusBarHeight = statusBarHeight
      this.globalData.navBarTotalHeight = statusBarHeight + navBarHeight
    } catch (e) {
      console.error('计算自定义导航栏高度出错:', e)
      this.globalData.navBarHeight = 44
      this.globalData.statusBarHeight = 20
      this.globalData.navBarTotalHeight = 64
    }

    // 登录流程：通过 Promise 暴露给页面，页面可通过 await getApp().waitForLogin() 等待
    this._loginReady = this.checkLoginStatus()
  },

  globalData: {
    userInfo: null,
    userId: null,
    activeRole: null,
    roles: [],
    isVerified: {
      identity: false,
      education: false,
      work: false,
    },
    profileCompleteness: 0,
    isMember: false,
  },

  /**
   * 检查登录状态，恢复会话
   * 如果本地有 auth_token 则校验云端会话；否则尝试静默登录
   */
  async checkLoginStatus() {
    try {
      const hasLoggedIn = wx.getStorageSync('has_logged_in')
      if (!hasLoggedIn) return

      // 有登录标记，校验云端会话是否仍有效
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: { action: 'checkSession' },
      })

      if (res.result && res.result.success && res.result.data && res.result.data.user) {
        const { user } = res.result.data
        this.globalData.userId = user._id
        this.globalData.activeRole = user.active_role
        this.globalData.roles = user.roles
        this.globalData.isVerified = user.verification_status || {}
        this.globalData.profileCompleteness = user.profile_completeness || 0
        this.globalData.isMember = user.is_member || false
      } else {
        // 会话失效，尝试静默重新登录
        await this._autoLogin()
      }
    } catch (err) {
      console.error('会话恢复失败，尝试静默登录:', err)
      try {
        await this._autoLogin()
      } catch (e) {
        console.error('静默登录也失败:', e)
      }
    }
  },

  /**
   * 静默登录：仅获取 openid 并建立 Supabase 会话，不弹 UI
   */
  async _autoLogin() {
    const result = await this.wxLogin()
    if (result && result.success) {
      wx.setStorageSync('has_logged_in', true)
      if (result.data && result.data.user) {
        const { user } = result.data
        this.globalData.userId = user._id
        this.globalData.activeRole = user.active_role
        this.globalData.roles = user.roles
        this.globalData.isVerified = user.verification_status || {}
        this.globalData.profileCompleteness = user.profile_completeness || 0
        this.globalData.isMember = user.is_member || false
      }
    }
  },

  /**
   * 页面等待登录完成，用法：await getApp().waitForLogin()
   */
  waitForLogin() {
    return this._loginReady || Promise.resolve()
  },

  /**
   * 游客模式守卫：检查当前用户是否为游客
   * 如果是游客，弹窗引导登录并返回 false；否则返回 true
   * @param {string} actionDesc - 操作描述，如"点赞"、"报名活动"
   * @returns {boolean}
   */
  checkGuest(actionDesc) {
    if (this.globalData.isGuest) {
      wx.showModal({
        title: '需要登录',
        content: `${actionDesc || '此功能'}需要先登录账号`,
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/index' })
          }
        }
      })
      return false
    }
    return true
  },

  /**
   * 微信登录并获取 openid
   */
  async wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (loginRes) => {
          try {
            const result = await wx.cloud.callFunction({
              name: 'user',
              data: {
                action: 'login',
                code: loginRes.code,
              },
            })
            const res = result.result
            if (res && res.success) {
              wx.setStorageSync('has_logged_in', true)
            }
            resolve(res)
          } catch (err) {
            reject(err)
          }
        },
        fail: reject,
      })
    })
  },
})
