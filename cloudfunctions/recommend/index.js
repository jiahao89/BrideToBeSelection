/**
 * 推荐模块云函数 - 对接 Supabase 版
 * 处理：daily (每日推荐列表)
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
    const { client, user } = await getSupabaseClientForUser(openid)

    // 1. 获取当前用户自身的认证状态及性别，用于做同频/异性筛选
    const { data: myProfile, error: myProfileErr } = await client
      .from('xy_profiles')
      .select('status, gender')
      .eq('user_id', user.id)
      .single()

    if (myProfileErr) {
      console.error('获取自身资料失败:', myProfileErr)
      return fail('获取推荐列表失败')
    }

    const isVerified = myProfile.status === 'verified'
    const targetGender = myProfile.gender === 'male' ? 'female' : 'male'

    // 2. 从 Supabase 查询推荐嘉宾列表
    // 只推荐单身狗角色，且已通过审核认证 (status = 'verified') 的异性用户，排除自身
    let query = client
      .from('xy_profiles')
      .select('user_id, name, phone, gender, birth_year, zodiac, height, school, college, major, company, job_title, marital_status, introduction, avatar_url, views_count, likes_count')
      .eq('role', 'single_dog')
      .eq('status', 'verified')
      .neq('user_id', user.id)

    // 如果用户性别明确，则推荐异性
    if (myProfile.gender) {
      query = query.eq('gender', targetGender)
    }

    // 限制最多查询 30 条作为每日池子
    const { data: list, error: queryErr } = await query.limit(30)

    if (queryErr) {
      console.error('查询推荐列表失败:', queryErr)
      return fail('获取推荐列表失败')
    }

    // 3. 处理已点赞状态
    // 查询当前用户点赞过哪些人
    const { data: myLikes } = await client
      .from('xy_likes')
      .select('receiver_id')
      .eq('sender_id', user.id)

    const likedUserIds = new Set((myLikes || []).map(l => l.receiver_id))

    // 4. 将 Supabase 数据格式化成小程序前端渲染字段
    let formattedList = (list || []).map(item => {
      return {
        _id: item.user_id,
        nickname: item.name || '校友',
        school: item.school || '',
        birth_year: item.birth_year,
        height: item.height,
        job: item.job_title || '',
        city: '南京', // 一期默认主要在南京
        avatar: item.avatar_url || '',
        views: item.views_count || 0,
        likes: item.likes_count || 0,
        isLiked: likedUserIds.has(item.user_id),
        is_locked: false
      }
    })

    // 5. 权限拦截截断 (PRD 限制规则)
    // 如果当前用户是“未认证”状态，则只允许看 4 张卡片，且第 4 张（索引为 3）打码高斯模糊，无法查看详情
    if (!isVerified) {
      if (formattedList.length > 4) {
        // 截断到 4 个
        formattedList = formattedList.slice(0, 4)
      }
      
      // 如果正好有 4 个或更多，对第 4 个进行打码/锁定标记
      if (formattedList.length >= 4) {
        formattedList[3] = {
          _id: 'locked_guest',
          nickname: '校友已锁定',
          school: '认证后查看',
          birth_year: null,
          height: null,
          job: '认证后解锁',
          city: '南京',
          avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBj1iILsmZ8lMcnuqGX4OeZL8ulIC7dajUDqvUyLcV_R0I9t4GYgrnEQpeKzIH4zdrXCV-28cEHMr1NsbK4Z052J-_s1HqhmT_wwQSnPgZT-3CVxBU3Fnyissl6SgcbuCiJwAEG3dFhEhGln0XuUpLvCsOrDEfaggdu-Ia-y5igmqVp7WqqBC13zVNvHjQyYx0ZU3fLiwNMDcii4erFfuzG8GK9x0xOpwLKTX70GBrIxqiJMT5EBMo9siGmz1N45qeQ2t2ZVuNmu6Y', // 默认虚化占位图
          views: 999,
          likes: 999,
          isLiked: false,
          is_locked: true // 锁定标记
        }
      }
    }

    return success(formattedList)
  } catch (err) {
    console.error('获取推荐列表异常:', err)
    return fail('获取推荐列表异常')
  }
}
