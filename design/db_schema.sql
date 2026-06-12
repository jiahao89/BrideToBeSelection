-- ==========================================
-- “校缘”高校校友相亲平台 Supabase (PostgreSQL 17) 数据库表结构部署脚本
-- 设计时间: 2026-06-10
-- 所有表使用 `xy_` 前缀，以防冲突并保持项目独立性。
-- ==========================================

-- 开启 UUID 扩展（Supabase 默认已开启）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 0. 通用 Trigger 函数定义
-- ==========================================

-- 自动维护 updated_at 时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- 1. 核心表结构创建
-- ==========================================

-- 1.1 用户资料扩展表 (xy_profiles)
CREATE TABLE IF NOT EXISTS public.xy_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100),                                 -- 真实姓名（实名审核通过后锁定）
    phone VARCHAR(20),                                 -- 手机号
    wechat_id VARCHAR(100),                            -- 微信号
    role VARCHAR(30) DEFAULT 'single_dog' NOT NULL,    -- 角色：single_dog (单身狗), introducer (介绍人), admin (学校管理员), super_admin (超级管理员)
    status VARCHAR(30) DEFAULT 'unverified' NOT NULL,  -- 认证状态：unverified (未认证/跳过), verified (已认证), frozen (账号冻结)
    admin_school VARCHAR(100),                         -- 管理员所管辖的学校（仅 role 为 admin 时有效，super_admin 为空）
    
    -- 实名认证锁定字段
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')), -- 性别：male (男), female (女)
    birth_year INT,                                    -- 出生年份
    zodiac VARCHAR(20),                                -- 星座

    -- 个人基本建档资料
    height INT,                                        -- 身高 (cm)
    school VARCHAR(100) CHECK (school IN ('南京大学', '江南大学')), -- 高校名称
    student_id VARCHAR(50),                            -- 学号
    enroll_year INT,                                   -- 入学年份
    college VARCHAR(100),                              -- 学院
    major VARCHAR(100),                                -- 专业
    class_name VARCHAR(100),                           -- 班级
    
    -- 工作与婚姻资料
    company VARCHAR(100),                              -- 公司名称
    job_title VARCHAR(100),                            -- 职位
    marital_status VARCHAR(30) DEFAULT 'unmarried' CHECK (marital_status IN ('unmarried', 'divorced', 'widowed')), -- 婚姻状况
    
    -- 自介与心动问答
    introduction TEXT,                                 -- 自我介绍
    mate_expectation TEXT,                             -- 择偶期望
    avatar_url TEXT,                                   -- 头像图片 URL
    photos TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,       -- 个人相册（多图，上限9张）
    icebreaker_questions TEXT[] DEFAULT '{}'::TEXT[] NOT NULL, -- 3个心动提问问题

    -- 人气与活跃指标
    views_count INT DEFAULT 0 NOT NULL,                -- 浏览量（小眼睛）
    likes_count INT DEFAULT 0 NOT NULL,                -- 点赞数（欣赏量）

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- 约束：心动问题必须是恰好 3 个（或者为空，用于注册未完成态）
    CONSTRAINT check_icebreaker_questions_count CHECK (
        array_length(icebreaker_questions, 1) IS NULL OR 
        array_length(icebreaker_questions, 1) = 3
    )
);

-- 创建 updated_at 自动更新触发器
CREATE TRIGGER update_xy_profiles_updated_at
    BEFORE UPDATE ON public.xy_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 1.2 认证审核申请表 (xy_verifications)
CREATE TABLE IF NOT EXISTS public.xy_verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    verify_type VARCHAR(30) NOT NULL CHECK (verify_type IN ('real_name', 'education', 'work', 'marital')), -- 认证类型
    doc_url TEXT NOT NULL,                             -- 审核证明文件（毕业证/学生证/工牌等照片）
    status VARCHAR(30) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),  -- 审核状态
    reject_reason TEXT,                                -- 驳回具体原因
    submit_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    handle_time TIMESTAMP WITH TIME ZONE
);


