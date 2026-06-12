/**
 * 破冰与心动匹配模块云函数 - 对接 Supabase 版
 * 处理：
 * 1. getConfig: 获取当前用户设置的 3 个心动问题
 * 2. saveConfig: 保存当前用户的 3 个心动问题
 * 3. getQuestions: 获取目标用户的 3 个心动问题（用于答题）
 * 4. review: 审批收到的心动问答（接受/拒绝）
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { getSupabaseClientForUser } = require('../common/supabase')
const { success, fail, getOpenId } = require('../common/utils')

exports.main = async (event, context) => {
  const { action } = event
  const openid = getOpenId(context)

  if (!openid) {
    return fail('获取微信 OpenID 失败')
  }

  switch (action) {
    case 'getConfig':
      return handleGetConfig(openid)
    case 'saveConfig':
      return handleSaveConfig(openid, event)
    case 'getQuestions':
      return handleGetQuestions(openid, event)
    case 'review':
      return handleReview(openid, event)
    default:
      return fail('未知的操作类型')
  }
}

/**
 * 获取当前用户的破冰配置
 */
async function handleGetConfig(openid) {
  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    const { data: profile, error } = await client
      .from('xy_profiles')
      .select('icebreaker_questions')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('获取破冰问题失败:', error)
      return fail('获取配置失败')
    }

    return success(profile.icebreaker_questions || [])
  } catch (err) {
    console.error('获取破冰配置异常:', err)
    return fail('服务异常')
  }
}

/**
 * 保存当前用户的破冰配置
 */
async function handleSaveConfig(openid, event) {
  const { config } = event
  if (!Array.isArray(config) || config.length !== 3) {
    return fail('心动问题必须设置恰好 3 个')
  }

  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    const { error } = await client
      .from('xy_profiles')
      .update({
        icebreaker_questions: config
      })
      .eq('user_id', user.id)

    if (error) {
      console.error('保存心动问题失败:', error)
      return fail('保存失败，数据库写入异常')
    }

    return success(null, '心动问题设置成功！')
  } catch (err) {
    console.error('保存配置异常:', err)
    return fail('服务异常')
  }
}

/**
 * 获取目标用户的破冰问题
 */
async function handleGetQuestions(openid, event) {
  const { targetId } = event
  if (!targetId) {
    return fail('未指定目标用户ID')
  }

  try {
    const { client } = await getSupabaseClientForUser(openid)

    const { data: profile, error } = await client
      .from('xy_profiles')
      .select('icebreaker_questions')
      .eq('user_id', targetId)
      .single()

    if (error) {
      console.error('获取目标用户破冰问题失败:', error)
      return fail('获取破冰问题失败')
    }

    // 格式化为前端所需的结构：[{ id: 1, content: '...' }, { id: 2, content: '...' }]
    const formatted = (profile.icebreaker_questions || []).map((q, idx) => {
      return {
        id: idx + 1,
        content: q
      }
    })

    return success(formatted)
  } catch (err) {
    console.error('获取问题异常:', err)
    return fail('获取破冰问题异常')
  }
}

/**
 * 审核心动申请 (接受 / 拒绝)
 */
async function handleReview(openid, event) {
  const { sessionId, passed } = event // sessionId 即为 xy_heart_requests 的 id
  if (!sessionId) {
    return fail('未指定审批申请 ID')
  }

  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    const status = passed ? 'accepted' : 'rejected'

    // 更新心动申请状态，限制 receiver_id = user.id 确保只能审批发给自己的申请
    const { data: updatedReq, error } = await client
      .from('xy_heart_requests')
      .update({
        status: status,
        handle_time: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('receiver_id', user.id)
      .select()

    if (error) {
      console.error('审核心动申请失败:', error)
      return fail('审批失败，数据库写入异常')
    }

    if (!updatedReq || updatedReq.length === 0) {
      return fail('未找到对应的申请或无权进行审批')
    }

    return success(null, passed ? '已接受！互加微信成功' : '已委婉拒绝')
  } catch (err) {
    console.error('审核心动异常:', err)
    return fail('审批异常，服务出错')
  }
}
