# “校缘”高校校友相亲平台 API 接口设计规范 (云开发 & Supabase 桥接版)

本文档定义了“校缘”微信小程序客户端与云函数后端（WeChat Cloud Functions）之间的全部接口规范，旨在统一数据传输格式与业务逻辑拦截规则，供前后端开发团队联调对接。

---

## 1. 通讯协议与全局约定

### 1.1 调用信封格式
客户端统一通过微信小程序云开发 SDK 发起请求，接口层包装在 `callCloud` 方法中。
* **调用语法**：
  ```javascript
  wx.cloud.callFunction({
    name: '云函数文件名', // 例如：'user'
    data: {
      action: '动作名', // 例如：'login'
      ...arguments // 传递的业务参数
    }
  })
  ```

### 1.2 响应信封格式 (Response Envelope)
云开发云函数执行完毕后，统一返回以下结构的 JSON 对象：
```json
{
  "success": true,           // 业务状态：true 代表成功，false 代表拦截或系统异常
  "data": {},                // 业务具体数据载荷（仅在 success 为 true 时有效，非必填）
  "message": "提示信息"      // 报错与异常文字说明（仅在 success 为 false 时有效）
}
```

### 1.3 用户身份与鉴权映射
* 云开发在运行时通过 `context.OPENID` 安全、防伪造地提供微信用户唯一标识（`openid`）。
* 云函数后端采用代理模式，在 `common/supabase` 中将 `openid` 自动映射为 Supabase Auth 的邮件和密码账号：
  * **Email**: `${openid.toLowerCase().replace(/[^a-z0-9_-]/g, '')}@wx.liuchaosong.com`
  * **Password**: `Wx_${openid}_Secure_2026`
* 所有 Supabase 客户端调用均携带由此账号签发的 JWT 凭证，自动激活数据库行级安全策略（RLS）。

---

## 2. API 接口规范细则

### 2.1 用户模块 (`user` 云函数)

#### 2.1.1 微信登录与校验 (`login` / `checkSession`)
* **动作标识**：`login` / `checkSession`
* **参数**：无
* **响应**：
  ```json
  {
    "success": true,
    "data": {
      "needRegister": false,  // true 表示未建档，需要强跳注册角色页
      "user": {
        "_id": "uuid-string-of-supabase-auth",
        "roles": ["single_dog"],
        "active_role": "single_dog", // single_dog (单身狗) / introducer (介绍人)
        "status": "verified",        // unverified (未认证) / verified (已认证) / frozen (冻结)
        "verification_status": {
          "real_name": true,
          "education": true,
          "work": false
        },
        "profile_completeness": 85   // 资料完整度百分比
      }
    }
  }
  ```

#### 2.1.2 新建注册建档 (`register`)
* **动作标识**：`register`
* **参数**：
  * `role`: String (必填，`single_dog` 或 `introducer`)
  * `phone`: String (必填，中国大陆手机号)
  * `gender`: String (必填，`male` 或 `female`)
  * `nickname`: String (必填，微信名/昵称)
* **响应**：
  ```json
  {
    "success": true,
    "data": {
      "userId": "uuid-string",
      "isNewRole": false
    }
  }
  ```

#### 2.1.3 修改个人资料 (`updateProfile`)
* **动作标识**：`updateProfile`
* **参数**：
  * `profileData`: Object (必填，包含要修改的属性)
    * 支持字段：`nickname`, `wechat_id`, `birth_year`, `zodiac`, `height`, `school`, `enroll_year`, `college`, `major`, `company`, `job_title`, `marital_status`, `self_intro`, `partner_requirements`, `avatar_url`, `photos`, `icebreaker_questions`
* **校验逻辑**：
  * 若 `marital_status` 为离异且 `has_child` 为 true，必须提供 `child_info`，否则返回 `fail('有子女时必须填写子女数量及抚养权归属')`。
  * 限制单身提问 `icebreaker_questions` 必须恰好为 3 个问题。
* **响应**：
  ```json
  {
    "success": true,
    "data": {
      "updated": true
    }
  }
  ```

#### 2.1.4 获取个人/他人资料 (`getProfile`)
* **动作标识**：`getProfile`
* **参数**：
  * `userId`: String (必填，目标用户 UUID)