-- 1.3 心动问答匹配申请表 (xy_heart_requests)
CREATE TABLE IF NOT EXISTS public.xy_heart_requests (
    id BIGSERIAL PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    answers TEXT[] NOT NULL,                           -- 对接收方3个心动问题的回答
    status VARCHAR(30) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')), -- 申请状态
    submit_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    handle_time TIMESTAMP WITH TIME ZONE,

    -- 约束：回答的数量必须是恰好 3 个
    CONSTRAINT check_answers_count CHECK (array_length(answers, 1) = 3)
);


-- 1.4 线下活动表 (xy_activities)
CREATE TABLE IF NOT EXISTS public.xy_activities (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,                       -- 活动标题
    cover_url TEXT,                                    -- 活动封面图
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,      -- 活动开始时间
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,        -- 活动结束时间
    address TEXT NOT NULL,                             -- 活动地点
    limit_school VARCHAR(100) DEFAULT 'all' NOT NULL,  -- 限制学校可见（all/南京大学/江南大学）
    max_participants INT NOT NULL,                     -- 报名人数上限
    current_participants INT DEFAULT 0 NOT NULL,       -- 当前报名人数
    content TEXT NOT NULL,                             -- 活动介绍富文本/Markdown
    creator_id UUID REFERENCES auth.users(id) NOT NULL,-- 发布者ID
    status VARCHAR(30) DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'active', 'ended')), -- 活动状态
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 1.5 首页轮播 Banner 表 (xy_banners)
CREATE TABLE IF NOT EXISTS public.xy_banners (
    id BIGSERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,                           -- 图片 URL
    redirect_url VARCHAR(255),                         -- 点击跳转的小程序路径
    sort_weight INT DEFAULT 0 NOT NULL,                -- 排序权重，越大越靠前
    status VARCHAR(30) DEFAULT 'enabled' NOT NULL CHECK (status IN ('enabled', 'disabled')), -- 状态
    creator_id UUID REFERENCES auth.users(id) NOT NULL,-- 操作管理员 ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 1.6 违规举报投诉表 (xy_reports)
CREATE TABLE IF NOT EXISTS public.xy_reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reason_category VARCHAR(50) NOT NULL CHECK (reason_category IN ('fake_info', 'harassment', 'advertising', 'other')), -- 举报类型
    description TEXT,                                  -- 详情描述
    screenshot_urls TEXT[] DEFAULT '{}'::TEXT[] NOT NULL, -- 证据截图列表
    status VARCHAR(30) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processed', 'ignored')), -- 处理状态
    handle_result VARCHAR(30) DEFAULT 'none' NOT NULL CHECK (handle_result IN ('warned', 'frozen', 'none')), -- 处理结果
    handler_id UUID REFERENCES auth.users(id),         -- 处理的管理员 ID
    submit_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    handle_time TIMESTAMP WITH TIME ZONE
);


-- 1.7 管理员审计日志表 (xy_audit_logs)
CREATE TABLE IF NOT EXISTS public.xy_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    action_type VARCHAR(50) NOT NULL,                  -- 操作类别 (如 approve_education, freeze_user)
    target_id VARCHAR(100) NOT NULL,                   -- 操作的目标 ID
    details TEXT,                                      -- 详细说明
    ip_address VARCHAR(45),                            -- IP 地址
    log_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. 数据库索引优化 (Indexes)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_profiles_school ON public.xy_profiles(school);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.xy_profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.xy_profiles(status);
