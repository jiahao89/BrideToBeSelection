const { MARITAL_STATUS, MARITAL_LABELS, VERIFY_LABELS, MILESTONE_LABELS } = require('../../utils/constants')
const { calcAge } = require('../../utils/util')

Component({
  properties: {
    /** 用户资料数据 */
    profile: {
      type: Object,
      value: {},
      observer: '_parseProfile',
    },
    /** 认证状态列表 */
    verifications: {
      type: Array,
      value: [],
    },
    /** 媒人推荐语 */
    endorsement: {
      type: String,
      value: '',
    },
    /** 关系链路径文本 */
    relationPath: {
      type: String,
      value: '',
    },
    /** 当前里程碑 M1-M5 */
    milestone: {
      type: String,
      value: '',
    },
  },

  data: {
    nickname: '',
    age: '',
    gender: '',
    height: '',
    educationLabel: '',
    schoolDisplay: '',
    companyDisplay: '',
    incomeLabel: '',
    photoUrl: '',
    photoHidden: false,
    photoHiddenText: '',
    isUndisclosed: false,
    verifyTags: [],
    milestoneLabel: '',
  },

  lifetimes: {
    attached() {
      this._parseProfile()
      this._parseVerifications()
      this._parseMilestone()
    },
  },

  observers: {
    'verifications': function () {
      this._parseVerifications()
    },
    'milestone': function () {
      this._parseMilestone()
    },
  },

  methods: {
    _parseProfile() {
      const p = this.properties.profile
      if (!p || !p.gender) return

      const age = calcAge(p.birth_year)

      this.setData({
        nickname: p.nickname || p.name || '用户',
        age,
        gender: p.gender,
        height: p.height || '?',
        educationLabel: p.education_label || p.education || '',
        schoolDisplay: p.school_display || p.school || '',
        companyDisplay: p.company_display || p.company_type || '',
        incomeLabel: p.income_label || '',
        photoUrl: (p.photos && p.photos.length > 0) ? p.photos[0] : '',
        photoHidden: p.photo_hidden || false,
        photoHiddenText: p.photo_hidden_text || '照片仅互选后可见',
        isUndisclosed: p.marital_status === MARITAL_STATUS.UNDISCLOSED,
      })
    },

    _parseVerifications() {
      const verifications = this.properties.verifications || []
      const tags = verifications
        .filter(v => v.status === 'approved')
        .map(v => ({
          type: v.type,
          label: v.label || VERIFY_LABELS[v.type] || '已认证',
        }))

      this.setData({ verifyTags: tags })
    },

    _parseMilestone() {
      const ms = this.properties.milestone
      this.setData({
        milestoneLabel: ms ? MILESTONE_LABELS[ms] || ms : '',
      })
    },

    onCardTap() {
      this.triggerEvent('tap', { profile: this.properties.profile })
    },
  },
})
