/**
 * Supabase 客户端配置与用户 Auth 映射助手
 * 用于在微信云开发环境（Node.js）中安全、有鉴权地连接 Supabase。
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://olismwosewkrforszwby.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saXNtd29zZXdrcmZvcnN6d2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNzYwNTMsImV4cCI6MjA5NjY1MjA1M30.guKAVqZmtDHeHJNOgyRrxZIOB5sPDwrWOlbj_41LhME'

/**
 * 根据微信 openid 生成确定的邮箱与密码，用于映射 Supabase Auth
 */
function getCredentialsForOpenid(openid) {
  // 转换为小写并去除非法字符
  const cleanOpenid = openid.toLowerCase().replace(/[^a-z0-9_-]/g, '')
  const email = `${cleanOpenid}@wx.liuchaosong.com`
  // 使用确定的前缀与 openid 混合作为密码
  const password = `Wx_${openid}_Secure_2026`
  return { email, password }
}

/**
 * 获取代表特定微信用户的 Supabase 客户端实例（带用户 JWT，触发 RLS 策略）
 * @param {string} openid - 微信用户 openid
 */
async function getSupabaseClientForUser(openid) {
  if (!openid) {
    throw new Error('openid is required to get Supabase client')
  }

  const { email, password } = getCredentialsForOpenid(openid)
  
  // 创建临时客户端用于登录/注册
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })

  let session = null
  let user = null

  try {
    // 尝试直接登录
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      // 如果报错是凭证错误或用户不存在，则执行自动注册
      if (error.message.includes('Invalid login credentials') || error.status === 400) {
        const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
          email,
          password
        })

        if (signUpError) {
          throw new Error(`Supabase Auth SignUp failed: ${signUpError.message}`)
        }

        // 注册成功后重新登录以获取 Session
        const { data: retryData, error: retryError } = await authClient.auth.signInWithPassword({
          email,
          password
        })

        if (retryError) {
          throw new Error(`Supabase Auth SignIn after SignUp failed: ${retryError.message}`)
        }

        session = retryData.session
        user = retryData.user
      } else {
        throw error
      }
    } else {
      session = data.session
      user = data.user
    }
  } catch (err) {
    console.error(`Error mapping openid ${openid} to Supabase Auth:`, err)
    throw err
  }

  // 使用用户的 Access Token (JWT) 实例化专属的 Supabase 客户端
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    }
  })

  return {
    client: userClient,
    user,
    session
  }
}

module.exports = {
  supabaseUrl,
  supabaseAnonKey,
  getCredentialsForOpenid,
  getSupabaseClientForUser
}
