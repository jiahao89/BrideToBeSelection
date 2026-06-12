const { api } = require('../../utils/api')
const { nav } = require('../../utils/util')

Page({
  data: {
    loading: false,
    profile: null
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
      const data = await api.user.getProfile()
      this.setData({ profile: data })
    } catch (err) {
      console.error('获取个人资料失败:', err)
      // 模拟测试数据 (符合 Stitch 设计图)
      this.setData({
        profile: {
          nickname: '陈佳丽',
          avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCasY8xPdX4ntXdqUCr28WIF-zJnJh6BVx8KsZYlOgP_obIwVr3K9MiOzIbpi5T8Yjw_QWuIPBssUyjeFK6bMD0YT4TlKz2q_zto5Ni9C9Uw6hA2rxiE9aKBft9ktKRq3qE1WROXEmPMrelTlZl99zJSSdmXHGPTbhl81vW6DyVW-2zKQqRgKfAeNWM9pnZpI_Uk-LflkJ_7QV7zp0qiuI3qd9vR3jVtYcb83o3miz99ZChp9mvUjG0hoyLl_kdUg_tJ21jU4E7Ke8',
          school: '江南大学',
          degree: '硕士',
          gradYear: '2022',
          role: 'single', // 'single' 单身校友 / 'matchmaker' 介绍人
          rejected: false,
          idVerified: true,
          eduVerified: true,
          workVerified: false,
          followersCount: 24, // 关注我的
          matchCount: 3,      // 互加微信
          likeCount: 88,      // 同频点赞
          hasUnreadAnswers: true // 收到的破冰回答红点
        }
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  onSettingsHeart() {
    wx.showToast({ title: '我的心动设置功能开发中', icon: 'none' })
  },

  onReceivedAnswers() {
    wx.switchTab({
      url: '/pages/message/index'
    })
  },

  onGoToVerification() {
    nav.navigateTo('/pages/verification/index')
  },

  onMyCrushList() {
    wx.showToast({ title: '我发起的心动开发中', icon: 'none' })
  },

  onMyIcebreakers() {
    wx.showToast({ title: '我的破冰问题开发中', icon: 'none' })
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
