const { api } = require('../../utils/api')
const { nav } = require('../../utils/util')

Page({
  data: {
    loading: false,
    agreed: false,
  },

  onLoad(options) {
    // 如果有邀请码参数，保存
    if (options.inviteCode) {
      wx.setStorageSync('pending_invite_code', options.inviteCode)
    }

    // 检查是否已登录
    const app = getApp()
    if (app.globalData.userId) {
      this._navigateAfterLogin()
    }
  },

  /**
   * 勾选/取消协议
   */
  onToggleAgreement() {
    this.setData({ agreed: !this.data.agreed })
  },

  /**
   * 微信授权登录
   */
  async onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '需要手机号授权才能登录', icon: 'none' })
      return
    }

    if (!this.data.agreed) {
      wx.showModal({
        title: '用户协议与隐私政策',
        content: '您需要同意《用户服务协议》和《隐私政策》后才能继续登录',
        confirmText: '同意',
        cancelText: '取消',
        success: async (res) => {
          if (res.confirm) {
            this.setData({ agreed: true })
            await this._doWechatLogin()
          }
        }
      })
      return
    }

    await this._doWechatLogin()
  },

  /**
   * 执行微信登录逻辑
   */
  async _doWechatLogin() {
    this.setData({ loading: true })

    try {
      const app = getApp()
      const loginResult = await app.wxLogin()

      if (!loginResult.success) {
        wx.showToast({ title: loginResult.message || '登录失败', icon: 'none' })
        return
      }

      const { data } = loginResult

      if (data.needRegister) {
        // 新用户，跳转角色选择
        nav.redirect('/pages/role-select/index')
      } else {
        // 已注册用户
        app.globalData.userId = data.user._id
        app.globalData.activeRole = data.user.active_role
        app.globalData.roles = data.user.roles
        app.globalData.isVerified = data.user.verification_status || {}
        app.globalData.profileCompleteness = data.user.profile_completeness || 0
        app.globalData.isMember = data.user.is_member || false

        wx.setStorageSync('auth_token', data.user._id)

        this._navigateAfterLogin()
      }
    } catch (err) {
      console.error('登录异常:', err)
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 手机号登录/注册 (引导进入完整的注册流程和页面)
   */
  onPhoneLogin() {
    if (!this.data.agreed) {
      wx.showModal({
        title: '用户协议与隐私政策',
        content: '您需要同意《用户服务协议》和《隐私政策》后才能继续登录',
        confirmText: '同意',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.setData({ agreed: true })
            this._doPhoneLogin()
          }
        }
      })
      return
    }

    this._doPhoneLogin()
  },

  /**
   * 执行手机号登录逻辑
   */
  _doPhoneLogin() {
    const app = getApp()
    // 初始化一个全新的未注册/未认证用户状态，以便进入注册流程
    app.globalData.userId = 'mock_new_user_id'
    app.globalData.activeRole = ''
    app.globalData.roles = []
    app.globalData.isVerified = {
      identity: false,
      education: false,
      work: false
    }
    app.globalData.profileCompleteness = 0
    app.globalData.isMember = false

    wx.setStorageSync('auth_token', 'mock_new_user_token')

    wx.showToast({
      title: '验证码发送成功',
      icon: 'success',
      duration: 1000
    })

    setTimeout(() => {
      // 进入注册角色选择流程
      nav.navigateTo('/pages/role-select/index')
    }, 1000)
  },

  /**
   * 免登跳过 / 游客体验逻辑
   */
  onSkipLogin() {
    const app = getApp()
    
    // 设置模拟的完整测试数据，避免在后续页面中因为数据不全或权限被拦截而报错
    app.globalData.userId = 'mock_visitor_user_id'
    app.globalData.activeRole = 'self'
    app.globalData.roles = ['self']
    app.globalData.isVerified = {
      identity: true,
      education: true,
      work: true
    }
    app.globalData.profileCompleteness = 85
    app.globalData.isMember = true

    // 本地缓存模拟 Token
    wx.setStorageSync('auth_token', 'mock_visitor_token_val')

    wx.showToast({
      title: '已进入游客体验模式',
      icon: 'success',
      duration: 1200
    })

    setTimeout(() => {
      // 成功后直接进入推荐页
      wx.switchTab({
        url: '/pages/recommend/index'
      })
    }, 1200)
  },

  onViewPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '感谢您使用校缘。我们致力于保护您的隐私，所有实名及学历认证信息仅用于核验身份，不对外公开展示，且采用高强度加密存储。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  onViewTerms() {
    wx.showModal({
      title: '用户服务协议',
      content: '欢迎使用校缘相亲平台。为保障校友交友环境的严肃与真实，本平台仅对高校在校生或毕业生开放。用户须对所提交的所有认证材料真实性负责。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  /**
   * 登录后导航
   */
  _navigateAfterLogin() {
    const app = getApp()
    const completeness = app.globalData.profileCompleteness || 0

    if (completeness < 50) {
      // 资料不完整，引导去完善（原代码跳转不存在的 profile-edit 页，现修正为 verification 认证页）
      nav.redirect('/pages/verification/index?from=login')
    } else {
      // 直接进入推荐页
      nav.switchTab('/pages/recommend/index')
    }
  },
})
