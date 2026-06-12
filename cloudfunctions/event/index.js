/**
 * 线下活动模块云函数 - 对接 Supabase 版
 * 处理：
 * 1. list: 获取活动列表
 * 2. detail: 获取活动详情（包含当前用户报名状态）
 * 3. register: 用户报名活动
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
    case 'list':
      return handleListEvents(openid, event)
    case 'detail':
      return handleEventDetail(openid, event)
    case 'register':
      return handleRegisterEvent(openid, event)
    default:
      return fail('未知的操作类型')
  }
}

/**
 * 获取活动列表
 */
async function handleListEvents(openid, event) {
  try {
    const { client } = await getSupabaseClientForUser(openid)

    // 查询所有 active/ended 状态的活动
    const { data: activities, error } = await client
      .from('xy_activities')
      .select('*')
      .in('status', ['active', 'ended'])
      .order('start_time', { ascending: false })

    if (error) {
      console.error('获取活动列表失败:', error)
      return fail('获取活动列表失败')
    }

    // 格式化为前端所需的格式
    const formatted = (activities || []).map(act => {
      const now = new Date()
      const endTime = new Date(act.end_time)
      // 如果已过活动结束时间，强行设为 ended 状态
      const status = (act.status === 'ended' || now >= endTime) ? 'ended' : 'recruiting'

      return {
        _id: act.id.toString(),
        title: act.title,
        cover: act.cover_url || '',
        status: status,
        dateTimeStr: formatEventTime(act.start_time, act.end_time),
        location: act.address,
        targetAudience: act.limit_school === 'all' ? '所有学校单身校友，本硕博学历' : `${act.limit_school}单身校友，本硕博学历`,
        attendingCount: act.current_participants,
        attendingAvatars: ['', '', ''] // 头像占位符
      }
    })

    return success(formatted)
  } catch (err) {
    console.error('获取活动列表异常:', err)
    return fail('获取活动列表异常')
  }
}

/**
 * 获取活动详情
 */
async function handleEventDetail(openid, event) {
  const { eventId } = event
  if (!eventId) {
    return fail('未指定活动ID')
  }

  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    // 1. 查询活动详情
    const { data: act, error } = await client
      .from('xy_activities')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error) {
      console.error('获取活动详情失败:', error)
      return fail('活动不存在')
    }

    // 2. 查询当前用户是否已报名
    const { data: registration } = await client
      .from('xy_activity_registrations')
      .select('id')
      .eq('activity_id', eventId)
      .eq('user_id', user.id)
      .limit(1)

    const registered = !!(registration && registration.length > 0)

    const now = new Date()
    const endTime = new Date(act.end_time)
    const status = (act.status === 'ended' || now >= endTime) ? 'ended' : 'recruiting'

    // 3. 组装详情数据
    const formatted = {
      _id: act.id.toString(),
      title: act.title,
      cover: act.cover_url || '',
      status: status,
      dateTimeStr: formatEventTime(act.start_time, act.end_time),
      location: act.address,
      latitude: 32.0718, // 默认南京鼓楼区坐标
      longitude: 118.8016,
      limitCount: act.max_participants,
      attendingCount: act.current_participants,
      fee: '免费',
      descriptionParagraphs: act.content ? act.content.split('\n') : [],
      registered: registered,
      attendees: [
        { nickname: '沈静姝', avatar: '', schoolShort: '南大硕士' },
        { nickname: '林逸尘', avatar: '', schoolShort: '东大本科' },
        { nickname: '苏婉清', avatar: '', schoolShort: '复旦硕士' }
      ] // 占位参与人员
    }

    return success(formatted)
  } catch (err) {
    console.error('获取活动详情异常:', err)
    return fail('获取活动详情异常')
  }
}

/**
 * 报名活动
 */
async function handleRegisterEvent(openid, event) {
  const { eventId } = event
  if (!eventId) {
    return fail('未指定活动ID')
  }

  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    // 1. 权限拦截：必须已认证用户才能报名活动
    const { data: myProfile, error: myProfileErr } = await client
      .from('xy_profiles')
      .select('status')
      .eq('user_id', user.id)
      .single()

    if (myProfileErr || myProfile.status !== 'verified') {
      return fail('为了保障严肃真实性，请先完成实名与学校认证以开启活动报名功能！', 403)
    }

    // 2. 检查活动是否可以报名
    const { data: act, error: queryErr } = await client
      .from('xy_activities')
      .select('*')
      .eq('id', eventId)
      .single()

    if (queryErr || !act) {
      return fail('活动不存在')
    }

    if (act.status === 'ended' || new Date() >= new Date(act.end_time)) {
      return fail('活动已结束，无法报名')
    }

    if (act.current_participants >= act.max_participants) {
      return fail('报名名额已满')
    }

    // 3. 写入报名表
    const { error: regErr } = await client
      .from('xy_activity_registrations')
      .insert({
        activity_id: eventId,
        user_id: user.id
      })

    if (regErr) {
      if (regErr.code === '23505') {
        return fail('您已报名过该活动，无需重复报名')
      }
      console.error('写入活动报名记录失败:', regErr)
      return fail('报名失败，请重试')
    }

    // 4. 更新活动报名人数
    await client
      .from('xy_activities')
      .update({
        current_participants: (act.current_participants || 0) + 1
      })
      .eq('id', eventId)

    return success(null, '报名成功！')
  } catch (err) {
    console.error('报名活动异常:', err)
    return fail('报名活动异常，请重试')
  }
}

/**
 * 格式化活动时间串
 */
function formatEventTime(startStr, endStr) {
  const start = new Date(startStr)
  const end = new Date(endStr)
  const pad = (n) => n.toString().padStart(2, '0')
  const startMonth = pad(start.getMonth() + 1)
  const startDay = pad(start.getDate())
  const startHours = pad(start.getHours())
  const startMins = pad(start.getMinutes())
  const endHours = pad(end.getHours())
  const endMins = pad(end.getMinutes())
  return `${startMonth}月${startDay}日 ${startHours}:${startMins} - ${endHours}:${endMins}`
}
