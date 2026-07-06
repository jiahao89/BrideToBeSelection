/**
 * 推荐模块云函数 - 对接 Supabase 版
 * 处理：daily (每日推荐列表)
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
    case 'daily':
      return handleDailyRecommend(openid, event)
    default:
      return fail('未知的操作类型')
  }
}

/**
 * 获取每日推荐列表
 */
async function handleDailyRecommend(openid, event) {
  try {
    // Step 1: Supabase Auth 登录
    console.log('[recommend] Step1: 获取 Supabase 客户端, openid:', openid.substring(0, 8) + '...')
    let client, user
    try {
      const result = await getSupabaseClientForUser(openid)
      client = result.client
      user = result.user
      console.log('[recommend] Step1: Supabase Auth 成功, user.id:', user.id)
    } catch (authErr) {
      console.error('[recommend] Step1 FAIL: Supabase Auth 失败:', authErr.message || authErr)
      return fail('Supabase 认证失败: ' + (authErr.message || '未知错误'))
    }

    // Step 2: 获取当前用户资料
    console.log('[recommend] Step2: 查询当前用户资料, user_id:', user.id)
    const { data: myProfile, error: myProfileErr } = await client
      .from('xy_profiles')
      .select('status, gender')
      .eq('user_id', user.id)
      .single()

    if (myProfileErr) {
      console.error('[recommend] Step2 FAIL: 获取自身资料失败:', JSON.stringify(myProfileErr))
      // 如果是 PGRST116 (no rows)，说明 profile 记录不存在
      if (myProfileErr.code === 'PGRST116') {
        return fail('用户资料不存在，请先完成注册建档')
      }
      return fail('获取自身资料失败: ' + myProfileErr.message)
    }
    console.log('[recommend] Step2: 用户资料查询成功, status:', myProfile.status, 'gender:', myProfile.gender)

    const isVerified = myProfile.status === 'verified'
    const targetGender = myProfile.gender === 'male' ? 'female' : 'male'

    // Step 3: 查询推荐列表
    console.log('[recommend] Step3: 查询推荐列表, isVerified:', isVerified, 'targetGender:', targetGender)
    let query = client
      .from('xy_profiles')
      .select('user_id, name, phone, gender, birth_year, zodiac, height, school, college, major, company, job_title, marital_status, introduction, avatar_url, views_count, likes_count')
      .eq('role', 'single_dog')
      .eq('status', 'verified')
      .neq('user_id', user.id)

    if (myProfile.gender) {
      query = query.eq('gender', targetGender)
    }

    const { data: list, error: queryErr } = await query.limit(30)

    if (queryErr) {
      console.error('[recommend] Step3 FAIL: 查询推荐列表失败:', JSON.stringify(queryErr))
      return fail('查询推荐列表失败: ' + queryErr.message)
    }
    console.log('[recommend] Step3: 推荐列表查询成功, 结果数:', (list || []).length)

    // Step 4: 查询已点赞状态
    console.log('[recommend] Step4: 查询点赞记录')
    let likedUserIds = new Set()
    try {
      const { data: myLikes, error: likeErr } = await client
        .from('xy_likes')
        .select('receiver_id')
        .eq('sender_id', user.id)

      if (likeErr) {
        console.warn('[recommend] Step4 WARN: 查询点赞记录失败(不阻塞):', JSON.stringify(likeErr))
      } else {
        likedUserIds = new Set((myLikes || []).map(l => l.receiver_id))
      }
    } catch (likeEx) {
      console.warn('[recommend] Step4 WARN: 查询点赞记录异常(不阻塞):', likeEx.message)
    }

    // Step 5: 格式化数据
    const currentYear = new Date().getFullYear()
    let formattedList = (list || []).map(item => {
      return {
        _id: item.user_id,
        nickname: item.name || '校友',
        school: item.school || '',
        birth_year: item.birth_year,
        age: item.birth_year ? (currentYear - item.birth_year) : null,
        height: item.height,
        job: item.job_title || '',
        city: '南京',
        avatar: item.avatar_url || '',
        view_count: item.views_count || 0,
        like_count: item.likes_count || 0,
        isLiked: likedUserIds.has(item.user_id),
        is_locked: false
      }
    })

    // Step 6: 权限截断
    if (!isVerified) {
      if (formattedList.length > 4) {
        formattedList = formattedList.slice(0, 4)
      }

      if (formattedList.length >= 4) {
        formattedList[3] = {
          _id: 'locked_guest',
          nickname: '校友已锁定',
          school: '认证后查看',
          birth_year: null,
          age: null,
          height: null,
          job: '认证后解锁',
          city: '南京',
          avatar: '',
          view_count: '999',
          like_count: '999',
          isLiked: false,
          is_locked: true
        }
      }
    }

    console.log('[recommend] 完成, 返回列表数:', formattedList.length)
    return success(formattedList)
  } catch (err) {
    console.error('[recommend] 未知异常:', err.message, err.stack)
    return fail('获取推荐列表异常: ' + err.message)
  }
}
