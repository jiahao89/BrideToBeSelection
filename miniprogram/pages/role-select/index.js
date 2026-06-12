const { nav } = require('../../utils/util')

Page({
  data: {
    selectedRole: '',
  },

  onSelectRole(e) {
    const role = e.currentTarget.dataset.role
    this.setData({ selectedRole: role })
  },

  onNext() {
    if (!this.data.selectedRole) {
      wx.showToast({ title: '请选择一个身份', icon: 'none' })
      return
    }

    nav.to(`/pages/verification/index?role=${this.data.selectedRole}`)
  },
})
