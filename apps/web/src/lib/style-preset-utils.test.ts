import { describe, it, expect } from 'vitest'
import { getStylePresetCSSFilter } from './style-preset-utils'

describe('style-preset-utils', () => {
  describe('getStylePresetCSSFilter', () => {
    it('应该返回 none 当没有预设时', () => {
      expect(getStylePresetCSSFilter(null)).toBe('none')
      expect(getStylePresetCSSFilter(undefined)).toBe('none')
      expect(getStylePresetCSSFilter({})).toBe('none')
      expect(getStylePresetCSSFilter({ preset: null })).toBe('none')
      expect(getStylePresetCSSFilter({ preset: 'none' })).toBe('none')
    })

    it('应该返回正确的 CSS 滤镜字符串', () => {
      expect(getStylePresetCSSFilter({ preset: 'japanese-fresh' })).toContain('brightness')
      expect(getStylePresetCSSFilter({ preset: 'film-portrait' })).toContain('contrast')
      expect(getStylePresetCSSFilter({ preset: 'cinematic-portrait' })).toContain('saturate')
    })

    it('应该支持所有预设类型', () => {
      const presets = [
        'japanese-fresh',
        'film-portrait',
        'cinematic-portrait',
        'realistic-portrait',
        'warm-portrait',
        'natural-landscape',
        'cinematic-landscape',
        'film-landscape',
        'vibrant-landscape',
        'golden-hour',
        'black-white',
        'vintage',
        'cool',
      ]

      presets.forEach((preset) => {
        const filter = getStylePresetCSSFilter({ preset })
        expect(filter).not.toBe('none')
        expect(typeof filter).toBe('string')
      })
    })

    it('应该返回 none 对于未知预设', () => {
      expect(getStylePresetCSSFilter({ preset: 'unknown-preset' })).toBe('none')
    })

    it('应该处理黑白预设的特殊情况', () => {
      const filter = getStylePresetCSSFilter({ preset: 'black-white' })
      expect(filter).toContain('grayscale')
    })
  })
})
