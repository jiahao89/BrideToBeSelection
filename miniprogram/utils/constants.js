/**
 * 常量定义
 * 集中管理所有枚举值和配置常量
 */

// 用户角色
const ROLES = {
  SELF: 'self',             // 本人相亲
  PARENT: 'parent',         // 父母代办
  MATCHMAKER: 'matchmaker', // 媒人/红娘
  ORGANIZER: 'organizer',   // 组织者
  VOLUNTEER: 'volunteer',   // 志愿者
}

const ROLE_LABELS = {
  [ROLES.SELF]: '本人相亲',
  [ROLES.PARENT]: '父母代办',
  [ROLES.MATCHMAKER]: '媒人/红娘',
  [ROLES.ORGANIZER]: '活动组织者',
  [ROLES.VOLUNTEER]: '志愿者',
}

// 用户状态
const USER_STATUS = {
  ACTIVE: 'active',
  FROZEN: 'frozen',       // 临时冻结
  BANNED: 'banned',       // 永久封禁
  PENDING: 'pending',     // 待审核
}

// 志愿者模式
const VOLUNTEER_MODE = {
  WORK: 'work',           // 工作模式
  CANDIDATE: 'candidate', // 候选人模式
}

// 认证类型
const VERIFY_TYPE = {
  IDENTITY: 'identity',   // 实名认证
  EDUCATION: 'education', // 学历认证
  WORK: 'work',           // 工作认证
}

const VERIFY_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  BLACKLISTED: 'blacklisted',
}

const VERIFY_LABELS = {
  identity: '实名已核',
  education: '学历已核',
  work: '工作已核',
}

// 婚史状态
const MARITAL_STATUS = {
  UNMARRIED: 'unmarried',                 // 未婚
  DIVORCED_NO_CHILD: 'divorced_no_child', // 有婚史无子女
  DIVORCED_WITH_CHILD: 'divorced_with_child', // 有婚史有子女
  WIDOWED: 'widowed',                     // 丧偶
  UNDISCLOSED: 'undisclosed',             // 暂不披露
}

const MARITAL_LABELS = {
  [MARITAL_STATUS.UNMARRIED]: '未婚',
  [MARITAL_STATUS.DIVORCED_NO_CHILD]: '有婚史无子女',
  [MARITAL_STATUS.DIVORCED_WITH_CHILD]: '有婚史有子女',
  [MARITAL_STATUS.WIDOWED]: '丧偶',
  [MARITAL_STATUS.UNDISCLOSED]: '暂不披露',
}

// 学历
const EDUCATION_LEVELS = [
  { value: 'phd', label: '博士' },
  { value: 'master', label: '硕士' },
  { value: 'bachelor', label: '本科' },
  { value: 'associate', label: '大专' },
  { value: 'other', label: '其他' },
]

// 收入区间
const INCOME_RANGES = [
  { value: 'below_10', label: '10万以下' },
  { value: '10_20', label: '10-20万' },
  { value: '20_30', label: '20-30万' },
  { value: '30_50', label: '30-50万' },
  { value: '50_100', label: '50-100万' },
  { value: 'above_100', label: '100万以上' },
  { value: 'undisclosed', label: '暂不透露' },
]

// 单位性质
const COMPANY_TYPES = [
  { value: 'state_enterprise', label: '国有企业' },
  { value: 'government', label: '政府机关' },
  { value: 'institution', label: '事业单位' },
  { value: 'private_large', label: '知名民企' },
  { value: 'private_medium', label: '民营企业' },
  { value: 'foreign', label: '外资企业' },
  { value: 'startup', label: '创业公司' },
  { value: 'freelance', label: '自由职业' },
  { value: 'other', label: '其他' },
]

// 里程碑阶段
const MILESTONES = {
  M1: 'M1', // 互选成功
  M2: 'M2', // 交换联系方式
  M3: 'M3', // 线下约见
  M4: 'M4', // 确定恋爱关系
  M5: 'M5', // 步入婚姻
}

const MILESTONE_LABELS = {
  [MILESTONES.M1]: '互选成功',
  [MILESTONES.M2]: '交换联系方式',
  [MILESTONES.M3]: '线下约见',
  [MILESTONES.M4]: '确定恋爱关系',
  [MILESTONES.M5]: '步入婚姻',
}

// 破冰问答阶段
const ICEBREAKER_STAGES = {
  STAGE_1: 1, // 基础择偶标准检测
  STAGE_2: 2, // 三观单选题
  STAGE_3: 3, // 开放式问答
}

// 举报类型
const REPORT_TYPES = [
  { value: 'harassment', label: '骚扰' },
  { value: 'fake_info', label: '隐瞒婚史/资料造假' },
  { value: 'scam', label: '诈骗' },
  { value: 'marketing', label: '推销/广告' },
  { value: 'other', label: '其他' },
]

// 父母动作类型
const PARENT_ACTION_TYPES = {
  LIKE: 'like',
  VIEW_SENSITIVE: 'view_sensitive',
  EVENT_REGISTER: 'event_register',
}

// 活动状态
const EVENT_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',     // 报名中
  CLOSED: 'closed', // 报名结束
  ONGOING: 'ongoing', // 进行中
  ENDED: 'ended',   // 已结束
}

// 每日限制
const DAILY_LIMITS = {
  FREE_LIKES: 5,
  MEMBER_LIKES: 20,
  DAILY_RECOMMENDATIONS: 5,
}

// 资料卡照片可见性
const PHOTO_VISIBILITY = {
  PUBLIC: 'public',           // 公开
  AFTER_MATCH: 'after_match', // 互选后可见
  ON_REQUEST: 'on_request',   // 请求后可见
}

module.exports = {
  ROLES, ROLE_LABELS,
  USER_STATUS,
  VOLUNTEER_MODE,
  VERIFY_TYPE, VERIFY_STATUS, VERIFY_LABELS,
  MARITAL_STATUS, MARITAL_LABELS,
  EDUCATION_LEVELS, INCOME_RANGES, COMPANY_TYPES,
  MILESTONES, MILESTONE_LABELS,
  ICEBREAKER_STAGES,
  REPORT_TYPES,
  PARENT_ACTION_TYPES,
  EVENT_STATUS,
  DAILY_LIMITS,
  PHOTO_VISIBILITY,
}
