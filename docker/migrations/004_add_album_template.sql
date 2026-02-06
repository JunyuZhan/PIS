-- ============================================
-- 迁移脚本: 添加相册模板字段
-- 版本: 004
-- 描述: 为 albums 表添加样式模板支持
-- ============================================

-- 添加 template_id 字段到 albums 表
-- 用于存储选择的模板 ID（如 'wedding_classic', 'event_vibrant' 等）
ALTER TABLE albums
ADD COLUMN IF NOT EXISTS template_id VARCHAR(100) DEFAULT NULL;

-- 添加 template_config 字段用于存储自定义模板配置（覆盖默认模板的某些选项）
ALTER TABLE albums
ADD COLUMN IF NOT EXISTS template_config JSONB DEFAULT '{}';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_albums_template_id ON albums(template_id);

-- 更新说明
COMMENT ON COLUMN albums.template_id IS '相册样式模板 ID，如 wedding_classic, event_vibrant 等';
COMMENT ON COLUMN albums.template_config IS '自定义模板配置，用于覆盖默认模板的某些选项';

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 迁移 004 完成: 已添加相册模板支持字段';
    RAISE NOTICE '   - template_id: 模板 ID';
    RAISE NOTICE '   - template_config: 自定义模板配置';
END $$;
