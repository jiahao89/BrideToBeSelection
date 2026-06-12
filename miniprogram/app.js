// app.js - 六朝松相亲会
App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: 'liuchaosong-prod', // 替换为实际环境ID
      traceUser: true,
    })

    // 计算设备及胶囊安全区信息，用于还原 Stitch 原型中的自定义 TopAppBar 头部
    try {
      const sysInfo = wx.getSystemInfoSync()
      const capsule = wx.getMenuButtonBoundingClientRect()
      const statusBarHeight = sysInfo.statusBarHeight || 20
      // 动态计算导航栏高度使得文本和胶囊完美在Y轴居中
      const navBarHeight = (capsule.top - statusBarHeight) * 2 + capsule.height
      
      this.globalData.navBarHeight = navBarHeight
      this.globalData.statusBarHeight = statusBarHeight
      this.globalData.navBarTotalHeight = statusBarHeight + navBarHeight
    } catch (e) {
      console.error('计算自定义导航栏高度出错:', e)
      // 容错兜底值
      this.globalData.navBarHeight = 44
      this.globalData.statusBarHeight = 20
      this.globalData.navBarTotalHeight = 64
    }

    // 检查登录状态
    this.checkLoginStatus()
  },

  globalData: {
    userInfo: null,       // 微信用户信息
    userId: null,         // 系统用户ID
    activeRole: null,     // 当前激活角色：self/parent/matchmaker/organizer/volunteer
    roles: [],            // 用户拥有的所有角色
    isVerified: {         // 认证状态
      identity: false,
      education: false,
      work: false,
    },
    profileCompleteness: 0, // 资料完整度
    isMember: false,        // 是否为会员
  },

  /**
   * 检查登录状态，恢复会话
   */
  async checkLoginStatus() {
    try {
      const token = wx.getStorageSync('auth_token')
      if (!token) return

      const res = await wx.cloud.callFunction({
        name: 'user',
        data: { action: 'checkSession' },
      })

      if (res.result && res.result.success) {
        const { user } = res.result.data
        this.globalData.userId = user._id
        this.globalData.activeRole = user.active_role
        this.globalData.roles = user.roles
        this.globalData.isVerified = user.verification_status || {}
        this.globalData.profileCompleteness = user.profile_completeness || 0
        this.globalData.isMember = user.is_member || false
      }
    } catch (err) {
      console.error('会话恢复失败:', err)
      wx.removeStorageSync('auth_token')
    }
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
            resolve(result.result)
          } catch (err) {
            reject(err)
          }
        },
        fail: reject,
      })
    })
  },
})
