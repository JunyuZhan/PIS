-- Migration: 010_add_audit_logs.sql
-- Description: 添加操作日志表，记录系统中的关键操作
-- Date: 2026-02-06

-- 创建操作日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- 操作者信息
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    -- 操作信息
    action VARCHAR(100) NOT NULL,            -- 操作类型：create, update, delete, login, logout, etc.
    resource_type VARCHAR(100) NOT NULL,     -- 资源类型：album, photo, user, customer, etc.
    resource_id VARCHAR(255),                -- 资源 ID
    resource_name VARCHAR(500),              -- 资源名称（便于显示）
    -- 详细信息
    description TEXT,                        -- 操作描述
    changes JSONB DEFAULT '{}',              -- 变更详情（旧值/新值）
    metadata JSONB DEFAULT '{}',             -- 额外元数据
    -- 请求信息
    ip_address VARCHAR(45),                  -- IPv4 或 IPv6
    user_agent TEXT,                         -- 浏览器/客户端信息
    request_method VARCHAR(10),              -- HTTP 方法
    request_path TEXT,                       -- 请求路径
    -- 状态
    status VARCHAR(20) DEFAULT 'success',    -- success, failed, pending
    error_message TEXT,                      -- 错误信息（如果失败）
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- 复合索引（常用查询）
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- 添加表注释
COMMENT ON TABLE audit_logs IS '操作日志表，记录系统中的关键操作';
COMMENT ON COLUMN audit_logs.action IS '操作类型（create/update/delete/login/logout等）';
COMMENT ON COLUMN audit_logs.resource_type IS '资源类型（album/photo/user/customer等）';
COMMENT ON COLUMN audit_logs.changes IS '变更详情，包含 before 和 after 字段';
COMMENT ON COLUMN audit_logs.metadata IS '额外元数据，如批量操作的数量等';

-- 创建自动清理旧日志的函数（保留90天）
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

SELECT 'Audit logs table created successfully' as status;
