/**
 * API 调用封装
 * 统一云函数调用入口，处理错误和 loading
 */

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
    wx.showLoading({ title: loadingText, mask: true })
  }

  try {
    const res = await wx.cloud.callFunction({ name, data })
    const result = res.result

    if (!result || !result.success) {
      const errMsg = (result && result.message) || '操作失败，请重试'
      if (showError) {
        wx.showToast({ title: errMsg, icon: 'none', duration: 2500 })
      }
      throw new Error(errMsg)
    }

    return result.data
  } catch (err) {
    // 区分云函数调用失败和业务逻辑失败
    if (err.message && !err.message.includes('cloud.callFunction')) {
      throw err
    }
    const errMsg = '网络异常，请检查网络后重试'
    if (showError) {
      wx.showToast({ title: errMsg, icon: 'none', duration: 2500 })
    }
    throw new Error(errMsg)
  } finally {
    if (showLoading) {
      wx.hideLoading()
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
  },

  // --- 邀请模块 ---
  invite: {
    generate: (circleId) => callCloud('invite', { action: 'generate', circleId }),
    join: (code) => callCloud('invite', { action: 'join', code }),
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
  },

  // --- 破冰问答 ---
  icebreaker: {
    getConfig: () => callCloud('icebreaker', { action: 'getConfig' }),
    saveConfig: (config) => callCloud('icebreaker', { action: 'saveConfig', config }),
    getQuestions: (targetId) => callCloud('icebreaker', { action: 'getQuestions', targetId }),
    submitAnswer: (sessionId, stage, answers) =>
      callCloud('icebreaker', { action: 'submitAnswer', sessionId, stage, answers }),
    reviewAnswer: (sessionId, stage, passed) =>
      callCloud('icebreaker', { action: 'review', sessionId, stage, passed }),
  },

  // --- 匹配模块 ---
  match: {
    getList: () => callCloud('match', { action: 'getList' }),
    updateMilestone: (matchId, stage) =>
      callCloud('match', { action: 'updateMilestone', matchId, stage }),
  },

  // --- 敏感信息 ---
  sensitive: {
    requestExchange: (targetId) =>
      callCloud('sensitive', { action: 'requestExchange', targetId }),
    authorize: (targetId, fields) =>
      callCloud('sensitive', { action: 'authorize', targetId, fields }),
    revoke: (targetId) =>
      callCloud('sensitive', { action: 'revoke', targetId }),
    getDecrypted: (targetId) =>
      callCloud('sensitive', { action: 'getDecrypted', targetId }),
  },

  // --- 关系链 ---
  relation: {
    getPath: (targetId) =>
      callCloud('relation', { action: 'getPath', targetId }, { showLoading: false }),
  },

  // --- 父母代办 ---
  parent: {
    generateLinkCode: () => callCloud('parent', { action: 'generateLinkCode' }),
    bindChild: (code) => callCloud('parent', { action: 'bindChild', code }),
    requestAction: (actionType, targetId) =>
      callCloud('parent', { action: 'requestAction', actionType, targetId }),
    childDecision: (requestId, approved) =>
      callCloud('parent', { action: 'childDecision', requestId, approved }),
  },

  // --- 媒人 ---
  matchmaker: {
    endorse: (userId, content, visibility) =>
      callCloud('matchmaker', { action: 'endorse', userId, content, visibility }),
    getTrackList: () => callCloud('matchmaker', { action: 'getTrackList' }),
    nudge: (matchId) => callCloud('matchmaker', { action: 'nudge', matchId }),
  },

  // --- 活动 ---
  event: {
    list: (params) => callCloud('event', { action: 'list', ...params }),
    detail: (eventId) => callCloud('event', { action: 'detail', eventId }),
    register: (eventId) => callCloud('event', { action: 'register', eventId }),
    preSelect: (eventId, userIds) =>
      callCloud('event', { action: 'preSelect', eventId, userIds }),
    checkin: (eventId) => callCloud('event', { action: 'checkin', eventId }),
    submitFeedback: (eventId, targetId, feedback) =>
      callCloud('event', { action: 'submitFeedback', eventId, targetId, feedback }),
  },

  // --- 安全 ---
  safety: {
    report: (targetId, type, description) =>
      callCloud('safety', { action: 'report', targetId, type, description }),
    block: (targetId) => callCloud('safety', { action: 'block', targetId }),
    unblock: (targetId) => callCloud('safety', { action: 'unblock', targetId }),
    getBlockList: () => callCloud('safety', { action: 'getBlockList' }),
  },

  // --- 会员 ---
  membership: {
    purchase: (plan) => callCloud('membership', { action: 'purchase', plan }),
    checkAccess: (feature) =>
      callCloud('membership', { action: 'checkAccess', feature }, { showLoading: false }),
  },
}

module.exports = {
  callCloud,
  callCloudWithRetry,
  api,
}
