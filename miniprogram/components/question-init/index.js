const { api } = require('../../utils/api')

Component({
  properties: {
    show: { type: Boolean, value: false }
  },
  data: {
    questions: ['', '', ''],
    presets: [
      '你理想中的周末是怎样度过的？',
      '你对未来 3 年的城市规划是什么？',
      '你最喜欢的旅行目的地是哪里？',
      '你如何看待工作与生活的平衡？',
      '你最近在读的一本书或看的一部电影？',
      '你的家人对你来说意味着什么？'
    ],
    submitting: false
  },
  methods: {
    onInputQuestion(e) {
      const idx = e.currentTarget.dataset.idx
      const questions = [...this.data.questions]
      questions[idx] = e.detail.value
      this.setData({ questions })
    },
    onUsePreset() {
      // Randomly pick 3 from presets
      const shuffled = [...this.data.presets].sort(() => Math.random() - 0.5)
      this.setData({ questions: shuffled.slice(0, 3) })
    },
    async onSubmit() {
      const { questions, submitting } = this.data
      if (submitting) return

      // Validate: all 3 must be non-empty and at least 5 chars
      for (let i = 0; i < 3; i++) {
        if (!questions[i] || questions[i].trim().length < 5) {
          wx.showToast({ title: `第${i + 1}个问题至少5个字`, icon: 'none' })
          return
        }
      }

      this.setData({ submitting: true })
      try {
        await api.user.updateProfile({ icebreaker_questions: questions })
        wx.showToast({ title: '心动问题已保存', icon: 'success' })
        this.triggerEvent('saved')
      } catch (err) {
        console.error('保存心动问题失败:', err)
      } finally {
        this.setData({ submitting: false })
      }
    }
  }
})