* **安全机制**：
  * 本人读取，或管理员读取，返回完整资料。
  * 他人读取时，若当前用户未认证，执行敏感数据掩码遮罩（如不显示真实姓名、微信ID、学号等）。
* **响应**：返回字段映射回小程序的扁平化资料。

#### 2.1.5 上传资质认证文件 (`uploadVerification`)
* **动作标识**：`uploadVerification`
* **参数**：
  * `verify_type`: String (必填，`real_name`、`education`、`work`、`marital` 之一)
  * `doc_url`: String (必填，上传在云存储的证件图片路径)
  * `name`: String (仅在 `real_name` 认证时必填)
  * `id_card`: String (仅在 `real_name` 认证时必填)
* **响应**：
  ```json
  {
    "success": true,
    "data": {
      "applyId": 12345,
      "status": "pending"
    }
  }
  ```

#### 2.1.6 身份角色切换 (`switchRole`)
* **动作标识**：`switchRole`
* **参数**：
  * `role`: String (必填，`single_dog` 或 `introducer`)
* **响应**：成功切换状态。

---

### 2.2 推荐模块 (`recommend` 云函数)

#### 2.2.1 每日异性/同频推荐池 (`daily`)
* **动作标识**：`daily`
* **参数**：无
* **业务规则 (PRD 还原核心)**：
  * 只推荐角色为 `single_dog` 且实名认证通过 (`status = 'verified'`) 且与当前用户性别相反的用户。
  * **未认证用户拦截逻辑**：若当前用户自身为 `unverified` 状态，返回的推荐列表长度强制截断为最多 4 个。且列表第 4 个用户（索引为 3）的关键隐私字段全部打码（如“校友已锁定”、“认证后查看”），并附带 `is_locked: true` 标记，用于触发小程序端的高斯模糊遮罩及认证弹窗拦截。
* **响应**：
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "uuid-string",
        "nickname": "陈佳丽",
        "school": "江南大学",
        "birth_year": 2001,
        "height": 165,
        "job": "在读硕士",
        "city": "南京",
        "avatar": "cos-url-path",
        "views": 120,
        "likes": 24,
        "isLiked": false,
        "is_locked": false
      }
    ]
  }
  ```

---

### 2.3 互动模块 (`like` 云函数)

#### 2.3.1 发起同频点赞 (`send`)
* **动作标识**：`send`
* **参数**：
  * `targetId`: String (必填，对方用户 UUID)
* **约束逻辑 (SQL & 业务限制)**：
  * 禁止自己赞自己。
  * 用户 24 小时内（按上海时区自然日）对同一个异性用户仅能点赞 1 次。
  * 数据库在 xy_likes 表上有 `(sender_id, receiver_id, date)` 的唯一联合索引约束。若重复点赞，云函数捕获异常并返回 `fail('今日已为TA点赞，明天再来吧')`。
* **响应**：
  ```json
  {
    "success": true,
    "data": { "liked": true }
  }
  ```

#### 2.3.2 获取收到我的点赞列表 (`received`)
* **动作标识**：`received`
* **响应**：返回所有给自己点赞的用户的公开卡片列表，同时自动将这些点赞对应的未读消息标记为已读。

---

### 2.4 破冰问答模块 (`icebreaker` 云函数)

#### 2.4.1 获取对方的 3 个心动问题 (`getQuestions`)
* **动作标识**：`getQuestions`
* **参数**：
  * `targetId`: String (必填，对方 UUID)
* **响应**：
  ```json
  {
    "success": true,
    "data": {
      "questions": ["理想的周末生活是怎样的？", "工作和生活的平衡你怎么看？", "三年内的发展规划是什么？"]
    }
  }
  ```

#### 2.4.2 提交心动答卷 (`submitAnswer`)
* **动作标识**：`submitAnswer`
* **参数**：
  * `targetId`: String (必填，答题目标用户 UUID)
  * `answers`: Array of Strings (必填，恰好 3 个回答文本)
* **业务校验**：
  * 每一个回答文本的字数必须不小于 20 字，否则触发异常拦截返回 `fail('每个问题的回答不能少于 20 个字')`。
* **响应**：
  ```json
  {
    "success": true,
    "data": { "requestId": 5678, "status": "pending" }
  }
  ```

#### 2.4.3 审核并处理别人的破冰回答 (`review`)
* **动作标识**：`review`
* **参数**：
  * `requestId`: Number (必填，`xy_heart_requests` 的 id)
  * `passed`: Boolean (必填，true 代表接受心动，false 代表拒绝)
* **业务逻辑**：
  * **接受 (passed = true)**：将申请状态更新为 `accepted`。更新后触发匹配状态建立，**自动双向授权微信号和手机号的可见性**。
  * **拒绝 (passed = false)**：将状态更新为 `rejected`，系统静默归档。
* **响应**：
  ```json
  {
    "success": true,
    "data": { "status": "accepted" }
  }
  ```

---

### 2.5 活动模块 (`event` 云函数)

#### 2.5.1 获取活动列表 (`list`)
* **动作标识**：`list`
* **参数**：
  * `limit_school`: String (选填，`all` / `南京大学` / `江南大学`)
* **业务逻辑**：
  * 查询活动表，只显示状态为 `active` 或 `ended` 的活动。
  * 若指定了学校隔离参数，则仅展示当前学校可见的活动。
* **响应**：
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1001,
        "title": "六朝松户外徒步·紫金山半日游",
        "cover_url": "cos-path",
        "start_time": "2026-06-20T14:00:00Z",
        "end_time": "2026-06-20T18:00:00Z",
        "address": "南京玄武区紫金山索道口",
        "max_participants": 50,
        "current_participants": 32,
        "status": "active"
      }
    ]
  }
  ```