CREATE INDEX IF NOT EXISTS idx_verifications_user_status ON public.xy_verifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_heart_requests_users ON public.xy_heart_requests(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_heart_requests_status ON public.xy_heart_requests(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.xy_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_activities_school ON public.xy_activities(limit_school);

-- ==========================================
-- 3. 自动化 Trigger 函数 (触发器)
-- ==========================================

-- 3.1 自动关联新建 Profile 触发器：
-- 当在 auth.users 注册新用户时，自动在 xy_profiles 表创建对应的用户记录
CREATE OR REPLACE FUNCTION public.handle_new_matchmaking_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.xy_profiles (user_id, phone, role, status)
  VALUES (
    new.id,
    COALESCE(new.phone, ''),
    'single_dog',
    'unverified'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 关联触发器到 auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_matchmaking ON auth.users;
CREATE TRIGGER on_auth_user_created_matchmaking
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_matchmaking_user();

-- ==========================================
-- 4. RLS 安全权限函数 (Security Helpers)
-- ==========================================

-- 判断当前操作用户是否为管理员/超级管理员
CREATE OR REPLACE FUNCTION public.xy_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role IN ('admin', 'super_admin') FROM public.xy_profiles WHERE user_id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取当前操作管理员管辖的学校
CREATE OR REPLACE FUNCTION public.xy_admin_school()
RETURNS varchar AS $$
BEGIN
  RETURN (SELECT admin_school FROM public.xy_profiles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 判断当前操作用户是否为已认证的单身用户
CREATE OR REPLACE FUNCTION public.xy_is_verified_user()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT status = 'verified' FROM public.xy_profiles WHERE user_id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. 启用行级安全策略 (RLS - Row Level Security)
-- ==========================================

ALTER TABLE public.xy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xy_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xy_heart_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xy_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xy_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xy_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xy_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5.1 xy_profiles RLS 策略
-- 允许读取条件：
-- 1. 是本条记录拥有者
-- 2. 是已通过认证的普通用户（防盗取全库）
-- 3. 是管理员（但学校管理员在接口层过滤，RLS 提供安全底线）
CREATE POLICY select_xy_profiles ON public.xy_profiles
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id OR 
        public.xy_is_verified_user() OR
        public.xy_is_admin()
    );

-- 允许修改条件：
-- 1. 用户本人只能修改自己的记录
-- 2. 管理员可以修改记录
CREATE POLICY update_xy_profiles ON public.xy_profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR public.xy_is_admin())
    WITH CHECK (auth.uid() = user_id OR public.xy_is_admin());

-- 5.2 xy_verifications RLS 策略
-- 允许读取：本人可查看自己的审核单；管理员可查看本校或所有审核单
CREATE POLICY select_xy_verifications ON public.xy_verifications
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id OR 
        public.xy_is_admin()
    );

-- 允许用户本人插入新审核单
CREATE POLICY insert_xy_verifications ON public.xy_verifications
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 允许管理员修改审核单（进行审批）
CREATE POLICY update_xy_verifications ON public.xy_verifications
    FOR UPDATE TO authenticated
    USING (public.xy_is_admin());

-- 5.3 xy_heart_requests RLS 策略
-- 允许读取：发送方、接收方可以看自己相关的申请；管理员可看
CREATE POLICY select_xy_heart_requests ON public.xy_heart_requests
    FOR SELECT TO authenticated
    USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id OR 
        public.xy_is_admin()
    );

-- 允许发送方创建心动申请
CREATE POLICY insert_xy_heart_requests ON public.xy_heart_requests
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = sender_id);

-- 允许接收方和管理员修改申请状态（接受/拒绝/审批）
CREATE POLICY update_xy_heart_requests ON public.xy_heart_requests
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = receiver_id OR 
        public.xy_is_admin()
    );

-- 5.4 xy_activities RLS 策略
-- 全员（包括未认证及未登录的游客）可读活动
CREATE POLICY select_xy_activities ON public.xy_activities
    FOR SELECT TO authenticated, anon
    USING (true);

-- 仅管理员可增删改活动
CREATE POLICY admin_modify_xy_activities ON public.xy_activities
    FOR ALL TO authenticated
    USING (public.xy_is_admin());

-- 5.5 xy_banners RLS 策略
-- 全员可读
CREATE POLICY select_xy_banners ON public.xy_banners
    FOR SELECT TO authenticated, anon
    USING (true);

