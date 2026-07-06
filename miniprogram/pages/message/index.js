const { api } = require('../../utils/api')
const { nav } = require('../../utils/util')

Page({
  data: {
    loading: false,
    activeTab: 'crush', // 'crush' 心动消息 / 'like' 点赞消息
    crushList: [],
    likeList: []
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
    this.fetchData()
  },

  async fetchData() {
    this.setData({ loading: true })
    try {
      await getApp().waitForLogin()
      const data = await api.like.getReceived()
      const crushList = data.filter(item => item.answers || item.stage)
      const likeList = data.filter(item => !item.answers && !item.stage)
      this.setData({ crushList, likeList })
    } catch (err) {
      console.error('获取消息列表失败:', err)
      // 模拟测试数据 (对齐 Stitch 高保真设计图中的消息卡片内容和头像图片)
      this.setData({
        crushList: [
          {
            _id: '2',
            nickname: '林逸尘',
            school: '南京大学',
            degree: '本科',
            time: '今天 10:24',
            expanded: true,
            status: 'pending',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqHyee-miviQ1oWG7HBMA0_Aqtz-TZvGCMV58LEcRUAGLvL9I8dgD95RGiT0Cx17GhARdo5NQ6L18H4qNBr7JLnzJ59lQaMf3lyvYPdIjPrYjTPCTj2MY-zOCH_TdpTMLTDr3wVQ5kU_cNwUfq3fvkW3J1scyfLdZ7N8DV467VrOLTpBaIWHHWoEjGxMW6IlMcjerRPlnvpcWCT6iC0OirJqI9zgC3nbsAfvXYcpWiEzMGmXM-2wUTK8vjBxQynARnoV6Wu0VWXoU',
            answers: {
              '1': '周末喜欢去图书馆看书，或者去玄武湖跑跑步，真诚寻Ta，希望能遇到一个频率相同的朋友一起探索城市。'
            }
          },
          {
            _id: '4',
            nickname: '顾星洲',
            school: '浙江大学',
            degree: '硕士',
            time: '昨天 15:30',
            status: 'accepted',
            wechatId: 'guxz_zju95',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZf5v0G4zeqKBiVIfV_-GFQa-PtD5VjU6yFhl7Yrh3rfHqyGhLJ0lvFOn7-zq3NGNVC9iwfGfObnrnZZmMC4rDI22ohJDb7YU1N-IreGtDa-Ts1hsGLu_k3swEU3uOn9Rau8TZGN0jgLi0TeqZeXYIMausC1pg9Dpp33wlh-8_jRIjXL-vlMrqkJOTxvH3PS44AULt2HIzY2pwizbOG8t5ewCWi6RKi_FtLCGsVWggu785gl5NbLCsXe-O5UmXunQcH4K9ZpxnOgc'
          }
        ],
        likeList: [
          { 
            _id: '1', 
            nickname: '沈静姝', 
            school: '江南大学', 
            time: '前天 09:12',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBj1iILsmZ8lMcnuqGX4OeZL8ulIC7dajUDqvUyLcV_R0I9t4GYgrnEQpeKzIH4zdrXCV-28cEHMr1NsbK4Z052J-_s1HqhmT_wwQSnPgZT-3CVxBU3Fnyissl6SgcbuCiJwAEG3dFhEhGln0XuUpLvCsOrDEfaggdu-Ia-y5igmqVp7WqqBC13zVNvHjQyYx0ZU3fLiwNMDcii4erFfuzG8GK9x0xOpwLKTX70GBrIxqiJMT5EBMo9siGmz1N45qeQ2t2ZVuNmu6Y'
          }
        ]
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  onTabChange(e) {
    const { tab } = e.currentTarget.dataset
    this.setData({ activeTab: tab })
  },

  onToggleExpand(e) {
    const { id } = e.currentTarget.dataset
    const crushList = this.data.crushList.map(item => {
      if (item._id === id) {
        return { ...item, expanded: !item.expanded }
      }
      return item
    })
    this.setData({ crushList })
  },

  onAccept(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.crushList.find(x => x._id === id)
    if (!item || !item.heart_request_id) return

    wx.showModal({
      title: '互加微信',
      content: '接受后将向对方透露您的微信号，并解锁对方微信号。确认要互加微信吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.icebreaker.reviewAnswer(item.heart_request_id, '', true)
            wx.showToast({ title: '已接受，已解锁微信号', icon: 'success' })
            this.fetchData() // 刷新列表以从服务器加载最新的微信号
          } catch (err) {
            console.error('接受心动失败:', err)
          }
        }
      }
    })
  },

  onDecline(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.crushList.find(x => x._id === id)
    if (!item || !item.heart_request_id) return

    wx.showModal({
      title: '暂不合适',
      content: '确认要委婉拒绝吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.icebreaker.reviewAnswer(item.heart_request_id, '', false)
            wx.showToast({ title: '已委婉拒绝', icon: 'none' })
            this.fetchData() // 刷新列表
          } catch (err) {
            console.error('拒绝心动失败:', err)
          }
        }
      }
    })
  },

  onGoToDetail(e) {
    const { id } = e.currentTarget.dataset
    nav.navigateTo(`/pages/profile-detail/index?id=${id}`)
  }
})
