# “校缘”高校校友相亲平台 (一期 MVP)

“校缘”定位为一款 **面向高校校友与单身青年的高信任圈层相亲平台**。首个落地试点确定为 **南京大学** 与 **江南大学** 的校友及在校生圈层。本仓库包含微信小程序客户端、云函数后端以及平台数据库与完整设计文档。

## 项目基本信息

**小程序前端PRD**：/Volumes/Files/Anti-gravity/六朝松相亲会/design/相亲软件PRD.md
**后台管理系统PRD**：/Volumes/Files/Anti-gravity/六朝松相亲会/design/后台管理系统PRD.md
**数据库部署脚本**：/Volumes/Files/Anti-gravity/六朝松相亲会/design/db_schema.sql
**设计图源文件**：/Volumes/Files/Anti-gravity/六朝松相亲会/design/小程序设计.pen
**设计规范与异常反馈设计规范**：/Volumes/Files/Anti-gravity/六朝松相亲会/design/design.md
**小程序appid**：wx1ca05cf0973adce4
**小程序 secret**：b6456b53099a26316255bced71550e2f

---

## 1. 核心业务特征与架构

### 1.1 用户角色与双向匹配
- **角色体系**：注册后用户分为 **单身狗** (寻找另一半的单身青年) 与 **介绍人** (红娘，负责推荐身边人并做信任背书)。
- **二要素实名与数据锁定**：集成公安二要素实名核验 API。实名成功后，系统自动解析身份证号第 17 位（奇数男、偶数女）与出生年月日，**自动锁定并验证用户的性别、出生年份及星座**，防止前端篡改。
- **5 步建档认证流**：引导用户依次完成 `1. 实名` -> `2. 学历` -> `3. 工作` -> `4. 婚姻状况` -> `5. 完善信息`（WeChat ID、个人简介与照片上传）。
- **3 个开放心动问题**：用户完成认证并首次登录时，必须设置 3 个破冰心动开放性提问。
- **心动审核与解锁**：A 想结识 B 必须真诚回答 B 设定的 3 个问题。B 在消息中心看到回答后选择“接受”（弹窗庆祝并解锁双方微信号和手机号，双方沉淀在“心动的Ta”列表）或“拒绝”（静默归档，保护用户自尊）。

### 1.2 导航重构与消息中心
- **全新 4-Tab 导航底栏**：
  1. `推荐`：双列瀑布流卡片网络，展现热度统计（浏览量、点赞量），未认证用户在浏览第 4 张卡片后截断，照片高斯模糊，点击引导认证。
  2. `活动`：线下专属联谊活动列表与在线报名。
  3. `消息`：独立消息中心，分为 **点赞消息**（支持批量一读）与 **心动消息**（包含未读红点，点击可直接展开回答并执行审批处理）。
  4. `我的`：个人中心。支持查看资料、修改 3 个破冰心动问题、审核心动申请、查看“心动的Ta”列表。

### 1.3 分校数据隔离管理后台
- **分级隔离模型**：
  - `超级管理员 (super_admin)`：负责全局配置、跨校数据监控与系统级维护。
  - `学校管理员 (school_admin)`：负责其所属试点学校（如南京大学）的日常资料审核、违规处理及专属活动发布。
  - **隔离机制**：在数据库与云函数层强制注入过滤条件 `school = admin_school`，防止水平越权（IDOR）。

---

## 2. 目录结构说明

