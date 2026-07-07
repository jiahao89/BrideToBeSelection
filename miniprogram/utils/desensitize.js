/**
 * 脱敏引擎工具 (PRD 5.3 规范)
 * 对未认证用户看到的敏感字段进行脱敏处理
 */

/**
 * 姓名脱敏：张三 → 张*，欧阳娜娜 → 欧阳**
 */
function maskName(name) {
  if (!name) return ''
  if (name.length <= 1) return '*'
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 1)
}

/**
 * 学校脱敏：南京大学 → 南*大学，江南大学 → 江*大学
 */
function maskSchool(school) {
  if (!school) return ''
  if (school.length <= 2) return school[0] + '*'
  return school[0] + '*'.repeat(school.length - 2) + school[school.length - 1]
}

/**
 * 公司脱敏：腾讯科技 → 腾*科技
 */
function maskCompany(company) {
  if (!company) return ''
  if (company.length <= 2) return company[0] + '*'
  return company[0] + '*'.repeat(company.length - 2) + company[company.length - 1]
}

/**
 * 手机号脱敏：13812345678 → 138****5678
 */
function maskPhone(phone) {
  if (!phone || phone.length < 7) return '***'
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

/**
 * 微信号脱敏
 */
function maskWechat() {
  return '***认证后解锁***'
}

/**
 * 自我介绍脱敏
 */
function maskIntro() {
  return '【认证后解锁完整信息】'
}

/**
 * 对推荐列表卡片数据执行脱敏
 * @param {Object} item - 单个推荐卡片数据
 * @returns {Object} 脱敏后的数据
 */
function maskRecommendItem(item) {
  if (!item) return item
  return {
    ...item,
    nickname: maskName(item.nickname),
    school: maskSchool(item.school),
    company: maskCompany(item.company),
    job: '校友',
    self_intro: maskIntro(),
    wechat_id: undefined,
    phone: undefined
  }
}

/**
 * 对嘉宾详情页数据执行脱敏
 */
function maskProfileDetail(data) {
  if (!data) return data
  return {
    ...data,
    nickname: maskName(data.nickname),
    school: maskSchool(data.school),
    company: maskCompany(data.company),
    self_intro: maskIntro(),
    partner_requirements: '【认证后解锁完整信息】',
    wechat_id: undefined,
    phone: undefined
  }
}

module.exports = {
  maskName,
  maskSchool,
  maskCompany,
  maskPhone,
  maskWechat,
  maskIntro,
  maskRecommendItem,
  maskProfileDetail,
}
