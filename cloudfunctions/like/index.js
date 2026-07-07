/**
 * 互动与心动模块云函数 - 对接 Supabase 版
 * 处理：
 * 1. send (发送点赞/心动): 包含两种类型：
 *    - 简单点赞（无 context）：写入 xy_likes 表，触发器自动生成 xy_messages(like)
 *    - 答题心动（有 context）：写入 xy_heart_requests 表，触发器自动生成 xy_messages(crush)
 * 2. received (获取收到的通知)：合并点赞(like)和心动(crush)通知，并查询相应的答卷与状态
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
    case 'send':
      return handleSend(openid, event)
    case 'received':
      return handleGetReceived(openid, event)
    default:
      return fail('未知的操作类型')
  }
}

/**
 * 发送点赞或心动破冰回答
 */
async function handleSend(openid, event) {
  const { targetId, context } = event
  if (!targetId) {
    return fail('请指定目标用户')
  }

  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    // 1. 权限校验：当前用户必须是 verified 认证状态
    const { data: myProfile, error: myProfileErr } = await client
      .from('xy_profiles')
      .select('status')
      .eq('user_id', user.id)
      .single()

    if (myProfileErr || myProfile.status !== 'verified') {
      return fail('为了保障严肃真实性，请先完成实名与学校认证以开启匹配功能！', 403)
    }

    if (user.id === targetId) {
      return fail('您不能向自己发起点赞或心动')
    }

    // 2. 根据是否传入 context (破冰答案) 区分操作
    if (context && (typeof context === 'object')) {
      // 2.1 心动破冰分支
      // 提取破冰问题回答，整理成恰好 3 个元素的数组以满足约束
      const answersArray = [
        context['1'] || context[0] || '',
        context['2'] || context[1] || '',
        context['3'] || context[2] || ''
      ]

      if (answersArray.some(a => a.trim().length < 20)) {
        return fail('每个问题的回答不能少于 20 个字')
      }

      // 检查是否已存在未处理的心动申请
      const { data: existingCrush } = await client
        .from('xy_heart_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', targetId)
        .eq('status', 'pending')

      if (existingCrush && existingCrush.length > 0) {
        return fail('您已向该用户发起过心动，请耐心等待对方回应')
      }

      // 写入 xy_heart_requests 表，触发器会自动创建 type='crush' 的 xy_messages 记录
      const { error: insertErr } = await client
        .from('xy_heart_requests')
        .insert({
          sender_id: user.id,
          receiver_id: targetId,
          answers: answersArray,
          status: 'pending'
        })

      if (insertErr) {
        console.error('发起心动失败:', insertErr)
        return fail('发起心动失败，数据库写入异常')
      }

      return success(null, '发起心动成功，答案已发送！')

    } else {
      // 2.2 简单点赞分支
      // 写入 xy_likes 表，触发器会自动创建 type='like' 的 xy_messages 记录
      const { error: insertErr } = await client
        .from('xy_likes')
        .insert({
          sender_id: user.id,
          receiver_id: targetId
        })

      if (insertErr) {
        if (insertErr.code === '23505') {
          return success(null, '今天已经欣赏过 TA 啦，明天再来吧！')
        }
        console.error('点赞失败:', insertErr)
        return fail('点赞失败')
      }

      // 更新对方 likes_count (通过 RPC 原子自增)
      // 需在 Supabase 执行以下 SQL 创建函数：
      // CREATE OR REPLACE FUNCTION increment_likes_count(p_user_id UUID)
      // RETURNS VOID AS $$
      //   UPDATE xy_profiles SET likes_count = likes_count + 1 WHERE user_id = p_user_id;
      // $$ LANGUAGE SQL SECURITY DEFINER;
      try {
        await client.rpc('increment_likes_count', { p_user_id: targetId })
      } catch (rpcErr) {
        // RPC 函数尚未部署时降级：不影响点赞成功，likes_count 下次刷新时从 DB 聚合修正
        console.warn('increment_likes_count RPC 调用失败，likes_count 未同步更新:', rpcErr.message)
      }

      return success(null, '欣赏成功！')
    }
  } catch (err) {
    console.error('互动发送异常:', err)
    return fail('互动失败，服务异常')
  }
}

/**
 * 获取收到的通知消息（合并了 like 和 crush）
 */
