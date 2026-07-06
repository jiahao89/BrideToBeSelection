const { api } = require('../../utils/api')
const { nav } = require('../../utils/util')

Page({
  data: {
    loading: false,
    activeCategory: 'all', // 'all' 全部活动 / 'nju' 南京大学 / 'sytu' 江南大学 / 'outdoor' 同城户外
    list: [],
    filteredList: [],
    navBarHeight: 44,
    statusBarHeight: 20,
    navBarTotalHeight: 64
  },

  onLoad(options) {
    const app = getApp()
    this.setData({
      navBarHeight: app.globalData.navBarHeight || 44,
      statusBarHeight: app.globalData.statusBarHeight || 20,
      navBarTotalHeight: app.globalData.navBarTotalHeight || 64
    })
    this.fetchData()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
  },

  async fetchData() {
    this.setData({ loading: true })
    try {
      await getApp().waitForLogin()
      const data = await api.event.list()
      const formatted = (data || []).map(item => this.formatEvent(item))
      this.setData({ list: formatted })
      this.applyFilter()
    } catch (err) {
      console.error('获取活动列表失败:', err)
      // 模拟测试数据 (采用 Stitch 设计图中的高保真图片、状态和数据)
      const mockList = [
        {
          _id: 'e1',
          title: '【试点专场】南京大学 & 江南大学端午同城联谊会',
          cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcyODSPxhcd-5B7yYma_gkOSLrav5EIHkQ0oEA1oGAH9MLk467Ym27VvTENs0XfA5IAI3gFcDGCQGlTdzRr6qkzlvVPgPbk2zbWfxPHK9HTRwu-V_1zBXTtfsklD4Gx3BdNnJU1ArFtnbai78kk-P-v-ASiIPtEW-97xeWTqaf4AS19xbc4O3DTOJGpOs3o582IHEykK3VaSv2JkVmZ1zgt_msAXx7SCfHHXpRcQ6SDG2k91rPXcE-edWgYbt3RwAdx1JT17zx1Oc',
          status: 'recruiting',
          statusText: '🔥 报名中 (已报32/50人)',
          dateTimeStr: '2026-06-20',
          location: '玄武区紫金山庄',
          targetAudience: '限高校认证校友',
          attendingCount: 32,
          attendingAvatars: [
            'https://lh3.googleusercontent.com/aida-public/AB6AXuB_5BQgEtkria9vXEusgCmRHxSQQnaHgppB1QXTEs797Gye_IJOkxi1MDO2MgLNi5lavynuzcOtQVuf2nxxvNaVkLaXm3FzxxLc7qoB99wlbC7PZs0c_ZRlZbDbSFKGxlEvuq_JXnnNsmaWc6w67f40qK9NUmGRLVzQX60mPN7VZbK_IbKOkgQhdULtTwJIUtooaYPVxlqr0gu4inYBRUvnx6EIcmXKltmvET3JVH1CcZ7wmH1uJBn9Wf7d3nx4HrcoepzFrdA7SoY',
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBwcctiAxhuvqND4w7BBlDzFbefYJm3179PNaSnqfRZutUTXPbrOZmuK4kWQRWXaWuRki9VmkwFvPiqr8xqWG1P3nVUm9C73G-xuGKb9pdgKVeScUF98Uram3DZwEMvEpNi52ROr0GFlwcZqENwNZCLKuuNy_ncUg5UYmScCcjFef2H2QGnzMzPqjt1JvS68iHCtNmf06z4VEnqyCP8VbeWsJSS8WFnsm966v537q7FKCbvbTCkxbAl2_EtaNRK_jmkxRpPPmQq7F4',
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCBkLM_jItXJbCtTexNmLwNUID54JHuSvqPXJQWzMp2FWDuw5AZmvHFFHJ8s1ytyZu3hbmL6D3kG0NW8qvrOh9lPWjuPWccfnXz2UO3ACICv7BUaVfqPH58OlEMkoD90meqyiowSWV7M76Sf4chEeRrb9F_y88tRv_qIOYsJZ93amF2nx8o687MaTXp42qkboHxQRVbh_6PbupyEBWDGy1NDmgIoRndXSddpSHukhqN_7rClledCNWl8rbuc5kLunyNR6hsdFqGp-Y'
          ]
        },
        {
          _id: 'e2',
          title: '【同城户外】九龙湖草坪音乐节 & 单身派对',
          cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTAQvftVPv8U4JDvxao8kjfROPd8OFhcjevQEQyBJOcAMEF3dJg2Irr6yQmyvRxiuJKd421O7SX_-w78gMUdDl7TNSy6aaX2SLVUefejLCy_c72XfSWRlNX7dpQ1RnQz8OrfB42R0o0kiKiIFonjKBa59KyUQSA-mqyJ5SvqrOBZhxrWc9UrEaMds9ZIaTXP4cQLYGqckB9wWhddAy8osMEH-iG9lExkkO-RqZj3Uo_JWvhbmWH4HrdFYKGZ0ch6rxzgEh8tBFr-s',
          status: 'closing',
          statusText: '⌛ 仅剩5个名额',
          dateTimeStr: '2026-06-27',
          location: '江宁九龙湖大草坪',
          targetAudience: '限高校认证校友',
          attendingCount: 15,
          attendingAvatars: [
            'https://lh3.googleusercontent.com/aida-public/AB6AXuD5e0sLbLmV1dNDv1YGXgWx_ClxypEYatD4UsFL89gu06w7koZvsRHNpxk7uLEgqlxnGULkfQFaZjPj0M9O_5NibqsYa7MgWhMDRJqOQDMBMonMdE3H0OtiSIreAV70wQoUHdpd9gwCH83eVRMnhzf6P6YQNIZSexq3oIRD18yVvLAn7PqL4dA87TvQ82YoFU5q3iNp4mv8dNca-e3wbMWEsewNceoAJJlA5Zuwf9f79haJhHjn4WeF6LEt_np4GikQPEzpJg0EQjg',
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCcYFQV2pZT8FsI924glgF6Abs-DsPWsFap8OY6nHHILkUjVwTeMpGI2J21F_BGRbaMdiqH3b9maXFbbwuATRdQSXUDqo6qEVDNc8THhiy_hzn1HsSBUojLSwX-b_QH2Hpv_vuzgLUYf5jZxjjiBRKKweBCmeKW5QxXu8L3EmrINhAzN-lOR-kw_h1apDO_Jd3CVCm2EniXwc2MkVIt940qTbkprWLKVUymtXzeTjdNeNdGAdPyGuiCEWboiBcHbgHZIecAhcRheic'
          ]
        }
      ]
      this.setData({ list: mockList })
      this.applyFilter()
    } finally {
      this.setData({ loading: false })
    }
  },

  formatEvent(item) {
    let statusText = '未知'
    if (item.status === 'recruiting') {
      statusText = '🔥 报名中'
    } else if (item.status === 'ongoing') {
      statusText = '进行中'
    } else if (item.status === 'ended') {
      statusText = '已结束'
    }
    return {
      ...item,
      statusText: item.statusText || statusText
    }
  },

  onCategoryChange(e) {
    const { category } = e.currentTarget.dataset
    this.setData({ activeCategory: category }, () => {
      this.applyFilter()
    })
  },

  applyFilter() {
    const { list, activeCategory } = this.data
    let filteredList = list
    if (activeCategory === 'nju') {
      filteredList = list.filter(item => item.title.includes('南京大学'))
    } else if (activeCategory === 'sytu') {
      filteredList = list.filter(item => item.title.includes('江南大学'))
    } else if (activeCategory === 'outdoor') {
      filteredList = list.filter(item => item.title.includes('同城户外') || item.title.includes('派对') || item.title.includes('音乐节'))
    }
    this.setData({ filteredList })
  },

  onEventTap(e) {
    const { id } = e.currentTarget.dataset
    nav.navigateTo(`/pages/event/detail?id=${id}`)
  },

  onRegisterBtnTap(e) {
    const { id } = e.currentTarget.dataset
    nav.navigateTo(`/pages/event/detail?id=${id}`)
  },

  onSearchTap() {
    wx.showToast({ title: '搜索功能开发中', icon: 'none' })
  },

  onNotificationTap() {
    wx.showToast({ title: '通知中心开发中', icon: 'none' })
  }
})
