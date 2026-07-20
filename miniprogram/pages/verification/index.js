const { api } = require('../../utils/api')
const { nav } = require('../../utils/util')

Page({
  data: {
    // 当前进行到第几步 (1-5)
    step: 1,

    // 从 role-select 页传入的角色
    role: 'single_dog',

    // Step 1: 实名
    realName: '',
    idCard: '',

    // Step 2: 学历
    school: '',
    degree: 'master', // bachelor 本科 / master 硕士 / phd 博士
    studentId: '',
    major: '',
    grade: '',

    // Step 3: 工作
    company: '',
    job: '',

    // Step 4: 婚姻状况
    maritalStatus: '', // 'single' 未婚 / 'divorced' 离异 / 'widowed' 丧偶

    // Step 5: 个人资料
    birthday: '',
    constellation: '',
    wechatId: '',
    mobile: '',

    errorMsg: '',
    submitting: false,

    // 选择下拉菜单配置
    gradeOptions: ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012', '2011', '2010'],
    constellationOptions: ["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"]
  },

  onLoad(options) {
    if (options.role) {
      this.setData({ role: options.role })
    }
  },

  // Step 1 姓名与身份证号输入
  onInputRealName(e) {
    this.setData({
      realName: e.detail.value,
      errorMsg: e.detail.value.trim().length >= 2 ? '' : this.data.errorMsg
    })
  },

  onInputIdCard(e) {
    this.setData({
      idCard: e.detail.value,
      errorMsg: e.detail.value.length >= 15 ? '' : this.data.errorMsg
    })
  },

  // Step 2 毕业学校、学号、专业与入学年份选择
  onSelectUniversity() {
    const schools = ['南京大学', '江南大学', '东南大学', '复旦大学', '浙江大学']
    wx.showActionSheet({
      itemList: schools,
      success: (res) => {
        this.setData({
          school: schools[res.tapIndex],
          errorMsg: ''
        })
      }
    })
  },

  onSelectDegree(e) {
    const { value } = e.currentTarget.dataset
    this.setData({ degree: value })
  },

  onInputStudentId(e) {
    this.setData({
      studentId: e.detail.value,
      errorMsg: e.detail.value.trim().length > 0 ? '' : this.data.errorMsg
    })
  },

  onInputMajor(e) {
    this.setData({
      major: e.detail.value,
      errorMsg: e.detail.value.trim().length > 0 ? '' : this.data.errorMsg
    })
  },

  onGradeChange(e) {
    const val = this.data.gradeOptions[e.detail.value]
    this.setData({
      grade: val,
      errorMsg: ''
    })
  },

  // Step 3 公司与职位输入
  onInputCompany(e) {
    this.setData({
      company: e.detail.value,
      errorMsg: e.detail.value.trim().length > 0 ? '' : this.data.errorMsg
    })
  },

  onInputJob(e) {
    this.setData({
      job: e.detail.value,
      errorMsg: e.detail.value.trim().length > 0 ? '' : this.data.errorMsg
    })
  },

  // Step 4 婚姻状态选择
  onSelectMaritalStatus(e) {
    const { value } = e.currentTarget.dataset
    this.setData({
      maritalStatus: value,
      errorMsg: ''
    })
  },

  // Step 5 完善个人资料
  onBirthdayChange(e) {
    const bday = e.detail.value
    const parts = bday.split('-')
    const m = parseInt(parts[1])
    const d = parseInt(parts[2])
    const constellation = this._getConstellation(m, d)
    
    this.setData({
      birthday: bday,
      constellation: constellation,
      errorMsg: ''
    })
  },

  onConstellationChange(e) {
    const val = this.data.constellationOptions[e.detail.value]
    this.setData({
      constellation: val
    })
  },

  onInputWechatId(e) {
    this.setData({
      wechatId: e.detail.value,
      errorMsg: e.detail.value.trim().length > 0 ? '' : this.data.errorMsg
    })
  },

  onInputMobile(e) {
    this.setData({
      mobile: e.detail.value
    })
  },

  // 上一步（用于第5步回退）
  onPrev() {
    if (this.data.step > 1) {
      this.setData({
        step: this.data.step - 1,
        errorMsg: ''
      })
    }
  },

  // 跳转到上传证明页（备用流）
  onGoToUpload(e) {
    const { page } = e.currentTarget.dataset
    if (!getApp().checkGuest('上传证明')) return
    nav.navigateTo(`/pages/${page}/index?from=verification`)
  },

  // 跳过认证
  onSkip() {
    wx.showModal({
      title: '跳过认证',
      content: '跳过后您将处于访客模式，无法发起心动、查看详情或报名活动。确认要跳过吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          if (!app.globalData.userId) {
            app.globalData.userId = 'mock_visitor_user_id'
            app.globalData.profileCompleteness = 30
          }
          wx.switchTab({ url: '/pages/recommend/index' })
        }
      }
    })
  },

  // 解析身份证出生日期和星座
  _parseIdCard(idCard) {
    if (!idCard || idCard.length !== 18) return null
    try {
      const year = idCard.substring(6, 10)
      const month = idCard.substring(10, 12)
      const day = idCard.substring(12, 14)
      const birthday = `${year}-${month}-${day}`
      
      const m = parseInt(month)
      const d = parseInt(day)
      const constellation = this._getConstellation(m, d)
      
      return { birthday, constellation }
    } catch (e) {
      return null
    }
  },

  _getConstellation(month, day) {
    const dates = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22]
    const consts = ["摩羯座", "水瓶座", "双鱼座", "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座"]
    return day < dates[month - 1] ? consts[month - 1] : consts[month]
  },

  async onSubmit() {
    const { step } = this.data

    // 1. 实名认证校验 -> 步骤2
    if (step === 1) {
      const { realName, idCard } = this.data
      if (!realName || realName.trim().length < 2) {
        this.setData({ errorMsg: '请填写正确的真实姓名（最少2个字）' })
        return
      }
      const idReg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
      if (!idCard || !idReg.test(idCard)) {
        this.setData({ errorMsg: '请填写正确的身份证号' })
        return
      }

      // 自动解析身份证出生日期和星座并预填
      const parsed = this._parseIdCard(idCard)
      if (parsed) {
        this.setData({
          birthday: parsed.birthday,
          constellation: parsed.constellation
        })
      }

      this.setData({ step: 2, errorMsg: '' })
      return
    }

    // 2. 学历认证校验 -> 步骤3
    if (step === 2) {
      const { school, studentId, major, grade } = this.data
      if (!school) {
        this.setData({ errorMsg: '请选择您的毕业院校' })
        return
      }
      if (!studentId || studentId.trim().length === 0) {
        this.setData({ errorMsg: '请填写您的学号或学籍编号' })
        return
      }
      if (!major || major.trim().length === 0) {
        this.setData({ errorMsg: '请填写您的就读专业' })
        return
      }
      if (!grade) {
        this.setData({ errorMsg: '请选择您的入学年份' })
        return
      }

      this.setData({ step: 3, errorMsg: '' })
      return
    }

    // 3. 工作认证校验 -> 步骤4 (工作为选填项，直接进入下一步)
    if (step === 3) {
      this.setData({ step: 4, errorMsg: '' })
      return
    }

    // 4. 婚姻状况校验 -> 步骤5
    if (step === 4) {
      const { maritalStatus } = this.data
      if (!maritalStatus) {
        this.setData({ errorMsg: '请确认您当前的婚姻状态' })
        return
      }

      this.setData({ step: 5, errorMsg: '' })
      return
    }

    // 5. 完善资料提交 -> 接口提交
    if (step === 5) {
      const { wechatId, birthday, constellation, mobile } = this.data
      if (!wechatId || wechatId.trim().length === 0) {
        this.setData({ errorMsg: '微信号为必填项' })
        return
      }

      this.setData({ submitting: true })

      try {
        const degreeLabel = this.data.degree === 'bachelor' ? '本科' : (this.data.degree === 'master' ? '硕士' : '博士')
        const maritalLabel = this.data.maritalStatus === 'single' ? '未婚' : (this.data.maritalStatus === 'divorced' ? '离异' : (this.data.maritalStatus === 'widowed' ? '丧偶' : '暂不披露'))

        await api.user.uploadVerification({
          role: this.data.role,
          realName: this.data.realName,
          idCard: this.data.idCard,
          school: this.data.school,
          degree: degreeLabel,
          studentId: this.data.studentId,
          major: this.data.major,
          grade: this.data.grade,
          company: this.data.company,
          job: this.data.job,
          maritalStatus: maritalLabel,
          birthday: birthday,
          constellation: constellation,
          wechatId: wechatId,
          mobile: mobile
        })

        wx.showToast({
          title: '建档资料认证成功',
          icon: 'success',
          duration: 2000
        })

        // 更新本地 Me 面板的认证状态和资料完整度
        const app = getApp()
        app.globalData.isVerified = {
          identity: true,
          education: true,
          work: true
        }
        app.globalData.profileCompleteness = 95
        app.globalData.activeRole = app.globalData.activeRole || 'single'
        
        // 标记认证状态变更，mine 页面 onShow 时会重新拉取数据
        wx.setStorageSync('verification_updated', true)

        setTimeout(() => {
          wx.switchTab({ url: '/pages/recommend/index' })
        }, 2000)

      } catch (err) {
        console.error('提交认证失败:', err)
        wx.showToast({ title: '认证提交失败，请稍后重试', icon: 'none' })
      } finally {
        this.setData({ submitting: false })
      }
    }
  }
})