async function handleGetReceived(openid, event) {
  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    // 1. 查询所有给当前用户的通知记录
    const { data: messages, error: msgErr } = await client
      .from('xy_messages')
      .select('*')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })

    if (msgErr) {
      console.error('获取通知消息失败:', msgErr)
      return fail('获取通知列表失败')
    }

    if (!messages || messages.length === 0) {
      return success([])
    }

    // 2. 批量获取发送人 ID 并查询他们的基本资料
    const senderIds = [...new Set(messages.map(m => m.sender_id))]
    const { data: profiles, error: profileErr } = await client
      .from('xy_profiles')
      .select('user_id, name, avatar_url, school, birth_year, wechat_id, phone')
      .in('user_id', senderIds)

    if (profileErr) {
      console.error('批量获取通知发送人资料失败:', profileErr)
      return fail('获取通知发送人资料失败')
    }

    const profileMap = {}
    if (profiles) {
      profiles.forEach(p => {
        profileMap[p.user_id] = p
      })
    }

    // 3. 收集所有心动申请 (crush) 的 ID，并批量拉取它们的问答状态与回答
    const crushRequestIds = messages
      .filter(m => m.type === 'crush' && m.heart_request_id)
      .map(m => m.heart_request_id)

    const heartRequestsMap = {}
    if (crushRequestIds.length > 0) {
      const { data: heartRequests, error: hrErr } = await client
        .from('xy_heart_requests')
        .select('*')
        .in('id', crushRequestIds)

      if (hrErr) {
        console.error('批量获取心动问答详情失败:', hrErr)
      } else if (heartRequests) {
        heartRequests.forEach(hr => {
          heartRequestsMap[hr.id] = hr
        })
      }
    }

    // 4. 组装整合数据返回给前端
    const formatted = messages.map(msg => {
      const sender = profileMap[msg.sender_id] || {}
      const currentYear = new Date().getFullYear()
      const age = sender.birth_year ? (currentYear - sender.birth_year) : 25

      const item = {
        _id: msg.id,
        sender_id: msg.sender_id,
        nickname: sender.name || '校友',
        avatar: sender.avatar_url || '',
        school: sender.school || '',
        age: age,
        is_read: msg.is_read,
        time: formatMsgTime(msg.created_at),
        type: msg.type
      }

      // 如果是心动消息，合并答题数据
      if (msg.type === 'crush') {
        const crushReq = heartRequestsMap[msg.heart_request_id]
        if (crushReq) {
          item.status = crushReq.status // pending, accepted, rejected
          item.heart_request_id = crushReq.id

          // 将数组形式转换为前端字段要求的对象形式
          if (crushReq.answers && crushReq.answers.length >= 3) {
            item.answers = {
              '1': crushReq.answers[0],
              '2': crushReq.answers[1],
              '3': crushReq.answers[2]
            }
          }

          // 如果互选成功，解锁并透露微信号
          if (crushReq.status === 'accepted') {
            item.wechatId = sender.wechat_id || '未填微信号'
            item.phone = sender.phone || ''
          }
        }
      }

      return item
    })

    // 5. 不再自动标记已读，由前端主动调用 markRead

    return success(formatted)
  } catch (err) {
    console.error('获取收到消息异常:', err)
    return fail('获取通知消息异常')
  }
}

/**
 * 批量标记消息为已读
 */
async function handleMarkRead(openid, event) {
  const { messageIds } = event
  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return fail('未指定要标记的消息')
  }

  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    const { error } = await client
      .from('xy_messages')
      .update({ is_read: true })
      .in('id', messageIds)
      .eq('receiver_id', user.id)

    if (error) {
      console.error('标记已读失败:', error)
      return fail('标记已读失败')
    }

    return success(null, '已标记为已读')
  } catch (err) {
    console.error('标记已读异常:', err)
    return fail('服务异常')
  }
}

/**
 * 格式化通知时间
 */
function formatMsgTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date

  if (diffMs < 60000) return '刚刚'
  
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}分钟前`

  const diffHours = Math.floor(diffMs / 3600000)
  if (diffHours < 24) {
    const hours = date.getHours().toString().padStart(2, '0')
    const mins = date.getMinutes().toString().padStart(2, '0')
    return `今天 ${hours}:${mins}`
  }

  const yesterday = new Date(now - 86400000)
  if (date.toDateString() === yesterday.toDateString()) {
    const hours = date.getHours().toString().padStart(2, '0')
    const mins = date.getMinutes().toString().padStart(2, '0')
    return `昨天 ${hours}:${mins}`
  }

  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${month}-${day}`
}
