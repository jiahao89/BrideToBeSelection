/**
 * 脱敏引擎工具
 * 对敏感字段进行脱敏处理，保护用户隐私
 */

const SENSITIVE_FIELDS = ['wechat_id', 'phone', 'real_name', 'company_detail', 'home_address']

/**
 * 脱敏策略映射
 */
const MASK_STRATEGIES = {
  phone: (val) => {
    if (!val || val.length < 7) return '***'
    return val.slice(0, 3) + '****' + val.slice(-4)
  },
  wechat_id: (_val) => '***已隐藏***',
  real_name: (val) => {
    if (!val) return '***'
    if (val.length <= 1) return '*'
    return val[0] + '*'.repeat(val.length - 1)
  },
  company_detail: (val) => {
    if (!val) return '***'
    // 只展示单位性质，如"大型国企"、"985高校"
    return '***已隐藏***'
  },
  home_address: (_val) => '***已隐藏***',
}

/**
 * 对单个字段进行脱敏
 * @param {string} field - 字段名
 * @param {string} value - 原始值
 * @returns {string} 脱敏后的值
 */
function maskField(field, value) {
  const strategy = MASK_STRATEGIES[field]
  if (strategy) {
    return strategy(value)
  }
  return value
}

/**
 * 对整个用户数据对象进行脱敏
 * 检查 authorizations 判断是否有权查看
 * @param {Object} userData - 用户数据
 * @param {string} viewerId - 查看者 ID
 * @param {Object} authorizations - 授权记录 { [field]: { granted: boolean, revoked: boolean } }
 * @returns {Object} 脱敏后的数据
 */
function maskUserData(userData, viewerId, authorizations = {}) {
  if (!userData) return null

  const masked = { ...userData }

  for (const field of SENSITIVE_FIELDS) {
    if (masked[field] === undefined) continue

    // 检查是否有有效授权
    const auth = authorizations[field]
    const isAuthorized = auth && auth.granted && !auth.revoked

    if (!isAuthorized) {
      masked[field] = maskField(field, masked[field])
      masked[`${field}_masked`] = true
    } else {
      masked[`${field}_masked`] = false
    }
  }

  return masked
}

/**
 * 根据梯度披露阶段决定可见字段
 * @param {Object} userData - 用户数据
 * @param {string} disclosureStage - 披露阶段 browsing / m1_matched / m2_exchanged
 * @returns {Object} 阶段对应可见数据
 */
function applyDisclosureStage(userData, disclosureStage) {
  if (!userData) return null

  const result = { ...userData }

  switch (disclosureStage) {
    case 'browsing':
      // 阶段一：仅展示基础脱敏信息
      delete result.self_intro
      delete result.partner_requirements
      delete result.child_info
      result.school = desensitizeSchool(result.school, result.education)
      result.company_detail = desensitizeCompany(result.company_type)
      result.real_name = undefined
      result.wechat_id = undefined
      result.phone = undefined
      result.home_address = undefined
      break

    case 'm1_matched':
      // 阶段二：展示详细资料，但联系方式仍隐藏
      result.wechat_id = '***互选成功，可申请交换***'
      result.phone = '***互选成功，可申请交换***'
      result.home_address = undefined
      // 子女信息仅在互选成功后可见
      break

    case 'm2_exchanged':
      // 阶段三：展示已授权的联系方式
      // 具体字段由 maskUserData 的 authorizations 控制
      break

    default:
      // 默认按浏览态处理
      return applyDisclosureStage(userData, 'browsing')
  }

  return result
}

/**
 * 学校脱敏：仅展示层次（985/211/高校）
 */
function desensitizeSchool(school, education) {
  if (!school) return education || '高校'
  // 这里可以维护一个 985/211 学校列表来精确匹配
  const is985 = ['东南大学', '南京大学', '北京大学', '清华大学', '复旦大学', '浙江大学',
    '上海交通大学', '中国科学技术大学', '哈尔滨工业大学', '西安交通大学',
    '中山大学', '武汉大学', '华中科技大学', '同济大学', '北京航空航天大学',
    '四川大学', '天津大学', '南开大学', '厦门大学', '山东大学'].includes(school)
  if (is985) return '985高校'
  return education || '高校'
}

/**
 * 单位脱敏：仅展示性质
 */
function desensitizeCompany(companyType) {
  const typeMap = {
    'state_enterprise': '大型国企',
    'government': '政府机关',
    'institution': '事业单位',
    'private_large': '知名民企',
    'private_medium': '民营企业',
    'foreign': '外资企业',
    'startup': '创业公司',
    'freelance': '自由职业',
    'other': '其他',
  }
  return typeMap[companyType] || '企业'
}

module.exports = {
  SENSITIVE_FIELDS,
  maskField,
  maskUserData,
  applyDisclosureStage,
  desensitizeSchool,
  desensitizeCompany,
}