-- 仅管理员可增删改 Banner
CREATE POLICY admin_modify_xy_banners ON public.xy_banners
    FOR ALL TO authenticated
    USING (public.xy_is_admin());

-- 5.6 xy_reports RLS 策略
-- 仅发起举报人及管理员可读
CREATE POLICY select_xy_reports ON public.xy_reports
    FOR SELECT TO authenticated
    USING (auth.uid() = reporter_id OR public.xy_is_admin());

-- 允许用户创建举报
CREATE POLICY insert_xy_reports ON public.xy_reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

-- 仅管理员可以修改举报状态（处理举报）
CREATE POLICY update_xy_reports ON public.xy_reports
    FOR UPDATE TO authenticated
    USING (public.xy_is_admin());

-- 5.7 xy_audit_logs RLS 策略
-- 仅管理员可读
CREATE POLICY select_xy_audit_logs ON public.xy_audit_logs
    FOR SELECT TO authenticated
    USING (public.xy_is_admin());

-- 仅允许管理员写入审计日志
CREATE POLICY insert_xy_audit_logs ON public.xy_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.xy_is_admin());


-- ==========================================
-- 1.8 点赞记录表 (xy_likes)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.xy_likes (
    id BIGSERIAL PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- 约束：不能自己点赞自己
    CONSTRAINT check_not_self_like CHECK (sender_id <> receiver_id)
);

-- 单日单人限赞 1 次的唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_xy_likes_sender_receiver_day 
ON public.xy_likes (sender_id, receiver_id, ((created_at AT TIME ZONE 'Asia/Shanghai')::date));


-- ==========================================
-- 1.9 消息通知表 (xy_messages)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.xy_messages (
    id BIGSERIAL PRIMARY KEY,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,       -- 消息接收者
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,         -- 消息发送者/触发者
    type VARCHAR(30) NOT NULL CHECK (type IN ('like', 'crush')),                  -- 消息类型：like (点赞), crush (心动)
    heart_request_id BIGINT REFERENCES public.xy_heart_requests(id) ON DELETE CASCADE, -- 心动申请外键（type为crush时关联）
    is_read BOOLEAN DEFAULT FALSE NOT NULL,                                       -- 是否已读
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==========================================
-- 2.1 新增索引优化
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_likes_receiver ON public.xy_likes(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON public.xy_messages(receiver_id, is_read);


-- ==========================================
-- 3.2 自动生成消息触发器函数
-- ==========================================

-- 当有新点赞时，自动向 xy_messages 写入 like 消息
CREATE OR REPLACE FUNCTION public.handle_new_like_message()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.xy_messages (receiver_id, sender_id, type)
  VALUES (new.receiver_id, new.sender_id, 'like');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_created ON public.xy_likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON public.xy_likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_like_message();


-- 当有新心动申请时，自动向 xy_messages 写入 crush 消息
CREATE OR REPLACE FUNCTION public.handle_new_crush_message()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.xy_messages (receiver_id, sender_id, type, heart_request_id)
  VALUES (new.receiver_id, new.sender_id, 'crush', new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_heart_request_created ON public.xy_heart_requests;
CREATE TRIGGER on_heart_request_created
  AFTER INSERT ON public.xy_heart_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_crush_message();


-- ==========================================
-- 5.8 xy_likes & xy_messages 行级安全策略 (RLS)
-- ==========================================

ALTER TABLE public.xy_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xy_messages ENABLE ROW LEVEL SECURITY;

-- xy_likes 读写策略
CREATE POLICY select_xy_likes ON public.xy_likes
    FOR SELECT TO authenticated
    USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id OR 
        public.xy_is_admin()
    );

CREATE POLICY insert_xy_likes ON public.xy_likes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = sender_id);

-- xy_messages 读写策略
CREATE POLICY select_xy_messages ON public.xy_messages
    FOR SELECT TO authenticated
    USING (
        auth.uid() = receiver_id OR 
        public.xy_is_admin()
    );

CREATE POLICY update_xy_messages ON public.xy_messages
    FOR UPDATE TO authenticated
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

