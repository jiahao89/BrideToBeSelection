const { api } = require('../../utils/api')
const { nav } = require('../../utils/util')
const { maskProfileDetail } = require('../../utils/desensitize')

Page({
  data: {
    loading: false,
    id: '',
    guest: null,
    matchPopupShow: false,
    matchedUser: null,
    enterAnim: null,
  },

  onLoad(options) {
    const id = options.id || '1'
    this.setData({ id })

    // 共享元素过渡：从点击位置展开入场动画
    const fx = parseFloat(options.fx) || 0
    const fy = parseFloat(options.fy) || 0
    this._playEnterAnimation(fx, fy)

    this.fetchData(id)
  },

  /**
   * 入场动画：从卡片位置缩放展开到全屏（共享元素过渡简化版）
   */
  _playEnterAnimation(fx, fy) {
    const animation = wx.createAnimation({
      duration: 320,
      timingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    })
    // 起始状态：缩小到卡片尺寸
    animation.opacity(0).scale(0.6).translate(fx * 0.3, fy * 0.3).step({ duration: 0 })
    // 展开到全屏
    animation.opacity(1).scale(1).translate(0, 0).step()
    this.setData({ enterAnim: animation.export() })
  },

  async fetchData(id) {
    this.setData({ loading: true })
    try {
      const data = await api.user.getProfile(id)
      // API 返回 { profile: {...}, verifications: [...], endorsements: [] }
      const profile = (data && data.profile) ? data.profile : (data || {})

      // 未学历认证用户对详情页数据做脱敏（PRD 5.3）
      const app = getApp()
      const isEduVerified = app.globalData.isVerified && app.globalData.isVerified.education
      const safeProfile = isEduVerified ? profile : maskProfileDetail(profile)

      this.setData({ guest: this.formatGuest(safeProfile) })

      // 上报浏览量（10分钟去重）
      if (profile._id) {
        api.user.recordView(profile._id).catch(() => {})
      }

      // 加载对方的破冰问题
      this._loadQuestions(id)
    } catch (err) {
      console.error('获取详情失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  formatGuest(data) {
    if (!data) return null
    const currentYear = new Date().getFullYear()
    const age = data.birth_year ? (currentYear - data.birth_year) : 25
    return {
      ...data,
      // 映射后端字段名到 WXML 期望的字段名
      avatar: data.avatar_url || (data.photos && data.photos[0]) || '',
      age,
      verified: !!(data.verification_status && data.verification_status.education),
      questions: data.icebreaker_questions
        ? data.icebreaker_questions.map((q, i) => ({ id: i + 1, content: q }))
        : []
    }
  },

  async _loadQuestions(targetId) {
    try {
      const questions = await api.icebreaker.getQuestions(targetId)
      if (questions && questions.length > 0) {
        this.setData({ guest: { ...this.data.guest, questions } })
      }
    } catch (err) {
      // 静默失败，questions 会使用 formatGuest 中的默认值
    }
  },

  onMatchClose() {
    this.setData({ matchPopupShow: false })
  },

  async onLikeTap() {
    if (!getApp().checkGuest('点赞')) return
    try {
      await api.like.send(this.data.id)
      wx.showToast({ title: '点赞同频成功', icon: 'success' })
    } catch (err) {
      console.error('点赞失败:', err)
    }
  },

  onCrushTap() {
    if (!getApp().checkGuest('发起心动')) return
    const name = this.data.guest ? this.data.guest.nickname : '对方'
    nav.navigateTo(`/pages/icebreaker/answer?id=${this.data.id}&name=${encodeURIComponent(name)}`)
  }
})
