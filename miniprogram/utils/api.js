/**
 * API 调用封装
 * 统一云函数调用入口，处理错误和 loading
 */

// 并发请求计数器，解决 showLoading/hideLoading 配对问题
let _loadingCount = 0

function _showLoading(text) {
  if (_loadingCount === 0) {
    wx.showLoading({ title: text, mask: true })
  }
  _loadingCount++
}

function _hideLoading() {
  _loadingCount--
  if (_loadingCount <= 0) {
    _loadingCount = 0
    wx.hideLoading()
  }
}

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {Object} data - 请求数据
 * @param {Object} options - 选项
 * @param {boolean} options.showLoading - 是否显示 loading
 * @param {string} options.loadingText - loading 文本
 * @param {boolean} options.showError - 是否显示错误提示
 * @returns {Promise<Object>} 云函数返回结果
 */
async function callCloud(name, data = {}, options = {}) {
  const {
    showLoading = true,
    loadingText = '加载中...',
    showError = true,
  } = options

  if (showLoading) {
    _showLoading(loadingText)
  }

  try {
    // 打印请求参数方便调试
    console.log(`[callCloud] → ${name}`, JSON.stringify(data))

    const res = await wx.cloud.callFunction({ name, data })
    const result = res.result

    // 云函数返回了业务错误（success: false）
    if (!result || !result.success) {
      const errMsg = (result && result.message) || '操作失败，请重试'
      console.error(`[callCloud] ✗ ${name} 业务失败:`, errMsg, result)
      if (showError) {
        wx.showToast({ title: errMsg, icon: 'none', duration: 2500 })
      }
      throw new Error(errMsg)
    }

    console.log(`[callCloud] ✓ ${name} 成功`)
    return result.data
  } catch (err) {
    // 关键：始终打印原始错误，绝不让错误被静默吞掉
    console.error(`[callCloud] ✗ ${name} 调用异常:`, err.message, err.errCode || '', err.stack || '')

    // 提取真实错误信息，不再用 "网络异常" 掩盖
    let errMsg = err.message || '操作失败，请重试'

    // 对微信云开发常见的原始错误消息做友好化处理
    if (errMsg.includes('function not found') || errMsg.includes('不存在')) {
      errMsg = `云函数 ${name} 未部署，请在开发者工具中右键部署`
    } else if (errMsg.includes('timeout') || errMsg.includes('超时')) {
      errMsg = '请求超时，请稍后重试'
    } else if (errMsg.includes('permission denied') || errMsg.includes('权限')) {
      errMsg = '权限不足，请检查云开发配置'
    } else if (errMsg.length > 30) {
      // 错误信息过长时截断，toast 显示不下
      errMsg = errMsg.substring(0, 30) + '...'
    }

    if (showError) {
      wx.showToast({ title: errMsg, icon: 'none', duration: 3000 })
    }
    throw new Error(errMsg)
  } finally {
    if (showLoading) {
      _hideLoading()
    }
  }
}

/**
 * 带重试的云函数调用
 */
async function callCloudWithRetry(name, data = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await callCloud(name, data, {
        showLoading: i === 0,
        showError: i === retries,
      })
    } catch (err) {
      if (i === retries) throw err
      await sleep(1000 * (i + 1))
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================
// 便捷方法：按模块分类
// ============================================================

const api = {
  // --- 用户模块 ---
  user: {
    login: () => callCloud('user', { action: 'login' }),
    checkSession: () => callCloud('user', { action: 'checkSession' }, { showLoading: false }),
    register: (data) => callCloud('user', { action: 'register', ...data }),
    updateProfile: (data) => callCloud('user', { action: 'updateProfile', ...data }),
    getProfile: (userId) => callCloud('user', { action: 'getProfile', userId }),
    uploadVerification: (data) => callCloud('user', { action: 'uploadVerification', ...data }),
    switchRole: (role) => callCloud('user', { action: 'switchRole', role }),
    recordView: (targetId) => callCloud('user', { action: 'recordView', targetId }, { showLoading: false }),
  },

  // --- 推荐模块 ---
  recommend: {
    daily: () => callCloud('recommend', { action: 'daily' }),
  },

  // --- 互动模块 ---
  like: {
    send: (targetId, context, eventId) =>
      callCloud('like', { action: 'send', targetId, context, eventId }),
    getReceived: () => callCloud('like', { action: 'received' }),
    markRead: (messageIds) => callCloud('like', { action: 'markRead', messageIds }, { showLoading: false }),
  },

  // --- 破冰问答 ---
  icebreaker: {
    getConfig: () => callCloud('icebreaker', { action: 'getConfig' }),
    saveConfig: (config) => callCloud('icebreaker', { action: 'saveConfig', config }),
    getQuestions: (targetId) => callCloud('icebreaker', { action: 'getQuestions', targetId }),
    review: (requestId, passed) =>
      callCloud('icebreaker', { action: 'review', requestId, passed }),
  },

  // --- 活动 ---
  event: {
    list: (params) => callCloud('event', { action: 'list', ...params }),
    detail: (eventId) => callCloud('event', { action: 'detail', eventId }),
    register: (eventId) => callCloud('event', { action: 'register', eventId }),
  },

  // --- 安全 ---
  safety: {
    report: (targetId, type, description, screenshotUrls) =>
      callCloud('safety', { action: 'report', targetId, type, description, screenshotUrls }),
  },
}

module.exports = {
  callCloud,
  callCloudWithRetry,
  api,
}
