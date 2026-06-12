const { api } = require('../../utils/api')
const { nav } = require('../../utils/util')

Page({
  data: {
    loading: false,
    list: [],          // 当前展示的嘉宾列表（经过筛选）
    allList: [],       // 未经筛选的全部嘉宾列表
    navBarHeight: 44,
    statusBarHeight: 20,
    navBarTotalHeight: 64,

    // 筛选状态
    filters: {
      school: 'all',
      age: 'all',
      hometown: 'all',
      degree: 'all'
    },
    
    // 筛选选项配置 (对齐 Stitch 主流高校范围)
    filterOptions: {
      school: [
        { label: '全部学校', value: 'all' },
        { label: '南京大学', value: '南京大学' },
        { label: '江南大学', value: '江南大学' },
        { label: '复旦大学', value: '复旦大学' },
        { label: '浙江大学', value: '浙江大学' }
      ],
      age: [
        { label: '全部年龄', value: 'all' },
        { label: '22-25岁', value: '22-25' },
        { label: '26-28岁', value: '26-28' },
        { label: '29岁以上', value: '29+' }
      ],
      hometown: [
        { label: '全部家乡', value: 'all' },
        { label: '杭州', value: '杭州' },
        { label: '无锡', value: '无锡' },
        { label: '上海', value: '上海' },
        { label: '南京', value: '南京' }
      ],
      degree: [
        { label: '全部学历', value: 'all' },
        { label: '学士', value: '学士' },
        { label: '硕士', value: '硕士' },
        { label: '博士', value: '博士' }
      ]
    },
    activeFilterType: 'school',
    filterTitle: '学校',
    showFilterPopup: false
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
        selected: 0
      })
    }
  },

  async fetchData() {
    this.setData({ loading: true })
    try {
      const data = await api.recommend.daily()
      if (data && data.length > 0) {
        const formatted = data.map(item => this.formatRecommendItem(item))
        this.setData({ allList: formatted }, () => {
          this.applyFilters()
        })
      } else {
        this.setMockData()
      }
    } catch (err) {
      console.error('获取推荐列表失败，加载默认高保真数据:', err)
      this.setMockData()
    } finally {
      this.setData({ loading: false })
    }
  },

  setMockData() {
    // 模拟测试数据 (完全采用 Stitch 设计图中的数据、统计指标与图片 URL，并且扩展属性以支持筛选)
    const mockData = [
      { 
        _id: '1', 
        nickname: '沈静姝', 
        school: '南京大学', 
        schoolShort: '南京大学',
        birth_year: 2000, 
        age: 26,
        height: 163, 
        job: '产品经理',
        city: '杭州',
        degree: '硕士',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBj1iILsmZ8lMcnuqGX4OeZL8ulIC7dajUDqvUyLcV_R0I9t4GYgrnEQpeKzIH4zdrXCV-28cEHMr1NsbK4Z052J-_s1HqhmT_wwQSnPgZT-3CVxBU3Fnyissl6SgcbuCiJwAEG3dFhEhGln0XuUpLvCsOrDEfaggdu-Ia-y5igmqVp7WqqBC13zVNvHjQyYx0ZU3fLiwNMDcii4erFfuzG8GK9x0xOpwLKTX70GBrIxqiJMT5EBMo9siGmz1N45qeQ2t2ZVuNmu6Y', 
        view_count: '1.2k', 
        like_count: '342',
        isLiked: false
      },
      { 
        _id: '2', 
        nickname: '林逸尘', 
        school: '江南大学', 
        schoolShort: '江南大学',
        birth_year: 2002, 
        age: 24,
        height: 178, 
        job: 'UI/UX设计师',
        city: '无锡',
        degree: '硕士',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqHyee-miviQ1oWG7HBMA0_Aqtz-TZvGCMV58LEcRUAGLvL9I8dgD95RGiT0Cx17GhARdo5NQ6L18H4qNBr7JLnzJ59lQaMf3lyvYPdIjPrYjTPCTj2MY-zOCH_TdpTMLTDr3wVQ5kU_cNwUfq3fvkW3J1scyfLdZ7N8DV467VrOLTpBaIWHHWoEjGxMW6IlMcjerRPlnvpcWCT6iC0OirJqI9zgC3nbsAfvXYcpWiEzMGmXM-2wUTK8vjBxQynARnoV6Wu0VWXoU', 
        view_count: '2.5k', 
        like_count: '890',
        isLiked: false
      },
      { 
        _id: '3', 
        nickname: '苏婉清', 
        school: '复旦大学', 
        schoolShort: '复旦大学',
        birth_year: 1999, 
        age: 27,
        height: 165, 
        job: '法务咨询',
        city: '上海',
        degree: '硕士',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBF6Pwq1nHDORgSwl2gyvD5HlQsIwCIKgTVT2Rt160ijH6sJ3hEMa8w3vDzM-9uaVbp35oediX7zZ7XYxW5K-lCv7YBgTlsyE86g_NB4zAsDKz3IHxNm-DvGRpwarNmaxA_L-SSQ9Zz8mJvhcWa6CwvON3PIlEh3DTv2q-pbiXhmJhOJ4pkUbwQcYHeuOtNLZHwad7O80twea1mDTfnysKQJ8BHsCxWQpfK8qjIwLpWlh5Aufd_es744wdiE82EjC9e9jhLbwALS-g', 
        view_count: '856', 
        like_count: '215',
        isLiked: true
      },
      { 
        _id: '4', 
        nickname: '顾星洲', 
        school: '浙江大学', 
        schoolShort: '浙江大学',
        birth_year: 2001, 
        age: 25,
        height: 180, 
        job: '后端开发',
        city: '杭州',
        degree: '学士',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAy3ytHuEoYI-Twxrqn1G2fP-dmTdlVBGpVWpbGS7a8E5CUnmkVQvQWa5Imv1X3BjjC9kh7zqLK6vyDxsKClRp5V4l3KTB58HoYBzkpcoeL1kZ4D6TM2ynb6x9I2uJZ4theGEF8DT3Cd8NSb_DyMrDHreVj2y-uZvKzj9CyVLt6Id-BIGhU-xqOz84KHxmcwUDCSYbACSeh1QUe4_5sLcTuwmsiC_-iPdC-V7JDlvENUvcJ1eYyl-7gZiRFV1Ww-SNCu7dmUfaJjQo', 
        view_count: '3.1k', 
        like_count: '1.2k',
        isLiked: false
      }
    ]
    this.setData({ allList: mockData }, () => {
      this.applyFilters()
    })
  },

  formatRecommendItem(item) {
    const currentYear = new Date().getFullYear()
    const birthYear = item.birth_year || (currentYear - (item.age || 25))
    const schoolShort = item.school ? item.school.substring(0, 4) : '校友'
    
    return {
      ...item,
      birth_year: birthYear,
      schoolShort,
      degree: item.degree || '硕士',
      view_count: item.view_count || (Math.floor(Math.random() * 800) + 120) + '',
      like_count: item.like_count || (Math.floor(Math.random() * 80) + 20) + '',
      isLiked: item.isLiked || false
    }
  },

  onCardTap(e) {
    const { id } = e.currentTarget.dataset
    nav.navigateTo(`/pages/profile-detail/index?id=${id}`)
  },

  async onLikeToggle(e) {
    const { id } = e.currentTarget.dataset
    try {
      await api.like.send(id)
      this.updateLikeInState(id, true)
    } catch (err) {
      console.error('点赞操作失败:', err)
      this.updateLikeInState(id, null) // 本地直接取反切换状态
    }
  },

  updateLikeInState(id, overrideValue) {
    const updateItem = (item) => {
      if (item._id === id) {
        const nextLiked = overrideValue !== null ? overrideValue : !item.isLiked
        let currentLikeCount = parseFloat(item.like_count)
        if (isNaN(currentLikeCount)) {
          currentLikeCount = 100
        }
        const nextCount = nextLiked ? currentLikeCount + 1 : currentLikeCount - 1
        return { 
          ...item, 
          isLiked: nextLiked, 
          like_count: nextCount >= 1000 ? (nextCount / 1000).toFixed(1) + 'k' : nextCount.toString() 
        }
      }
      return item
    }

    const updatedAll = this.data.allList.map(updateItem)
    this.setData({ allList: updatedAll }, () => {
      this.applyFilters()
    })
  },

  // 触发筛选弹窗
  onFilterTap(e) {
    const { type } = e.currentTarget.dataset
    let filterTitle = ''
    switch (type) {
      case 'school': filterTitle = '学校'; break;
      case 'age': filterTitle = '年龄'; break;
      case 'hometown': filterTitle = '家乡'; break;
      case 'degree': filterTitle = '学历'; break;
    }
    this.setData({
      activeFilterType: type,
      filterTitle: filterTitle,
      showFilterPopup: true
    })
  },

  onCloseFilterPopup() {
    this.setData({
      showFilterPopup: false
    })
  },

  onSelectFilterOption(e) {
    const { value } = e.currentTarget.dataset
    const { activeFilterType } = this.data
    
    this.setData({
      [`filters.${activeFilterType}`]: value,
      showFilterPopup: false
    }, () => {
      this.applyFilters()
    })
  },

  // 综合筛选逻辑
  applyFilters() {
    const { allList, filters } = this.data
    let filtered = allList

    // 1. 学校筛选
    if (filters.school !== 'all') {
      filtered = filtered.filter(item => item.school === filters.school)
    }

    // 2. 年龄筛选
    if (filters.age !== 'all') {
      filtered = filtered.filter(item => {
        if (filters.age === '22-25') {
          return item.age >= 22 && item.age <= 25
        } else if (filters.age === '26-28') {
          return item.age >= 26 && item.age <= 28
        } else if (filters.age === '29+') {
          return item.age >= 29
        }
        return true
      })
    }

    // 3. 家乡/同城筛选
    if (filters.hometown !== 'all') {
      filtered = filtered.filter(item => item.city === filters.hometown)
    }

    // 4. 学历筛选
    if (filters.degree !== 'all') {
      filtered = filtered.filter(item => item.degree === filters.degree)
    }

    this.setData({
      list: filtered
    })
  },

  onSearchTap() {
    wx.showToast({
      title: '搜索功能开发中',
      icon: 'none'
    })
  },

  onBannerTap() {
    nav.navigateTo('/pages/event/list')
  }
})
