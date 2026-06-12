/**
 * 用户模块云函数 - 对接 Supabase 版
 * 处理：login / checkSession / register / updateProfile / getProfile / uploadVerification / switchRole
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
    case 'login':
      return handleLogin(openid)
    case 'checkSession':
      return handleCheckSession(openid)
    case 'register':
      return handleRegister(openid, event)
    case 'updateProfile':
      return handleUpdateProfile(openid, event)
    case 'getProfile':
      return handleGetProfile(openid, event)
    case 'uploadVerification':
      return handleUploadVerification(openid, event)
    case 'switchRole':
      return handleSwitchRole(openid, event)
    default:
      return fail('未知的操作类型')
  }
}

/**
 * 微信登录
 */
async function handleLogin(openid) {
  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    // 获取用户在 xy_profiles 中的资料
    const { data: profile, error: profileErr } = await client
      .from('xy_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileErr) {
      console.error('获取用户资料失败:', profileErr)
      return fail('用户初始化失败，请重试')
    }

    if (profile.status === 'frozen') {
      return fail('该账号已被暂时冻结，请联系客服了解详情')
    }

    // 获取审核通过的认证类型列表
    const { data: verifications, error: verifyErr } = await client
      .from('xy_verifications')
      .select('verify_type, status')
      .eq('user_id', user.id)
      .eq('status', 'approved')

    const verificationStatus = {}
    if (verifications) {
      for (const v of verifications) {
        verificationStatus[v.verify_type] = true
      }
    }

    // 计算资料完整度
    const completeness = calcCompleteness(profile)

    // 如果资料中的姓名(name)和电话(phone)为空，表示需要先完成注册建档
    const needRegister = !profile.name || !profile.phone

    return success({
      needRegister,
      user: {
        _id: user.id,
        roles: [profile.role],
        active_role: profile.role,
        status: profile.status,
        verification_status: verificationStatus,
        profile_completeness: completeness,
        is_member: false,
      },
    })
  } catch (err) {
    console.error('登录失败:', err)
    return fail('登录服务异常，请稍后再试')
  }
}

/**
 * 检查会话有效性
 */
async function handleCheckSession(openid) {
  return handleLogin(openid)
}

/**
 * 用户注册
 */
async function handleRegister(openid, event) {
  const { role, phone, gender, nickname } = event

  // 验证必填字段
  if (!role || !phone || !gender) {
    return fail('请填写完整的注册信息')
  }

  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    // 格式化性别字段以适应 db_schema 中的 check 约束 ('male', 'female')
    const formattedGender = (gender === 'male' || gender === 'female') 
      ? gender 
      : (gender === '男' ? 'male' : 'female')

    // 更新 xy_profiles 中的基本建档数据
    const { data: profile, error: updateErr } = await client
      .from('xy_profiles')
      .update({
        phone,
        gender: formattedGender,
        role,
        name: nickname || '',
        status: 'unverified'
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateErr) {
      console.error('注册写入资料失败:', updateErr)
      return fail('注册失败，请检查输入参数')
    }

    return success({ userId: user.id, isNewRole: false })
  } catch (err) {
    console.error('注册失败:', err)
    return fail('注册异常，请稍后再试')
  }
}

/**
 * 更新资料
 */
