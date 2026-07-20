const { api } = require('../../utils/api')

Page({
  data: {
    images: [],
    submitting: false,
    from: ''
  },

  onLoad(options) {
    if (options.from) {
      this.setData({ from: options.from })
    }
  },

  onChooseImage() {
    const remain = 2 - this.data.images.length
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 2 张', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newPaths = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ images: this.data.images.concat(newPaths) })
      }
    })
  },

  onDeleteImage(e) {
    const { index } = e.currentTarget.dataset
    const images = this.data.images.filter((_, i) => i !== Number(index))
    this.setData({ images })
  },

  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({ urls: [url] })
  },

  async onSubmit() {
    const { images } = this.data
    if (images.length === 0) {
      wx.showToast({ title: '请至少上传一张证明', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '上传中...', mask: true })

    try {
      const urls = []
      for (const filePath of images) {
        const cloudPath = `verifications/work/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
        const res = await wx.cloud.uploadFile({ cloudPath, filePath })
        urls.push(res.fileID)
      }

      await api.user.uploadVerification({
        verifyType: 'work_manual',
        imageUrls: urls
      })

      wx.hideLoading()
      wx.showToast({ title: '提交成功，等待人工审核', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      console.error('上传工作证明失败:', err)
      wx.hideLoading()
      wx.showToast({ title: '上传失败，请重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
