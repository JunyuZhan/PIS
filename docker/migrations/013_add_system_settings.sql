-- ============================================
-- 迁移脚本：添加系统设置表
-- 版本：1.1.0
-- 日期：2026-02-06
-- 
-- 说明：此脚本为已部署的系统添加 system_settings 表
-- 用法：在数据库中执行此脚本
-- ============================================

-- 创建系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}',
    category VARCHAR(50) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public) WHERE is_public = true;

-- 创建更新时间触发器
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 初始化默认设置（品牌）
INSERT INTO system_settings (key, value, category, description, is_public) VALUES
('brand_name', '"PIS Photography"', 'brand', '品牌/工作室名称', true),
('brand_tagline', '"专业活动摄影"', 'brand', '品牌标语', true),
('brand_logo', 'null', 'brand', 'Logo 图片 URL', true),
('brand_favicon', 'null', 'brand', 'Favicon URL', true),
('copyright_text', '""', 'brand', '版权声明文字', true),
('icp_number', '""', 'brand', 'ICP 备案号', true),
('police_number', '""', 'brand', '公安备案号', true)
ON CONFLICT (key) DO NOTHING;

-- 初始化默认设置（站点）
INSERT INTO system_settings (key, value, category, description, is_public) VALUES
('site_title', '"PIS - 即时影像分享"', 'site', '站点标题', true),
('site_description', '"专业级私有化即时摄影分享系统"', 'site', '站点描述', true),
('site_keywords', '"摄影,相册,分享,活动摄影"', 'site', 'SEO 关键词', true)
ON CONFLICT (key) DO NOTHING;

-- 初始化默认设置（功能）
INSERT INTO system_settings (key, value, category, description, is_public) VALUES
('allow_public_home', 'true', 'feature', '允许游客访问首页', false),
('default_watermark_enabled', 'false', 'feature', '新相册默认启用水印', false),
('default_allow_download', 'true', 'feature', '新相册默认允许下载', false),
('default_show_exif', 'true', 'feature', '新相册默认显示 EXIF', false),
('polling_interval', '3000', 'feature', '轮询间隔（毫秒）', false)
ON CONFLICT (key) DO NOTHING;

-- 初始化默认设置（社交）
INSERT INTO system_settings (key, value, category, description, is_public) VALUES
('social_wechat_qrcode', 'null', 'social', '微信二维码', true),
('social_weibo', '""', 'social', '微博链接', true),
('social_instagram', '""', 'social', 'Instagram', true),
('social_email', '""', 'social', '联系邮箱', true),
('social_phone', '""', 'social', '联系电话', true)
ON CONFLICT (key) DO NOTHING;

-- 初始化默认设置（主题）
INSERT INTO system_settings (key, value, category, description, is_public) VALUES
('theme_mode', '"system"', 'theme', '主题模式', true),
('theme_primary_color', '"#D4AF37"', 'theme', '主色调', true)
ON CONFLICT (key) DO NOTHING;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 系统设置表迁移完成！';
    RAISE NOTICE '   已创建 system_settings 表并初始化默认设置';
END $$;
