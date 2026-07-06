const { nav } = require('../../utils/util')

Page({
  data: {
    loading: false,
    agreed: false,
  },

  onLoad(options) {
    if (options.inviteCode) {
      wx.setStorageSync('pending_invite_code', options.inviteCode)
    }

    // 已登录则直接跳转
    const app = getApp()
    if (app.globalData.userId) {
      this._navigateAfterLogin()
    }
  },

  onToggleAgreement() {
    this.setData({ agreed: !this.data.agreed })
  },

  /**
   * 确保已勾选协议，未勾选则弹窗提示
   */
  _ensureAgreed() {
    if (this.data.agreed) return true
    wx.showModal({
      title: '用户协议与隐私政策',
      content: '您需要同意《用户服务协议》和《隐私政策》后才能继续',
      confirmText: '同意',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.setData({ agreed: true })
          // 用户同意后不自动继续，需要再点一次按钮
        }
      }
    })
    return false
  },

  /**
   * 微信一键登录
   * 调用 wx.login 获取 code → 云函数建立 Supabase 会话
   */
  async onWechatLogin() {
    if (!this._ensureAgreed()) return

    this.setData({ loading: true })
    try {
      const app = getApp()
      const loginResult = await app.wxLogin()

      if (!loginResult || !loginResult.success) {
        wx.showToast({ title: (loginResult && loginResult.message) || '登录失败，请重试', icon: 'none' })
        return
      }

      const { data } = loginResult

      if (data.needRegister) {
        nav.redirect('/pages/role-select/index')
      } else {
        app.globalData.userId = data.user._id
        app.globalData.activeRole = data.user.active_role
        app.globalData.roles = data.user.roles
        app.globalData.isVerified = data.user.verification_status || {}
        app.globalData.profileCompleteness = data.user.profile_completeness || 0
        app.globalData.isMember = data.user.is_member || false
        app.globalData.isGuest = false

        this._navigateAfterLogin()
      }
    } catch (err) {
      console.error('微信登录异常:', err)
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 手机号登录（暂不支持，需要后端短信服务商）
   */
  onPhoneLogin() {
    wx.showModal({
      title: '手机号登录',
      content: '手机号验证码登录功能即将上线，目前请使用微信一键登录。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  /**
   * 游客体验：仅浏览权限，操作时引导登录
   */
  onGuestLogin() {
    const app = getApp()
    app.globalData.userId = null
    app.globalData.activeRole = ''
    app.globalData.roles = []
    app.globalData.isVerified = { identity: false, education: false, work: false }
    app.globalData.profileCompleteness = 0
    app.globalData.isMember = false
    app.globalData.isGuest = true

    wx.showToast({ title: '游客模式，部分功能需登录', icon: 'none', duration: 1500 })

    setTimeout(() => {
      wx.switchTab({ url: '/pages/recommend/index' })
    }, 1000)
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

  _navigateAfterLogin() {
    const app = getApp()
    const completeness = app.globalData.profileCompleteness || 0
    app.globalData.isGuest = false

    if (completeness < 50) {
      nav.redirect('/pages/verification/index?from=login')
    } else {
      nav.switchTab('/pages/recommend/index')
    }
  },
})
