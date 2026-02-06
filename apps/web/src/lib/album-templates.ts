/**
 * 相册样式模板系统
 * 定义内置模板和样式配置
 */

/**
 * 模板样式配置
 */
export interface AlbumTemplateStyle {
  // 基础信息
  id: string
  name: string
  description: string
  category: 'wedding' | 'event' | 'portrait' | 'product' | 'travel' | 'general'
  thumbnail?: string
  
  // 主题颜色
  theme: {
    mode: 'light' | 'dark'
    primaryColor: string      // 主色调
    backgroundColor: string   // 背景色
    textColor: string         // 文字颜色
    accentColor: string       // 强调色
  }
  
  // 字体配置
  typography: {
    titleFont: string         // 标题字体
    bodyFont: string          // 正文字体
    titleSize: 'sm' | 'md' | 'lg' | 'xl'
    spacing: 'compact' | 'normal' | 'relaxed'
  }
  
  // 布局配置
  layout: {
    type: 'masonry' | 'grid' | 'story' | 'timeline' | 'carousel'
    columns: number           // 列数（桌面端）
    gap: 'none' | 'sm' | 'md' | 'lg'
    rounded: 'none' | 'sm' | 'md' | 'lg' | 'full'
    shadow: 'none' | 'sm' | 'md' | 'lg'
  }
  
  // 封面样式
  hero: {
    style: 'full' | 'split' | 'minimal' | 'overlay'
    height: 'sm' | 'md' | 'lg' | 'full'
    overlay: number           // 遮罩透明度 0-1
    titlePosition: 'center' | 'bottom-left' | 'bottom-center'
  }
  
  // 照片悬停效果
  hover: {
    effect: 'none' | 'zoom' | 'lift' | 'glow' | 'overlay'
    showInfo: boolean         // 悬停显示信息
  }
  
  // 动画效果
  animation: {
    entrance: 'none' | 'fade' | 'slide' | 'scale'
    duration: 'fast' | 'normal' | 'slow'
  }
}

/**
 * 内置相册模板
 */
