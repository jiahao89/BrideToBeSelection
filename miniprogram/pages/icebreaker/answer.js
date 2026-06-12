const { api } = require('../../utils/api')
const { nav } = require('../../utils/util')

Page({
  data: {
    id: '',
    name: '对方',
    questions: [],
    answers: {},
    loading: false
  },

  onLoad(options) {
    const id = options.id || '1'
    const name = decodeURIComponent(options.name || '对方')
    this.setData({ id, name })
    this.fetchQuestions(id)
  },

  async fetchQuestions(id) {
    try {
      const data = await api.icebreaker.getQuestions(id)
      this.setData({ questions: data || [] })
    } catch (err) {
      console.error('获取破冰问题失败:', err)
      this.setData({
        questions: [
          { id: 1, content: '你理想中的周末是怎样度过的？' },
          { id: 2, content: '你对未来定居的城市有哪些规划？' }
        ]
      })
    }
  },

  onInput(e) {
    const { id } = e.currentTarget.dataset
    const { value } = e.detail
    const answers = { ...this.data.answers, [id]: value }
    this.setData({ answers })
  },

  async onSubmit() {
    // 检查答案字数限制
    const answersList = Object.values(this.data.answers)
    if (answersList.length < this.data.questions.length || answersList.some(a => a.trim().length < 20)) {
      wx.showToast({ title: '每个问题回答需至少20个字', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    try {
      // 提交答案发起心动
      await api.like.send(this.data.id, this.data.answers)
      wx.showToast({ title: '已发起心动！', icon: 'success' })
      setTimeout(() => {
        nav.switchTab('/pages/message/index')
      }, 1500)
    } catch (err) {
      console.error('提交心动失败:', err)
    } finally {
      this.setData({ loading: false })
    }
  }
})
