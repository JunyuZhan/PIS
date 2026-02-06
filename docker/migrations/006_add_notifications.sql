-- ============================================
-- 通知记录表迁移脚本
-- 用于记录发送给客户的通知
-- ============================================

-- 创建通知记录表
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    album_id UUID REFERENCES albums(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,                    -- 通知类型: album_ready, reminder, custom
    channel VARCHAR(20) NOT NULL,                 -- 发送渠道: email, sms
    recipient VARCHAR(255) NOT NULL,              -- 接收者（邮箱或手机号）
    subject VARCHAR(500),                         -- 主题
    content TEXT,                                 -- 内容
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 状态: pending, sent, failed
    sent_at TIMESTAMP WITH TIME ZONE,            -- 发送时间
    error_message TEXT,                          -- 错误信息
    metadata JSONB DEFAULT '{}',                 -- 附加元数据
    created_by UUID REFERENCES users(id),        -- 创建人
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_album_id ON notifications(album_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 添加注释
COMMENT ON TABLE notifications IS '客户通知记录表';
COMMENT ON COLUMN notifications.type IS '通知类型: album_ready-相册就绪, reminder-提醒, custom-自定义';
COMMENT ON COLUMN notifications.channel IS '发送渠道: email-邮件, sms-短信';
COMMENT ON COLUMN notifications.status IS '发送状态: pending-待发送, sent-已发送, failed-失败';

-- 创建邮件配置表（存储 SMTP 设置）
CREATE TABLE IF NOT EXISTS email_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_secure BOOLEAN DEFAULT true,
    smtp_user VARCHAR(255),
    smtp_pass VARCHAR(255),                      -- 加密存储
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE email_config IS '邮件服务配置';
