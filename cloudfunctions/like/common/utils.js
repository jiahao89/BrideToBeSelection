/**
 * 云函数公共工具层
 * 统一响应格式、权限校验和错误处理
 */

const cloud = require('wx-server-sdk')

/**
 * 成功响应
 */
function success(data = null, message = 'ok') {
  return { success: true, message, data }
}

/**
 * 失败响应
 */
function fail(message = '操作失败', code = 400) {
  return { success: false, message, code }
}

/**
 * 获取当前用户 openid
 */
function getOpenId(context) {
  const wxContext = cloud.getWXContext()
  return wxContext.OPENID
}

/**
 * 权限校验：检查用户是否具有指定角色
 * @param {Object} db - 数据库引用
 * @param {string} openid
 * @param {string|string[]} requiredRoles - 需要的角色
 * @returns {Object|null} 用户记录或 null
 */
async function checkRole(db, openid, requiredRoles) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

  const userRes = await db.collection('users').where({ openid }).get()
  if (!userRes.data || userRes.data.length === 0) return null

  const user = userRes.data[0]
  if (user.status === 'banned' || user.status === 'frozen') return null

  const hasRole = user.roles.some(r => roles.includes(r))
  if (!hasRole) return null

  return user
}

/**
 * 检查用户认证状态
 */
async function checkVerification(db, userId, types = ['identity']) {
  const result = {}
  for (const type of types) {
    const res = await db.collection('verifications')
      .where({ user_id: userId, type, status: 'approved' })
      .limit(1)
      .get()
    result[type] = res.data.length > 0
  }
  return result
}

/**
 * 检查用户是否被拉黑
 */
async function isBlocked(db, userId, targetId) {
  const res = await db.collection('blocks')
    .where({
      blocker_id: targetId,
      blocked_id: userId,
    })
    .limit(1)
    .get()
  return res.data.length > 0
}

/**
 * 检查婚史是否暂不披露（限制功能）
 */
async function isMaritalUndisclosed(db, userId) {
  const res = await db.collection('profiles')
    .where({ user_id: userId })
    .field({ marital_status: true })
    .limit(1)
    .get()
  if (!res.data || res.data.length === 0) return false
  return res.data[0].marital_status === 'undisclosed'
}

/**
 * 记录操作日志
 */
async function logAction(db, action, details) {
  try {
    await db.collection('action_logs').add({
      data: {
        action,
        ...details,
        created_at: db.serverDate(),
      },
    })
  } catch (e) {
    console.error('日志记录失败:', e)
  }
}

module.exports = {
  success,
  fail,
  getOpenId,
  checkRole,
  checkVerification,
  isBlocked,
  isMaritalUndisclosed,
  logAction,
}
