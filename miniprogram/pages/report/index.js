const { api } = require('../../utils/api')
const { nav } = require('../../utils/util')

Page({
  data: {
    targetId: '',
    targetName: '校友嘉宾',
    targetSchool: '已认证校友',
    targetAvatar: '',
    
    categories: ['信息虚假', '骚扰谩骂', '营销广告', '欺诈骗钱', '其它原因'],
    selectedCategory: 0,
    description: '',
    images: [],
    
    submitting: false,
    errorMsg: ''
  },

  onLoad(options) {
    const { id, name, school, avatar } = options
    this.setData({
      targetId: id || '',
      targetName: name || '校友嘉宾',
      targetSchool: school || '已通过实名认证',
      targetAvatar: avatar || ''
    })
  },

  onSelectCategory(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      selectedCategory: index,
      errorMsg: ''
    })
  },

  onInputDescription(e) {
    const value = e.detail.value
    this.setData({
      description: value,
      errorMsg: value.length >= 10 ? '' : this.data.errorMsg
    })
  },

  onChooseImage() {
    const remainCount = 3 - this.data.images.length
    if (remainCount <= 0) return

    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          images: this.data.images.concat(res.tempFilePaths)
        })
      }
    })
  },

  onDeleteImage(e) {
    const { index } = e.currentTarget.dataset
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({
      urls: this.data.images,
      current: url
    })
  },

  async onSubmit() {
    const { targetId, categories, selectedCategory, description, images } = this.data

    if (!description || description.trim().length < 10) {
      this.setData({
        errorMsg: '请详细填写举报原因（最少 10 字，当前已输入 ' + (description ? description.length : 0) + ' 字）'
      })
      return
    }

    this.setData({ submitting: true, errorMsg: '' })
    const reportType = categories[selectedCategory]

    try {
      // 上传图片到云存储
      let screenshotUrls = []
      if (images.length > 0) {
        wx.showLoading({ title: '上传凭证...', mask: true })
        for (const filePath of images) {
          try {
            const cloudPath = `reports/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
            const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath })
            screenshotUrls.push(uploadRes.fileID)
          } catch (uploadErr) {
            console.error('图片上传失败:', uploadErr)
          }
        }
        wx.hideLoading()
      }

      await api.safety.report(targetId || '', reportType, description, screenshotUrls)
      
      wx.showToast({ title: '已提交举报', icon: 'success', duration: 2000 })
      setTimeout(() => { wx.navigateBack() }, 2000)
    } catch (err) {
      console.error('举报提交失败:', err)
    } finally {
      this.setData({ submitting: false })
    }
  }
})
