const { api } = require('../../utils/api')
const { nav } = require('../../utils/util')

Page({
  data: {
    loading: false,
    id: '',
    event: null,
    showVerifyModal: false,
    
    userVerified: false
  },

  onLoad(options) {
    const id = options.id || 'e1'
    this.setData({ id })
    this.fetchData(id)
  },

  onShow() {
    const app = getApp()
    // 检查是否实名且有学校认证
    const isVerified = !!(app.globalData.isVerified && app.globalData.isVerified.identity && app.globalData.isVerified.education)
    this.setData({ userVerified: isVerified })
  },

  async fetchData(id) {
    this.setData({ loading: true })
    try {
      const data = await api.event.detail(id)
      this.setData({ event: this.formatEventDetail(data) })
    } catch (err) {
      console.error('获取活动详情失败:', err)
      // 模拟测试数据
      const mockEvent = {
        _id: id,
        title: id === 'e2' ? '【金陵夜奔】环玄武湖落日夜跑+冰破桌游' : '【九龙湖畔】东南大学&南京大学校友联谊下午茶',
        cover: '',
        status: 'recruiting',
        dateTimeStr: id === 'e2' ? '06月27日 18:30 - 21:30' : '06月20日 14:00 - 17:30',
        location: id === 'e2' ? '南京市玄武区玄武湖情侣园正门' : '南京市江宁区九龙湖研创园咖啡厅',
        latitude: id === 'e2' ? 32.0718 : 31.8892,
        longitude: id === 'e2' ? 118.8016 : 118.8188,
        limitCount: id === 'e2' ? 20 : 50,
        attendingCount: id === 'e2' ? 16 : 38,
        fee: id === 'e2' ? '免费' : '58元 / 人 (含饮品甜点)',
        descriptionParagraphs: id === 'e2' ? [
          '在这个初夏的傍晚，让我们暂别繁重的科研与工作，相约在美丽的玄武湖畔。迎着落日余晖，用一场轻松的夜跑开启我们的周末。',
          '夜跑路线：围绕玄武湖情侣园至解放门段，全长约 4 公里。慢跑为主，中间设有打卡点与互动小任务，方便大家边跑边聊。',
          '夜跑结束后，我们将在湖畔草坪举行“冰破桌游派对”，包含狼人杀、阿瓦隆以及专属校缘破冰扑克。提供免费软饮与水果，名额有限，报满即止！'
        ] : [
          '六朝松相亲会特约！专为东南大学与南京大学单身校友打造的“周末下午茶”交流专场。这里没有尴尬的相亲介绍，只有轻松自然的茶座沙龙。',
          '活动流程包含：心动初印象、三分钟轮换转圈交流（保证能与每位异性校友交流）、默契小测试以及自由自由交谈环节。',
          '为了保证活动的私密性与高品质，参与者需提前通过系统学历/工作实名认证。现场将提供高品质手冲咖啡、精美西点。愿在这个午后，你与心动的Ta不期而遇。'
        ],
        registered: false,
        attendees: [
          { nickname: '沈静姝', avatar: '', schoolShort: '南大硕士' },
          { nickname: '林逸尘', avatar: '', schoolShort: '东大本科' },
          { nickname: '苏婉清', avatar: '', schoolShort: '复旦硕士' },
          { nickname: '顾星洲', avatar: '', schoolShort: '浙大本科' },
          { nickname: '徐听雨', avatar: '', schoolShort: '南理工硕士' },
          { nickname: '江浩然', avatar: '', schoolShort: '东大博士' }
        ]
      }
      this.setData({ event: this.formatEventDetail(mockEvent) })
    } finally {
      this.setData({ loading: false })
    }
  },

  formatEventDetail(item) {
    if (!item) return null
    let statusText = '未知'
    if (item.status === 'recruiting') {
      statusText = '招募中'
    } else if (item.status === 'ongoing') {
      statusText = '进行中'
    } else if (item.status === 'ended') {
      statusText = '已结束'
    }
    return {
      ...item,
      statusText
    }
  },

  onOpenMap() {
    const { event } = this.data
    if (!event || !event.latitude || !event.longitude) return
    wx.openLocation({
      latitude: event.latitude,
      longitude: event.longitude,
      name: event.location,
      scale: 16
    })
  },

  onRegister() {
    // 1. 拦截未认证用户
    if (!this.data.userVerified) {
      this.setData({ showVerifyModal: true })
      return
    }

    this.submitRegistration()
  },

  async submitRegistration() {
    wx.showLoading({ title: '预约报名中...', mask: true })
    try {
      await api.event.register(this.data.id)
      wx.hideLoading()
      wx.showToast({
        title: '报名预约成功',
        icon: 'success'
      })
      // 更新状态
      const updatedEvent = { ...this.data.event, registered: true, attendingCount: (this.data.event.attendingCount || 0) + 1 }
      this.setData({ event: updatedEvent })
    } catch (err) {
      console.error('报名失败:', err)
      wx.hideLoading()
      wx.showToast({ title: '报名失败，请稍后重试', icon: 'none' })
    }
  },

  onCancelVerify() {
    this.setData({ showVerifyModal: false })
  },

  onConfirmVerify() {
    this.setData({ showVerifyModal: false })
    nav.navigateTo('/pages/verification/index')
  },

  onShareAppMessage() {
    const { event } = this.data
    return {
      title: event ? event.title : '校友相亲会活动',
      path: `/pages/event/detail?id=${this.data.id}`
    }
  }
})
