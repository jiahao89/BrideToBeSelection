const { api } = require('../../utils/api')
const { maskRecommendItem } = require('../../utils/desensitize')

Page({
  data: {
    loading: false,
    fetchError: false,
    list: [],
    allList: [],
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

    // 筛选选项配置
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

  _likeInProgress: false,

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
    const app = getApp()
    await app.waitForLogin()

    // 游客模式不发请求，显示空态
    if (app.globalData.isGuest) {
      this.setData({ allList: [], list: [] })
      return
    }

    this.setData({ loading: true, fetchError: false })
    try {
      const data = await api.recommend.daily()
      if (data && data.length > 0) {
        const formatted = data.map(item => this.formatRecommendItem(item))
        this.setData({ allList: formatted }, () => {
          this.applyFilters()
        })
      } else {
        this.setData({ allList: [], list: [] })
      }
    } catch (err) {
      console.error('获取推荐列表失败:', err)
      this.setData({ fetchError: true, allList: [], list: [] })
    } finally {
      this.setData({ loading: false })
    }
  },

  formatRecommendItem(item) {
    const currentYear = new Date().getFullYear()
    const birthYear = item.birth_year || (currentYear - (item.age || 25))
    const schoolShort = item.school ? item.school.substring(0, 4) : '校友'

    // 未学历认证的用户，对推荐卡片做脱敏处理（PRD 5.3）
    const app = getApp()
    const isEduVerified = app.globalData.isVerified && app.globalData.isVerified.education
    const safe = isEduVerified ? item : maskRecommendItem(item)

    return {
      ...safe,
      birth_year: birthYear,
      age: item.age || (currentYear - birthYear),
      schoolShort,
      // 映射后端字段名
      avatar: safe.avatar_url || (safe.photos && safe.photos[0]) || '',
      degree: item.degree || '',
      job: safe.job || safe.job_title || '',
      city: item.city || item.hometown || '',
      hometown: item.hometown || item.city || '',
      view_count: item.view_count != null ? String(item.view_count) : (item.views_count != null ? String(item.views_count) : '0'),
      like_count: item.like_count != null ? String(item.like_count) : (item.likes_count != null ? String(item.likes_count) : '0'),
      isLiked: item.isLiked || false,
      is_locked: item.is_locked || false
    }
  },

  onCardTap(e) {
    const { id, locked } = e.currentTarget.dataset
    if (locked) {
      wx.showToast({ title: '完成认证后解锁', icon: 'none' })
      return
    }
    // 传递触摸位置，用于详情页入场动画（共享元素过渡简化版）
    const touch = e.detail || {}
    const x = touch.x || (e.currentTarget.offsetLeft || 0)
    const y = touch.y || (e.currentTarget.offsetTop || 0)
    wx.navigateTo({ url: `/pages/profile-detail/index?id=${id}&fx=${x}&fy=${y}` })
  },

  async onLikeToggle(e) {
    // 游客拦截
    if (!getApp().checkGuest('点赞')) return
    // 防抖：一次只能处理一个点赞请求
    if (this._likeInProgress) return
    this._likeInProgress = true

    const { id } = e.currentTarget.dataset
    const prevAllList = this.data.allList
    const targetItem = prevAllList.find(item => item._id === id)
    if (!targetItem) {
      this._likeInProgress = false
      return
    }

    const wasLiked = targetItem.isLiked

    // 乐观更新：先切换 UI 状态
    this._updateLikeInState(id, !wasLiked)

    try {
      await api.like.send(id)
    } catch (err) {
      console.error('点赞操作失败，回滚状态:', err)
      // 回滚到操作前的状态
      this.setData({ allList: prevAllList }, () => {
        this.applyFilters()
      })
    } finally {
      this._likeInProgress = false
    }
  },

  _updateLikeInState(id, nextLiked) {
    const updatedAll = this.data.allList.map(item => {
      if (item._id === id) {
        let currentLikeCount = parseFloat(item.like_count) || 0
        const nextCount = nextLiked ? currentLikeCount + 1 : Math.max(0, currentLikeCount - 1)
        return {
          ...item,
          isLiked: nextLiked,
          like_count: nextCount >= 1000 ? (nextCount / 1000).toFixed(1) + 'k' : String(nextCount)
        }
      }
      return item
    })
    this.setData({ allList: updatedAll }, () => {
      this.applyFilters()
    })
  },

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
    this.setData({ showFilterPopup: false })
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

  applyFilters() {
    const { allList, filters } = this.data
    let filtered = allList

    if (filters.school !== 'all') {
      filtered = filtered.filter(item => item.school === filters.school)
    }

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

    if (filters.hometown !== 'all') {
      filtered = filtered.filter(item => item.city === filters.hometown)
    }

    if (filters.degree !== 'all') {
      filtered = filtered.filter(item => item.degree === filters.degree)
    }

    this.setData({ list: filtered })
  },

  onSearchTap() {
    wx.showToast({ title: '搜索功能开发中', icon: 'none' })
  },

  onBannerTap() {
    wx.switchTab({ url: '/pages/event/list' })
  }
})