```text
六朝松相亲会/
├── miniprogram/                 # 微信小程序客户端源码
│   ├── components/              # 公共自定义组件 (如 match-popup 匹配弹窗)
│   ├── pages/                   # 小程序业务主屏
│   │   ├── recommend/           # 推荐首页 (Banner 轮播 + 瀑布流)
│   │   ├── profile-detail/      # 嘉宾详情页 (热度与隐私解锁)
│   │   ├── icebreaker-answer/   # 回答心动问题页 (3题合并单页)
│   │   ├── messages/            # 消息中心 (心动/点赞消息 Top 双 Tab)
│   │   └── me/                  # 个人中心 (破冰提问设置与心动管理)
│   ├── utils/                   # 辅助工具函数
│   ├── app.js / app.json        # 小程序全局逻辑与页面路径配置
│   └── app.wxss                 # 全局暖色系圆角样式规范
│
├── cloudfunctions/              # 微信云函数后端
│   ├── user/                    # 用户核心模块
│   └── common/                  # 公共工具库与 API 对接
│
└── design/                      # 项目设计、PRD与数据库部署脚本
    ├── 相亲软件PRD.md            # 用户端产品需求文档
    ├── 后台管理系统PRD.md        # 管理端产品需求文档
    ├── db_schema.sql            # Supabase 数据库表结构、触发器与 RLS 部署脚本
    ├── design.md                # 整体页面风格、组件标准与异常反馈设计规范
    └── 小程序设计.pen           # 原型交互图源文件 (Pencil 格式，共 17 个页面)
```

---

## 3. 数据库与接口规范说明

数据库托管在独立的 **Supabase (PostgreSQL 17)** 项目中。

### 3.1 核心表结构定义
所有表均已持久化行级安全策略（RLS），保障隐私隔离：
- [public.xy_profiles](file:///Volumes/Files/Anti-gravity/六朝松相亲会/design/db_schema.sql#L28-L75)：用户基本与扩展建档表，包含锁定字段、浏览/点赞计数、破冰问题。
- [public.xy_verifications](file:///Volumes/Files/Anti-gravity/六朝松相亲会/design/db_schema.sql#L85-L95)：三类证件审核申请单流水表。
- [public.xy_heart_requests](file:///Volumes/Files/Anti-gravity/六朝松相亲会/design/db_schema.sql#L98-L109)：心动问答及互选状态表。
- [public.xy_likes](file:///Volumes/Files/Anti-gravity/六朝松相亲会/design/db_schema.sql#L368-L379)：用户点赞流水表，使用唯一组合索引锁定单日单人赞 1 次。
- [public.xy_messages](file:///Volumes/Files/Anti-gravity/六朝松相亲会/design/db_schema.sql#L384-L393)：点赞与心动通知中心。

### 3.2 自动化触发器 (Triggers)
- **`on_auth_user_created_matchmaking`**：在 `auth.users` 注册新用户时，自动在业务表生成关联空 Profile 记录。
- **`on_like_created`**：有新点赞行插入时，自动向 `xy_messages` 写入 type 为 `'like'` 的未读通知。
- **`on_heart_request_created`**：发起心动答题插入后，自动向 `xy_messages` 写入 type 为 `'crush'` 的未读心动通知并关联答卷。

---

## 4. 部署与安装运行

### 4.1 数据库部署
1. 注册并登录 [Supabase 平台](https://supabase.com)。
2. 新建名为 `xiaoyuan-matchmaking` 的 PostgreSQL 17 项目。
3. 进入 SQL Editor，复制并全量运行 [design/db_schema.sql](file:///Volumes/Files/Anti-gravity/六朝松相亲会/design/db_schema.sql) 中的脚本以完成表、索引、触发器与行级安全（RLS）的部署。

### 4.2 客户端导入与配置
1. 安装并在本地打开微信开发者工具。
2. 导入项目根目录。选择微信小程序云开发环境，并选择正确的云函数本地根目录 `cloudfunctions/`。
3. 云开发环境参数配置与公安实名二要素 API 秘钥对接可参考本地 `config` 配置文件。

---

## 5. 项目设计源文件
若需要修改页面原型，可直接使用 Pencil 原型绘制工具打开 [design/小程序设计.pen](file:///Volumes/Files/Anti-gravity/六朝松相亲会/design/小程序设计.pen)。文件在逻辑和位置网格上（X 轴每 450 像素分布，Y=0）完美贴合，支持可视化和低代码导出。