export const ALBUM_TEMPLATES: Record<string, AlbumTemplateStyle> = {
  // 经典婚礼模板
  wedding_classic: {
    id: 'wedding_classic',
    name: '经典婚礼',
    description: '优雅浪漫的婚礼相册风格，深色背景突显照片',
    category: 'wedding',
    theme: {
      mode: 'dark',
      primaryColor: '#D4AF37',
      backgroundColor: '#0a0a0a',
      textColor: '#ffffff',
      accentColor: '#D4AF37',
    },
    typography: {
      titleFont: 'serif',
      bodyFont: 'sans',
      titleSize: 'lg',
      spacing: 'relaxed',
    },
    layout: {
      type: 'masonry',
      columns: 3,
      gap: 'md',
      rounded: 'none',
      shadow: 'md',
    },
    hero: {
      style: 'full',
      height: 'lg',
      overlay: 0.4,
      titlePosition: 'center',
    },
    hover: {
      effect: 'zoom',
      showInfo: false,
    },
    animation: {
      entrance: 'fade',
      duration: 'normal',
    },
  },

  // 现代婚礼模板
  wedding_modern: {
    id: 'wedding_modern',
    name: '现代婚礼',
    description: '简约现代的婚礼相册，白色背景清新明亮',
    category: 'wedding',
    theme: {
      mode: 'light',
      primaryColor: '#1a1a1a',
      backgroundColor: '#ffffff',
      textColor: '#1a1a1a',
      accentColor: '#c9a86c',
    },
    typography: {
      titleFont: 'serif',
      bodyFont: 'sans',
      titleSize: 'md',
      spacing: 'normal',
    },
    layout: {
      type: 'grid',
      columns: 3,
      gap: 'lg',
      rounded: 'sm',
      shadow: 'sm',
    },
    hero: {
      style: 'minimal',
      height: 'md',
      overlay: 0.2,
      titlePosition: 'bottom-left',
    },
    hover: {
      effect: 'lift',
      showInfo: true,
    },
    animation: {
      entrance: 'slide',
      duration: 'normal',
    },
  },

  // 活动相册模板
  event_vibrant: {
    id: 'event_vibrant',
    name: '活力活动',
    description: '充满活力的活动相册，适合派对、庆典等场合',
    category: 'event',
    theme: {
      mode: 'dark',
      primaryColor: '#6366f1',
      backgroundColor: '#0f0f23',
      textColor: '#ffffff',
      accentColor: '#818cf8',
    },
    typography: {
      titleFont: 'sans',
      bodyFont: 'sans',
      titleSize: 'xl',
      spacing: 'compact',
    },
    layout: {
      type: 'masonry',
      columns: 4,
      gap: 'sm',
      rounded: 'md',
      shadow: 'lg',
    },
    hero: {
      style: 'overlay',
      height: 'md',
      overlay: 0.5,
      titlePosition: 'center',
    },
    hover: {
      effect: 'glow',
      showInfo: true,
    },
    animation: {
      entrance: 'scale',
      duration: 'fast',
    },
  },

  // 企业活动模板
  event_corporate: {
    id: 'event_corporate',
    name: '商务活动',
    description: '专业简洁的商务活动相册，适合会议、发布会等',
    category: 'event',
    theme: {
      mode: 'light',
      primaryColor: '#1e3a5f',
      backgroundColor: '#f8fafc',
      textColor: '#1e293b',
      accentColor: '#3b82f6',
    },
    typography: {
      titleFont: 'sans',
      bodyFont: 'sans',
      titleSize: 'md',
      spacing: 'normal',
    },
    layout: {
      type: 'grid',
      columns: 3,
      gap: 'md',
      rounded: 'sm',
      shadow: 'sm',
    },
    hero: {
      style: 'split',
      height: 'sm',
      overlay: 0.3,
      titlePosition: 'bottom-left',
    },
    hover: {
      effect: 'lift',
      showInfo: false,
    },
    animation: {
      entrance: 'fade',
      duration: 'fast',
    },
  },

  // 人像写真模板
  portrait_artistic: {
    id: 'portrait_artistic',
    name: '艺术人像',
    description: '艺术感十足的人像写真相册，黑白经典风格',
    category: 'portrait',
    theme: {
      mode: 'dark',
      primaryColor: '#ffffff',
      backgroundColor: '#000000',
      textColor: '#ffffff',
      accentColor: '#888888',
    },
    typography: {
      titleFont: 'serif',
      bodyFont: 'serif',
      titleSize: 'lg',
      spacing: 'relaxed',
    },
    layout: {
      type: 'story',
      columns: 2,
      gap: 'lg',
      rounded: 'none',
      shadow: 'none',
    },
    hero: {
      style: 'full',
      height: 'full',
      overlay: 0.3,
      titlePosition: 'bottom-center',
    },
    hover: {
      effect: 'none',
      showInfo: false,
    },
    animation: {
      entrance: 'fade',
      duration: 'slow',
    },
  },

  // 清新人像模板
  portrait_fresh: {
    id: 'portrait_fresh',
    name: '清新人像',
    description: '清新自然的人像相册，适合日系、小清新风格',
    category: 'portrait',
    theme: {
      mode: 'light',
      primaryColor: '#2d3436',
      backgroundColor: '#fefefe',
      textColor: '#2d3436',
      accentColor: '#74b9ff',
    },
    typography: {
      titleFont: 'sans',
      bodyFont: 'sans',
      titleSize: 'sm',
      spacing: 'relaxed',
    },
    layout: {
      type: 'masonry',
      columns: 3,
      gap: 'lg',
      rounded: 'lg',
      shadow: 'sm',
    },
    hero: {
      style: 'minimal',
      height: 'sm',
      overlay: 0.1,
      titlePosition: 'center',
    },
    hover: {
      effect: 'zoom',
      showInfo: false,
    },
    animation: {
      entrance: 'slide',
      duration: 'normal',
    },
  },

  // 产品展示模板
  product_showcase: {
    id: 'product_showcase',
    name: '产品展示',
    description: '专业的产品展示相册，突出产品细节',
    category: 'product',
    theme: {
      mode: 'light',
      primaryColor: '#111111',
      backgroundColor: '#ffffff',
      textColor: '#111111',
      accentColor: '#ff6b6b',
    },
    typography: {
      titleFont: 'sans',
      bodyFont: 'sans',
      titleSize: 'md',
      spacing: 'compact',
    },
    layout: {
      type: 'grid',
      columns: 4,
      gap: 'sm',
      rounded: 'md',
      shadow: 'lg',
    },
    hero: {
      style: 'split',
      height: 'md',
      overlay: 0.2,
      titlePosition: 'bottom-left',
    },
    hover: {
      effect: 'zoom',
      showInfo: true,
    },
    animation: {
      entrance: 'scale',
      duration: 'fast',
    },
  },

  // 旅行相册模板
  travel_adventure: {
    id: 'travel_adventure',
    name: '旅行探险',
    description: '充满冒险气息的旅行相册，时间线布局',
    category: 'travel',
    theme: {
      mode: 'dark',
      primaryColor: '#f39c12',
      backgroundColor: '#1a1a2e',
      textColor: '#ecf0f1',
      accentColor: '#e74c3c',
    },
    typography: {
      titleFont: 'serif',
      bodyFont: 'sans',
      titleSize: 'lg',
      spacing: 'normal',
    },
    layout: {
      type: 'timeline',
      columns: 2,
      gap: 'md',
      rounded: 'sm',
      shadow: 'md',
    },
    hero: {
      style: 'full',
      height: 'lg',
      overlay: 0.4,
      titlePosition: 'center',
    },
    hover: {
      effect: 'overlay',
      showInfo: true,
    },
    animation: {
      entrance: 'slide',
      duration: 'normal',
    },
  },
}