async function handleUpdateProfile(openid, event) {
  const { profileData } = event
  if (!profileData) return fail('缺少资料数据')

  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    // 如果是有子女的离异状态，必须补充子女信息 (PRD 规则校验)
    if (profileData.marital_status === 'divorced' && profileData.has_child && !profileData.child_info) {
      return fail('有子女时必须填写子女数量及抚养权归属')
    }

    // 字段前端 -> Supabase 物理表映射
    const updateData = {}
    const mappings = {
      nickname: 'name',
      phone: 'phone',
      wechat_id: 'wechat_id',
      role: 'role',
      gender: 'gender',
      birth_year: 'birth_year',
      zodiac: 'zodiac',
      height: 'height',
      school: 'school',
      student_id: 'student_id',
      enroll_year: 'enroll_year',
      college: 'college',
      major: 'major',
      class_name: 'class_name',
      company: 'company',
      job_title: 'job_title',
      marital_status: 'marital_status',
      self_intro: 'introduction',
      partner_requirements: 'mate_expectation',
      avatar_url: 'avatar_url',
      photos: 'photos',
      icebreaker_questions: 'icebreaker_questions'
    }

    for (const key in profileData) {
      if (mappings[key] !== undefined) {
        updateData[mappings[key]] = profileData[key]
      }
    }

    // 高校认证白名单校验
    if (updateData.school && !['南京大学', '江南大学'].includes(updateData.school)) {
      return fail('高校目前仅限“南京大学”与“江南大学”')
    }

    // 心动破冰提问上限校验
    if (updateData.icebreaker_questions) {
      if (!Array.isArray(updateData.icebreaker_questions) || updateData.icebreaker_questions.length !== 3) {
        return fail('心动问题必须设置恰好 3 个')
      }
    }

    const { data: updatedProfile, error: updateErr } = await client
      .from('xy_profiles')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateErr) {
      console.error('更新资料失败:', updateErr)
      return fail('更新资料数据库写入失败')
    }

    const completeness = calcCompleteness(updatedProfile)

    return success({ completeness })
  } catch (err) {
    console.error('更新资料异常:', err)
    return fail('更新资料失败，服务异常')
  }
}

/**
 * 获取特定用户资料
 */
async function handleGetProfile(openid, event) {
  const { userId } = event

  try {
    const { client, user } = await getSupabaseClientForUser(openid)
    const targetUserId = userId || user.id

    // 获取目标用户资料
    const { data: profile, error: profileErr } = await client
      .from('xy_profiles')
      .select('*')
      .eq('user_id', targetUserId)
      .single()

    if (profileErr) {
      console.error('获取目标用户资料失败:', profileErr)
      return fail('用户资料不存在')
    }

    // 获取目标用户的认证状态
    const { data: verifications, error: verifyErr } = await client
      .from('xy_verifications')
      .select('verify_type, status')
      .eq('user_id', targetUserId)
      .eq('status', 'approved')

    const verificationStatus = {}
    if (verifications) {
      for (const v of verifications) {
        verificationStatus[v.verify_type] = true
      }
    }

    // 把 Supabase 的物理字段转换回小程序前端需要的字段格式
    const formattedProfile = {
      _id: profile.user_id,
      nickname: profile.name || '',
      phone: profile.phone || '',
      wechat_id: profile.wechat_id || '',
      role: profile.role,
      status: profile.status,
      gender: profile.gender,
      birth_year: profile.birth_year,
      zodiac: profile.zodiac,
      height: profile.height,
      school: profile.school,
      student_id: profile.student_id,
      enroll_year: profile.enroll_year,
      college: profile.college,
      major: profile.major,
      class_name: profile.class_name,
      company: profile.company,
      job_title: profile.job_title,
      marital_status: profile.marital_status,
      self_intro: profile.introduction || '',
      partner_requirements: profile.mate_expectation || '',
      avatar_url: profile.avatar_url || '',
      photos: profile.photos || [],
      icebreaker_questions: profile.icebreaker_questions || [],
      views_count: profile.views_count || 0,
      likes_count: profile.likes_count || 0,
      verification_status: verificationStatus,
      is_member: false,
    }

    return success({
      profile: formattedProfile,
      verifications: verifications || [],
      endorsements: [] // 一期空置
    })
  } catch (err) {
    console.error('获取用户资料异常:', err)
    return fail('获取用户资料失败，服务异常')
  }
}

/**
 * 解析身份证号获取生日、性别、星座
 */
function parseIdCard(idCard) {
  if (!idCard || idCard.length !== 18) {
    return null
  }
  const birthYear = parseInt(idCard.substring(6, 10))
  const genderCode = parseInt(idCard.substring(16, 17))
  const gender = (genderCode % 2 === 1) ? 'male' : 'female'

  const month = parseInt(idCard.substring(10, 12))
  const day = parseInt(idCard.substring(12, 14))
  const mmdd = month * 100 + day

  let zodiac = '摩羯座'
  if (mmdd >= 321 && mmdd <= 419) zodiac = '白羊座'
  else if (mmdd >= 420 && mmdd <= 520) zodiac = '金牛座'
  else if (mmdd >= 521 && mmdd <= 621) zodiac = '双子座'
  else if (mmdd >= 622 && mmdd <= 722) zodiac = '巨蟹座'
  else if (mmdd >= 723 && mmdd <= 822) zodiac = '狮子座'
  else if (mmdd >= 823 && mmdd <= 922) zodiac = '处女座'
  else if (mmdd >= 923 && mmdd <= 1023) zodiac = '天秤座'
  else if (mmdd >= 1024 && mmdd <= 1122) zodiac = '天蝎座'
  else if (mmdd >= 1123 && mmdd <= 1221) zodiac = '射手座'
  else if (mmdd >= 1222 || mmdd <= 119) zodiac = '摩羯座'
  else if (mmdd >= 120 && mmdd <= 218) zodiac = '水瓶座'
  else if (mmdd >= 219 && mmdd <= 320) zodiac = '双鱼座'

  return { birthYear, gender, zodiac }
}

