// 匹配成功弹窗组件
Component({
  properties: {
    /** 是否显示弹窗 */
    show: {
      type: Boolean,
      value: false,
    },
    /** 匹配用户头像 */
    avatar: {
      type: String,
      value: '',
    },
    /** 匹配用户昵称 */
    nickname: {
      type: String,
      value: '',
    },
    /** 对方微信号 */
    wechatId: {
      type: String,
      value: '',
    },
  },

  data: {
    // 当前用户头像（自动从 globalData 读取，失败时回退到默认头像）
    currentAvatar: '/assets/images/default-avatar.png',
  },

  lifetimes: {
    attached() {
      this._resolveCurrentAvatar()
    },
  },

  observers: {
    // 每次弹出时刷新当前用户头像，保证资料更新后即时生效
    'show': function (val) {
      if (val) this._resolveCurrentAvatar()
    },
  },

  methods: {
    /**
     * 从 app.globalData.userInfo 读取当前用户头像
     * 兼容多种字段命名，读取失败时保持默认头像
     */
    _resolveCurrentAvatar() {
      let url = ''
      try {
        const info = getApp().globalData.userInfo
        if (info) {
          url = info.avatar || info.avatarUrl || info.photoUrl ||
            (Array.isArray(info.photos) && info.photos[0]) || ''
        }
      } catch (e) {
        url = ''
      }
      this.setData({
        currentAvatar: url || '/assets/images/default-avatar.png',
      })
    },

    /**
     * 复制对方微信号到剪贴板，成功后触发 close 事件
     */
    onCopyWechat() {
      const wechatId = this.properties.wechatId
      if (!wechatId) {
        this.triggerEvent('close')
        return
      }
      wx.setClipboardData({
        data: wechatId,
        success: () => {
          this.triggerEvent('close')
        },
      })
    },

    /**
     * 关闭弹窗
     */
    onClose() {
      this.triggerEvent('close')
    },
  },
})