/**
 * 获取模板分类
 */
export const TEMPLATE_CATEGORIES = [
  { id: 'wedding', name: '婚礼', icon: '💒' },
  { id: 'event', name: '活动', icon: '🎉' },
  { id: 'portrait', name: '人像', icon: '👤' },
  { id: 'product', name: '产品', icon: '📦' },
  { id: 'travel', name: '旅行', icon: '✈️' },
  { id: 'general', name: '通用', icon: '📷' },
] as const

/**
 * 获取指定分类的模板
 */
export function getTemplatesByCategory(category: string): AlbumTemplateStyle[] {
  return Object.values(ALBUM_TEMPLATES).filter(t => t.category === category)
}

/**
 * 获取模板的 CSS 变量
 */
export function getTemplateCSSVariables(template: AlbumTemplateStyle): Record<string, string> {
  return {
    '--template-primary': template.theme.primaryColor,
    '--template-bg': template.theme.backgroundColor,
    '--template-text': template.theme.textColor,
    '--template-accent': template.theme.accentColor,
    '--template-gap': template.layout.gap === 'none' ? '0' : 
                      template.layout.gap === 'sm' ? '0.5rem' :
                      template.layout.gap === 'md' ? '1rem' : '1.5rem',
    '--template-rounded': template.layout.rounded === 'none' ? '0' :
                          template.layout.rounded === 'sm' ? '0.25rem' :
                          template.layout.rounded === 'md' ? '0.5rem' :
                          template.layout.rounded === 'lg' ? '1rem' : '9999px',
  }
}

/**
 * 获取模板的 Tailwind 类名
 */
export function getTemplateClasses(template: AlbumTemplateStyle): string {
  const classes: string[] = []
  
  // 布局类型
  switch (template.layout.type) {
    case 'grid':
      classes.push('grid')
      break
    case 'masonry':
      classes.push('columns-1 sm:columns-2 md:columns-3')
      break
  }
  
  // 间距
  switch (template.layout.gap) {
    case 'sm':
      classes.push('gap-2')
      break
    case 'md':
      classes.push('gap-4')
      break
    case 'lg':
      classes.push('gap-6')
      break
  }
  
  return classes.join(' ')
}
