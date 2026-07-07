const { api } = require('../../utils/api')
const { nav } = require('../../utils/util')

Page({
  data: {
    loading: false,
    profile: null,
    questionInitShow: false
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 3
      })
    }
    this.fetchData()
  },

  async fetchData() {
    this.setData({ loading: true })
    try {
      await getApp().waitForLogin()
      const data = await api.user.getProfile()
      // API 返回 { profile: {...}, verifications: [...], endorsements: [] }
      const profile = (data && data.profile) ? data.profile : (data || {})
      this.setData({ profile })
    } catch (err) {
      console.error('获取个人资料失败:', err)
      this.setData({
        profile: {
          nickname: '校友用户',
          avatar: '',
          school: '',
          role: 'single',
          rejected: false,
          idVerified: false,
          eduVerified: false,
          workVerified: false,
          followersCount: 0,
          matchCount: 0,
          likeCount: 0,
          hasUnreadAnswers: false
        }
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  onSettingsHeart() {
    if (!getApp().checkGuest('心动设置')) return
    this.setData({ questionInitShow: true })
  },

  onQuestionSaved() {
    this.setData({ questionInitShow: false })
    this.fetchData()
  },

  onReceivedAnswers() {
    wx.switchTab({
      url: '/pages/message/index'
    })
  },

  onGoToVerification() {
    if (!getApp().checkGuest('认证')) return
    nav.navigateTo('/pages/verification/index')
  },

  onMyCrushList() {
    if (!getApp().checkGuest('查看心动')) return
    // 跳转到消息中心的「心动」Tab
    wx.switchTab({ url: '/pages/message/index' })
  },

  onMyIcebreakers() {
    if (!getApp().checkGuest('查看破冰问题')) return
    // 复用心动设置入口展示已有问题
    this.setData({ questionInitShow: true })
  },

  onContactService() {
    wx.showActionSheet({
      itemList: ['联系在线客服', '查看常见问题解答(FAQ)', '反馈Bug/建议'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '联系客服',
            content: '已复制客服微信：six_松_match. 请在搜索框添加并与客服联系。',
            showCancel: false
          })
        } else if (res.tapIndex === 1) {
          wx.showToast({ title: '加载常见问题...', icon: 'none' })
        } else {
          nav.navigateTo('/pages/report/index?id=system&name=系统反馈')
        }
      }
    })
  }
})
