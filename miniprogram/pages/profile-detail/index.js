const { api } = require('../../utils/api')
const { nav } = require('../../utils/util')

Page({
  data: {
    loading: false,
    id: '',
    guest: null,
  },

  onLoad(options) {
    const id = options.id || '1'
    this.setData({ id })
    this.fetchData(id)
  },

  async fetchData(id) {
    this.setData({ loading: true })
    try {
      const data = await api.user.getProfile(id)
      // API 返回 { profile: {...}, verifications: [...], endorsements: [] }
      const profile = (data && data.profile) ? data.profile : (data || {})
      this.setData({ guest: this.formatGuest(profile) })
    } catch (err) {
      console.error('获取详情失败:', err)
      
      // 动态根据 ID 展现对应嘉宾的数据，以跟推荐页完全一致
      const mockProfiles = {
        '1': {
          _id: '1',
          nickname: '沈静姝',
          school: '南京大学',
          degree: '硕士',
          birth_year: 2000,
          age: 26,
          height: 163,
          hometown: '江苏无锡',
          role: '单身校友',
          avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBj1iILsmZ8lMcnuqGX4OeZL8ulIC7dajUDqvUyLcV_R0I9t4GYgrnEQpeKzIH4zdrXCV-28cEHMr1NsbK4Z052J-_s1HqhmT_wwQSnPgZT-3CVxBU3Fnyissl6SgcbuCiJwAEG3dFhEhGln0XuUpLvCsOrDEfaggdu-Ia-y5igmqVp7WqqBC13zVNvHjQyYx0ZU3fLiwNMDcii4erFfuzG8GK9x0xOpwLKTX70GBrIxqiJMT5EBMo9siGmz1N45qeQ2t2ZVuNmu6Y',
          marital_status: '未婚',
          verified: true,
          questions: [
            { id: 1, content: '你理想中的周末是怎样度过的？' },
            { id: 2, content: '你对未来定居的城市有哪些规划？' }
          ]
        },
        '2': {
          _id: '2',
          nickname: '林逸尘',
          school: '江南大学',
          degree: '本科',
          birth_year: 2002,
          age: 24,
          height: 178,
          hometown: '江苏无锡',
          role: '单身校友',
          avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqHyee-miviQ1oWG7HBMA0_Aqtz-TZvGCMV58LEcRUAGLvL9I8dgD95RGiT0Cx17GhARdo5NQ6L18H4qNBr7JLnzJ59lQaMf3lyvYPdIjPrYjTPCTj2MY-zOCH_TdpTMLTDr3wVQ5kU_cNwUfq3fvkW3J1scyfLdZ7N8DV467VrOLTpBaIWHHWoEjGxMW6IlMcjerRPlnvpcWCT6iC0OirJqI9zgC3nbsAfvXYcpWiEzMGmXM-2wUTK8vjBxQynARnoV6Wu0VWXoU',
          marital_status: '未婚',
          verified: true,
          questions: [
            { id: 1, content: '你理想中的周末是怎样度过的？' }
          ]
        },
        '3': {
          _id: '3',
          nickname: '苏婉清',
          school: '复旦大学',
          degree: '硕士',
          birth_year: 1999,
          age: 27,
          height: 165,
          hometown: '上海黄浦',
          role: '单身校友',
          avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBF6Pwq1nHDORgSwl2gyvD5HlQsIwCIKgTVT2Rt160ijH6sJ3hEMa8w3vDzM-9uaVbp35oediX7zZ7XYxW5K-lCv7YBgTlsyE86g_NB4zAsDKz3IHxNm-DvGRpwarNmaxA_L-SSQ9Zz8mJvhcWa6CwvON3PIlEh3DTv2q-pbiXhmJhOJ4pkUbwQcYHeuOtNLZHwad7O80twea1mDTfnysKQJ8BHsCxWQpfK8qjIwLpWlh5Aufd_es744wdiE82EjC9e9jhLbwALS-g',
          marital_status: '未婚',
          verified: true,
          questions: [
            { id: 1, content: '你理想中的周末是怎样度过的？' },
            { id: 2, content: '你对未来定居的城市有哪些规划？' }
          ]
        },
        '4': {
          _id: '4',
          nickname: '顾星洲',
          school: '浙江大学',
          degree: '本科',
          birth_year: 2001,
          age: 25,
          height: 180,
          hometown: '浙江杭州',
          role: '单身校友',
          avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZf5v0G4zeqKBiVIfV_-GFQa-PtD5VjU6yFhl7Yrh3rfHqyGhLJ0lvFOn7-zq3NGNVC9iwfGfObnrnZZmMC4rDI22ohJDb7YU1N-IreGtDa-Ts1hsGLu_k3swEU3uOn9Rau8TZGN0jgLi0TeqZeXYIMausC1pg9Dpp33wlh-8_jRIjXL-vlMrqkJOTxvH3PS44AULt2HIzY2pwizbOG8t5ewCWi6RKi_FtLCGsVWggu785gl5NbLCsXe-O5UmXunQcH4K9ZpxnOgc',
          marital_status: '未婚',
          verified: true,
          questions: [
            { id: 1, content: '你最喜欢的一本书或一部电影是什么？' }
          ]
        }
      }

      const selected = mockProfiles[id] || mockProfiles['1']
      this.setData({ guest: selected })
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
      age
    }
  },

  async onLikeTap() {
    try {
      await api.like.send(this.data.id)
      wx.showToast({ title: '点赞同频成功', icon: 'success' })
    } catch (err) {
      console.error('点赞失败:', err)
    }
  },

  onCrushTap() {
    const name = this.data.guest ? this.data.guest.nickname : '对方'
    nav.navigateTo(`/pages/icebreaker/answer?id=${this.data.id}&name=${encodeURIComponent(name)}`)
  }
})
