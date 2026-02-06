-- Migration: 009_add_style_templates.sql
-- Description: 添加自定义样式模板表
-- Date: 2026-02-06

-- 创建自定义样式模板表
CREATE TABLE IF NOT EXISTS style_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    -- 样式配置（JSON）
    theme_config JSONB NOT NULL DEFAULT '{}',
    typography_config JSONB NOT NULL DEFAULT '{}',
    layout_config JSONB NOT NULL DEFAULT '{}',
    hero_config JSONB NOT NULL DEFAULT '{}',
    hover_config JSONB NOT NULL DEFAULT '{}',
    animation_config JSONB NOT NULL DEFAULT '{}',
    -- 元数据
    thumbnail_url TEXT,
    is_builtin BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_style_templates_category ON style_templates(category);
CREATE INDEX IF NOT EXISTS idx_style_templates_is_public ON style_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_style_templates_sort_order ON style_templates(sort_order);

-- 添加表注释
COMMENT ON TABLE style_templates IS '自定义样式模板表，存储用户创建的相册视觉样式';
COMMENT ON COLUMN style_templates.theme_config IS '主题配置（mode, primaryColor, backgroundColor等）';
COMMENT ON COLUMN style_templates.typography_config IS '字体排版配置';
COMMENT ON COLUMN style_templates.layout_config IS '布局配置';
COMMENT ON COLUMN style_templates.hero_config IS '封面样式配置';
COMMENT ON COLUMN style_templates.hover_config IS '悬停效果配置';
COMMENT ON COLUMN style_templates.animation_config IS '动画效果配置';

SELECT 'Style templates table created successfully' as status;
