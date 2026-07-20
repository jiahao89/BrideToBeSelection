const { api } = require('../../utils/api')

Page({
  data: {
    frontImage: '',
    backImage: '',
    submitting: false,
    from: ''
  },

  onLoad(options) {
    if (options.from) {
      this.setData({ from: options.from })
    }
  },

  onChooseImage(e) {
    const { type } = e.currentTarget.dataset
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ [type]: tempPath })
      }
    })
  },

  onDeleteImage(e) {
    const { type } = e.currentTarget.dataset
    this.setData({ [type]: '' })
  },

  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({ urls: [url] })
  },

  async onSubmit() {
    const { frontImage, backImage } = this.data
    if (!frontImage) {
      wx.showToast({ title: '请上传身份证人像面', icon: 'none' })
      return
    }
    if (!backImage) {
      wx.showToast({ title: '请上传身份证国徽面', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '上传中...', mask: true })

    try {
      const urls = []
      // 上传人像面
      const frontPath = `verifications/identity/${Date.now()}-front.jpg`
      const frontRes = await wx.cloud.uploadFile({ cloudPath: frontPath, filePath: frontImage })
      urls.push(frontRes.fileID)

      // 上传国徽面
      const backPath = `verifications/identity/${Date.now()}-back.jpg`
      const backRes = await wx.cloud.uploadFile({ cloudPath: backPath, filePath: backImage })
      urls.push(backRes.fileID)

      // 调用云函数保存审核记录
      await api.user.uploadVerification({
        verifyType: 'identity_manual',
        imageUrls: urls
      })

      wx.hideLoading()
      wx.showToast({ title: '提交成功，等待人工审核', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      console.error('上传身份证明失败:', err)
      wx.hideLoading()
      wx.showToast({ title: '上传失败，请重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
