-- Migration: 008_add_custom_translations.sql
-- Description: 添加自定义翻译表，支持用户覆盖默认翻译字符串
-- Date: 2026-02-06

-- 创建自定义翻译表
CREATE TABLE IF NOT EXISTS custom_translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locale VARCHAR(10) NOT NULL,              -- 语言代码，如 'zh-CN', 'en'
    namespace VARCHAR(100) NOT NULL,          -- 命名空间，如 'common', 'admin', 'album'
    key VARCHAR(255) NOT NULL,                -- 翻译键，如 'title', 'description'
    value TEXT NOT NULL,                      -- 翻译值
    is_active BOOLEAN DEFAULT true,           -- 是否启用（启用后覆盖默认翻译）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(locale, namespace, key)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_custom_translations_locale ON custom_translations(locale);
CREATE INDEX IF NOT EXISTS idx_custom_translations_namespace ON custom_translations(namespace);
CREATE INDEX IF NOT EXISTS idx_custom_translations_active ON custom_translations(is_active);

-- 添加表注释
COMMENT ON TABLE custom_translations IS '自定义翻译表，用于覆盖默认翻译字符串';
COMMENT ON COLUMN custom_translations.locale IS '语言代码（如 zh-CN, en）';
COMMENT ON COLUMN custom_translations.namespace IS '翻译命名空间（如 common, admin, album）';
COMMENT ON COLUMN custom_translations.key IS '翻译键（支持点号分隔的嵌套键，如 header.title）';
COMMENT ON COLUMN custom_translations.value IS '翻译值';
COMMENT ON COLUMN custom_translations.is_active IS '是否启用此翻译覆盖';

-- 插入一些示例翻译（可选，用于测试）
-- INSERT INTO custom_translations (locale, namespace, key, value) VALUES
--     ('zh-CN', 'common', 'siteName', '我的照片影集'),
--     ('en', 'common', 'siteName', 'My Photo Album');

SELECT 'Custom translations table created successfully' as status;
