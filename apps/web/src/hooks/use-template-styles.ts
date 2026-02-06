'use client'

import { useEffect, useMemo } from 'react'
import { 
  ALBUM_TEMPLATES, 
  type AlbumTemplateStyle,
  getTemplateCSSVariables
} from '@/lib/album-templates'

/**
 * 获取模板配置
 */
export function getTemplateById(templateId: string | null): AlbumTemplateStyle | null {
  if (!templateId) return null
  return ALBUM_TEMPLATES[templateId] || null
}

/**
 * 应用模板样式到页面
 */
export function useTemplateStyles(templateId: string | null | undefined) {
  const template = useMemo(() => {
    if (!templateId) return null
    return ALBUM_TEMPLATES[templateId] || null
  }, [templateId])

  // 应用模板的 CSS 变量
  useEffect(() => {
    if (!template) return

    const root = document.documentElement
    const cssVars = getTemplateCSSVariables(template)
    
    // 保存原始值以便恢复
    const originalValues: Record<string, string> = {}
    
    // 应用模板样式
    // 设置主题模式
    if (template.theme.mode === 'light') {
      root.classList.add('template-light')
    } else {
      root.classList.remove('template-light')
    }
    
    // 设置模板特定的 CSS 变量
    Object.entries(cssVars).forEach(([key, value]) => {
      originalValues[key] = root.style.getPropertyValue(key)
      root.style.setProperty(key, value)
    })
    
    // 设置模板标记
    root.dataset.template = template.id
    
    // 清理函数：恢复原始值
    return () => {
      root.classList.remove('template-light')
      delete root.dataset.template
      
      Object.entries(cssVars).forEach(([key]) => {
        if (originalValues[key]) {
          root.style.setProperty(key, originalValues[key])
        } else {
          root.style.removeProperty(key)
        }
      })
    }
  }, [template])

  return template
}

/**
 * 获取模板的 className
 */
export function getTemplateClasses(template: AlbumTemplateStyle | null): string {
  if (!template) return ''
  
  const classes: string[] = []
  
  // 动画入场效果
  switch (template.animation.entrance) {
    case 'fade':
      classes.push('animate-fade-in')
      break
    case 'slide':
      classes.push('animate-slide-up')
      break
    case 'scale':
      classes.push('animate-scale-in')
      break
  }
  
  // 动画速度
  switch (template.animation.duration) {
    case 'fast':
      classes.push('duration-200')
      break
    case 'slow':
      classes.push('duration-700')
      break
    default:
      classes.push('duration-300')
  }
  
  return classes.join(' ')
}

/**
 * 获取照片容器的样式
 */
export function getPhotoContainerStyles(template: AlbumTemplateStyle | null): React.CSSProperties {
  if (!template) return {}
  
  const styles: React.CSSProperties = {}
  
  // 圆角
  switch (template.layout.rounded) {
    case 'sm':
      styles.borderRadius = '0.25rem'
      break
    case 'md':
      styles.borderRadius = '0.5rem'
      break
    case 'lg':
      styles.borderRadius = '1rem'
      break
    case 'full':
      styles.borderRadius = '9999px'
      break
  }
  
  // 阴影
  switch (template.layout.shadow) {
    case 'sm':
      styles.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)'
      break
    case 'md':
      styles.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
      break
    case 'lg':
      styles.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.15)'
      break
  }
  
  return styles
}

/**
 * 获取悬停效果类
 */
export function getHoverEffectClasses(template: AlbumTemplateStyle | null): string {
  if (!template) return ''
  
  switch (template.hover.effect) {
    case 'zoom':
      return 'group-hover:scale-105 transition-transform duration-300'
    case 'lift':
      return 'group-hover:-translate-y-1 group-hover:shadow-lg transition-all duration-300'
    case 'glow':
      return 'group-hover:ring-2 group-hover:ring-accent/50 transition-all duration-300'
    case 'overlay':
      return 'group-hover:opacity-90 transition-opacity duration-300'
    default:
      return ''
  }
}
