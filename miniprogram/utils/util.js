/**
 * 通用工具函数
 */

/**
 * 格式化日期
 * @param {Date|string|number} date
 * @param {string} format - 'YYYY-MM-DD' | 'YYYY-MM-DD HH:mm' | 'MM月DD日'
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'YYYY-MM-DD HH:mm':
      return `${year}-${month}-${day} ${hour}:${minute}`
    case 'MM月DD日':
      return `${parseInt(month)}月${parseInt(day)}日`
    case 'MM月DD日 HH:mm':
      return `${parseInt(month)}月${parseInt(day)}日 ${hour}:${minute}`
    default:
      return `${year}-${month}-${day}`
  }
}

/**
 * 根据出生年份计算年龄
 */
function calcAge(birthYear) {
  if (!birthYear) return ''
  const currentYear = new Date().getFullYear()
  return currentYear - birthYear
}

/**
 * 计算资料完整度百分比
 * @param {Object} profile - 用户资料对象
 * @returns {number} 0-100
 */
function calcProfileCompleteness(profile) {
  if (!profile) return 0

  const requiredFields = [
    'gender', 'birth_year', 'height', 'education', 'school',
    'company_type', 'income_range', 'marital_status', 'self_intro',
  ]
  const optionalFields = [
    'department', 'hobbies', 'partner_requirements',
  ]
  const photoWeight = 20 // 照片占 20%

  let score = 0
  const requiredWeight = 60 / requiredFields.length
  const optionalWeight = 20 / optionalFields.length

  for (const field of requiredFields) {
    if (profile[field]) score += requiredWeight
  }
  for (const field of optionalFields) {
    if (profile[field]) score += optionalWeight
  }
  if (profile.photos && profile.photos.length > 0) {
    score += photoWeight
  }

  return Math.round(Math.min(score, 100))
}

/**
 * 生成随机邀请码
 * @param {number} length
 */
function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 去除易混淆字符
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * 防抖
 */
function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

/**
 * 节流
 */
function throttle(fn, interval = 1000) {
  let lastTime = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= interval) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

/**
 * 图片上传到云存储
 * @param {string} filePath - 本地临时文件路径
 * @param {string} cloudDir - 云存储目录
 * @returns {Promise<string>} 云文件ID
 */
async function uploadImage(filePath, cloudDir = 'photos') {
  const ext = filePath.split('.').pop()
  const cloudPath = `${cloudDir}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const res = await wx.cloud.uploadFile({
    cloudPath,
    filePath,
  })

  return res.fileID
}

/**
 * 选择并上传图片
 * @param {Object} options
 * @param {number} options.count - 最多选择几张
 * @param {string} options.cloudDir - 云存储目录
 * @returns {Promise<string[]>} 云文件ID列表
 */
async function chooseAndUploadImages(options = {}) {
  const { count = 1, cloudDir = 'photos' } = options

  const chooseRes = await wx.chooseMedia({
    count,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    sizeType: ['compressed'],
  })

  const uploadPromises = chooseRes.tempFiles.map(file =>
    uploadImage(file.tempFilePath, cloudDir)
  )

  return Promise.all(uploadPromises)
}

/**
 * 显示确认对话框
 */
function showConfirm(title, content) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmColor: '#00538B',
      success: (res) => resolve(res.confirm),
    })
  })
}

/**
 * 页面导航封装
 */
const nav = {
  to: (url) => wx.navigateTo({ url }),
  navigateTo: (url) => wx.navigateTo({ url }),
  redirect: (url) => wx.redirectTo({ url }),
  back: (delta = 1) => wx.navigateBack({ delta }),
  switchTab: (url) => wx.switchTab({ url }),
  reLaunch: (url) => wx.reLaunch({ url }),
}

module.exports = {
  formatDate,
  calcAge,
  calcProfileCompleteness,
  generateCode,
  debounce,
  throttle,
  uploadImage,
  chooseAndUploadImages,
  showConfirm,
  nav,
}
