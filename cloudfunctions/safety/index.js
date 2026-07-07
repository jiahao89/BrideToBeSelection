/**
 * 安全模块云函数 - 对接 Supabase 版
 * 处理：report (提交举报)
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { getSupabaseClientForUser } = require('./common/supabase')
const { success, fail, getOpenId } = require('./common/utils')

exports.main = async (event, context) => {
  const { action } = event
  const openid = getOpenId(context)

  if (!openid) {
    return fail('获取微信 OpenID 失败')
  }

  switch (action) {
    case 'report':
      return handleReport(openid, event)
    default:
      return fail('未知的操作类型')
  }
}

/**
 * 提交用户举报
 */
async function handleReport(openid, event) {
  const { targetId, type, description } = event
  if (!targetId || !type) {
    return fail('缺少举报参数')
  }

  // 映射前端中文分类到数据库的 reason_category ENUM/CHECK 约束值
  let reasonCategory = 'other'
  if (type === '信息虚假' || type === '欺诈骗钱') {
    reasonCategory = 'fake_info'
  } else if (type === '骚扰谩骂') {
    reasonCategory = 'harassment'
  } else if (type === '营销广告') {
    reasonCategory = 'advertising'
  }

  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    const { error } = await client
      .from('xy_reports')
      .insert({
        reporter_id: user.id,
        reported_user_id: targetId || null,
        reason_category: reasonCategory,
        description: description || '',
        screenshot_urls: screenshotUrls || [],
        status: 'pending',
        handle_result: 'none'
      })

    if (error) {
      console.error('保存举报失败:', error)
      return fail('提交举报失败，数据库写入异常')
    }

    return success(null, '已提交举报，平台将尽快核实处理')
  } catch (err) {
    console.error('举报异常:', err)
    return fail('提交举报失败，服务出错')
  }
}