/**
 * 上传认证材料与实名建档
 */
async function handleUploadVerification(openid, event) {
  const { realName, idCard, school, degree, identityUrls, educationUrls, workUrls } = event

  if (!realName || !idCard || !school) {
    return fail('请填写完整的实名与高校认证信息')
  }

  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    // 1. 解析身份证号
    const parsed = parseIdCard(idCard)
    if (!parsed) {
      return fail('身份证号校验失败，请输入合法的 18 位身份证')
    }

    // 2. 写入实名认证审核流水
    await client
      .from('xy_verifications')
      .insert({
        user_id: user.id,
        verify_type: 'real_name',
        doc_url: identityUrls && identityUrls.length > 0 ? identityUrls[0] : 'parsed_id_card',
        status: 'approved'
      })

    // 3. 写入学历认证审核流水
    if (educationUrls && educationUrls.length > 0) {
      await client
        .from('xy_verifications')
        .insert({
          user_id: user.id,
          verify_type: 'education',
          doc_url: educationUrls[0],
          status: 'approved'
        })
    }

    // 4. 写入工作认证审核流水 (若上传了工牌/名片)
    if (workUrls && workUrls.length > 0) {
      await client
        .from('xy_verifications')
        .insert({
          user_id: user.id,
          verify_type: 'work',
          doc_url: workUrls[0],
          status: 'approved'
        })
    }

    // 5. 更新扩展资料表 xy_profiles 并改变其状态为 verified (直通已认证状态以方便演示)
    const { error: profileErr } = await client
      .from('xy_profiles')
      .update({
        name: realName,
        phone: user.phone || '',
        gender: parsed.gender,
        birth_year: parsed.birthYear,
        zodiac: parsed.zodiac,
        school: school,
        college: '计算机学院', // 预分配演示学院
        status: 'verified'   // 实名高校双通过
      })
      .eq('user_id', user.id)

    if (profileErr) {
      console.error('实名更新资料表失败:', profileErr)
      return fail('认证失败，资料表同步出错')
    }

    return success(null, '认证通过，校缘资料已解锁！')
  } catch (err) {
    console.error('提交认证材料异常:', err)
    return fail('认证提交失败，服务异常')
  }
}

/**
 * 切换角色
 */
async function handleSwitchRole(openid, event) {
  const { role } = event
  if (!role) return fail('未指定目标角色')

  try {
    const { client, user } = await getSupabaseClientForUser(openid)

    const { data: updatedProfile, error: updateErr } = await client
      .from('xy_profiles')
      .update({ role })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateErr) {
      console.error('切换角色数据库更新失败:', updateErr)
      return fail('切换角色失败')
    }

    return success({ active_role: updatedProfile.role })
  } catch (err) {
    console.error('切换角色异常:', err)
    return fail('切换角色异常，服务出错')
  }
}

/**
 * 计算资料完整度
 */
function calcCompleteness(profile) {
  const requiredFields = [
    'gender', 'birth_year', 'height', 'school', 'college',
    'company', 'job_title', 'marital_status', 'introduction',
  ]
  const optionalFields = ['major', 'wechat_id', 'mate_expectation']

  let score = 0
  const reqWeight = 60 / requiredFields.length
  const optWeight = 20 / optionalFields.length

  for (const f of requiredFields) {
    if (profile[f]) score += reqWeight
  }
  for (const f of optionalFields) {
    if (profile[f] && (Array.isArray(profile[f]) ? profile[f].length > 0 : true)) {
      score += optWeight
    }
  }
  if (profile.photos && profile.photos.length > 0) score += 20

  return Math.round(Math.min(score, 100))
}