#### 2.5.2 报名线下活动 (`register`)
* **动作标识**：`register`
* **参数**：
  * `eventId`: Number (必填，活动 ID)
* **业务校验**：
  * 只有已通过认证的用户（`status = 'verified'`）可以报名活动，未认证用户执行拦截。
  * 判断当前报名人数是否超过 `max_participants`，若超额返回 `fail('报名人数已满')`。
* **响应**：
  ```json
  {
    "success": true,
    "data": { "registered": true }
  }
  ```

---

### 2.6 隐私与敏感数据模块 (`sensitive` 云函数)

#### 2.6.1 主动请求交换联系方式 (`requestExchange`)
* **动作标识**：`requestExchange`
* **参数**：
  * `targetId`: String (必填)
* **响应**：向对方发送敏感信息互换请求通知。

#### 2.6.2 获取解密后的联系方式 (`getDecrypted`)
* **动作标识**：`getDecrypted`
* **参数**：
  * `targetId`: String (必填)
* **安全拦截**：
  * 仅当在 `xy_heart_requests` 中存在 `status = 'accepted'` 的双向同意记录，或者对方显式授权在敏感信息表中有记录时，才返回对方的真实的 `wechat_id` 和 `phone`。
  * 否则拒绝返回并提示 `fail('需双方互选或授权后才能查看联系方式')`。
* **响应**：
  ```json
  {
    "success": true,
    "data": {
      "wechat_id": "wechat_jiali",
      "phone": "13912345678"
    }
  }
  ```

---

### 2.7 安全拉黑与举报模块 (`safety` 云函数)

#### 2.7.1 举报用户 (`report`)
* **动作标识**：`report`
* **参数**：
  * `targetId`: String (必填，被举报人 UUID)
  * `type`: String (必填，`fake_info`、`harassment`、`advertising`、`other` 之一)
  * `description`: String (选填)
  * `screenshot_urls`: Array of Strings (选填，存放在云存储的存证图片链接)
* **响应**：成功建立 xy_reports 表项，进入后台审核流。

---

## 3. 错误码与全局拦截信息定义

| 异常提示文案 | 触发场景说明 |
|---|---|
| `“获取微信 OpenID 失败”` | 微信客户端未正常初始化或网络链路发生抖动 |
| `“请填写完整的注册信息”` | 注册建档时未通过必填项（角色、手机号、性别）校验 |
| `“每个问题的回答不能少于 20 个字”` | 破冰回答提交时，有任何一题的输入字数少于 20 字 |
| `“今日已为TA点赞，明天再来吧”` | 违反单日单人限赞 1 次的数据库联合唯一性约束 |
| `“需双方互选或授权后才能查看联系方式”` | 未达成心动接受状态，试图强行拉取解密后的微信或手机号 |
| `“报名人数已满”` | 活动报名时，已报名数达到或超过活动名额最大上限 |
