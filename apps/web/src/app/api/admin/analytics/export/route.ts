import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/database'
import { requireAdmin } from '@/lib/auth/role-helpers'
import { ApiError } from '@/lib/validation/error-handler'

interface ExportRow {
  date: string
  views: number
  visitors: number
  photo_views: number
  downloads: number
}

/**
 * GET /api/admin/analytics/export
 * 导出统计数据
 * 
 * Query params:
 * - period: 7d | 30d | 90d | all (默认 30d)
 * - format: csv | json (默认 csv)
 * - type: summary | daily | devices | browsers | albums | all (默认 all)
 */
export async function GET(request: NextRequest) {
  // 验证管理员权限
  const admin = await requireAdmin(request)
  if (!admin) {
    return ApiError.forbidden('需要管理员权限')
  }

  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'
    const format = searchParams.get('format') || 'csv'
    const type = searchParams.get('type') || 'all'

    const db = await createAdminClient()

    // 计算时间范围
    let startDate: Date
    let periodLabel: string
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        periodLabel = '近7天'
        break
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        periodLabel = '近90天'
        break
      case 'all':
        startDate = new Date('2000-01-01')
        periodLabel = '全部'
        break
      default: // 30d
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        periodLabel = '近30天'
    }

    const startDateStr = startDate.toISOString()
    const exportDate = new Date().toISOString().split('T')[0]

    // 收集导出数据
    const exportData: Record<string, unknown> = {
      exportDate,
      period: periodLabel,
      startDate: startDateStr,
    }

    // 获取汇总数据
    if (type === 'summary' || type === 'all') {
      const { data: totalViews } = await db.query(`
        SELECT COUNT(*) as count FROM album_views WHERE viewed_at >= $1
      `, [startDateStr])
      
      const { data: uniqueVisitors } = await db.query(`
        SELECT COUNT(DISTINCT session_id) as count FROM album_views WHERE viewed_at >= $1
      `, [startDateStr])
      
      const { data: photoViews } = await db.query(`
        SELECT COUNT(*) as count FROM photo_views WHERE viewed_at >= $1
      `, [startDateStr])
      
      const { data: downloads } = await db.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(file_count), 0) as files
        FROM download_logs WHERE downloaded_at >= $1
      `, [startDateStr])

      exportData.summary = {
        totalViews: parseInt(totalViews?.[0]?.count || '0'),
        uniqueVisitors: parseInt(uniqueVisitors?.[0]?.count || '0'),
        photoViews: parseInt(photoViews?.[0]?.count || '0'),
        downloads: parseInt(downloads?.[0]?.count || '0'),
        downloadedFiles: parseInt(downloads?.[0]?.files || '0'),
      }
    }

    // 获取每日趋势数据
    if (type === 'daily' || type === 'all') {
      const { data: dailyViews } = await db.query(`
        SELECT 
          DATE(viewed_at) as date,
          COUNT(*) as views,
          COUNT(DISTINCT session_id) as visitors
        FROM album_views 
        WHERE viewed_at >= $1
        GROUP BY DATE(viewed_at)
        ORDER BY date ASC
      `, [startDateStr])

      const { data: dailyPhotoViews } = await db.query(`
        SELECT 
          DATE(viewed_at) as date,
          COUNT(*) as photo_views
        FROM photo_views 
        WHERE viewed_at >= $1
        GROUP BY DATE(viewed_at)
        ORDER BY date ASC
      `, [startDateStr])

      const { data: dailyDownloads } = await db.query(`
        SELECT 
          DATE(downloaded_at) as date,
          COUNT(*) as downloads
        FROM download_logs 
        WHERE downloaded_at >= $1
        GROUP BY DATE(downloaded_at)
        ORDER BY date ASC
      `, [startDateStr])

      // 合并每日数据
      const dateMap = new Map<string, ExportRow>()
      
      for (const row of dailyViews || []) {
        const dateStr = new Date(row.date).toISOString().split('T')[0]
        dateMap.set(dateStr, {
          date: dateStr,
          views: parseInt(row.views),
          visitors: parseInt(row.visitors),
          photo_views: 0,
          downloads: 0,
        })
      }
      
      for (const row of dailyPhotoViews || []) {
        const dateStr = new Date(row.date).toISOString().split('T')[0]
        const existing = dateMap.get(dateStr)
        if (existing) {
          existing.photo_views = parseInt(row.photo_views)
        } else {
          dateMap.set(dateStr, {
            date: dateStr,
            views: 0,
            visitors: 0,
            photo_views: parseInt(row.photo_views),
            downloads: 0,
          })
        }
      }
      
      for (const row of dailyDownloads || []) {
        const dateStr = new Date(row.date).toISOString().split('T')[0]
        const existing = dateMap.get(dateStr)
        if (existing) {
          existing.downloads = parseInt(row.downloads)
        } else {
          dateMap.set(dateStr, {
            date: dateStr,
            views: 0,
            visitors: 0,
            photo_views: 0,
            downloads: parseInt(row.downloads),
          })
        }
      }

      exportData.dailyTrend = Array.from(dateMap.values()).sort((a, b) => 
        a.date.localeCompare(b.date)
      )
    }

    // 获取设备统计
    if (type === 'devices' || type === 'all') {
      const { data: deviceStats } = await db.query(`
        SELECT device_type, COUNT(*) as count
        FROM album_views WHERE viewed_at >= $1
        GROUP BY device_type ORDER BY count DESC
      `, [startDateStr])
      
      exportData.deviceStats = deviceStats || []
    }

    // 获取浏览器统计
    if (type === 'browsers' || type === 'all') {
      const { data: browserStats } = await db.query(`
        SELECT browser, COUNT(*) as count
        FROM album_views WHERE viewed_at >= $1
        GROUP BY browser ORDER BY count DESC
      `, [startDateStr])
      
      exportData.browserStats = browserStats || []
    }

    // 获取相册统计
    if (type === 'albums' || type === 'all') {
      const { data: albumStats } = await db.query(`
        SELECT 
          av.album_id,
          a.title,
          a.slug,
          COUNT(*) as views,
          COUNT(DISTINCT av.session_id) as visitors
        FROM album_views av
        JOIN albums a ON av.album_id = a.id
        WHERE av.viewed_at >= $1
        GROUP BY av.album_id, a.title, a.slug
        ORDER BY views DESC
      `, [startDateStr])
      
      exportData.albumStats = albumStats || []
    }

    // 根据格式返回
    if (format === 'json') {
      return NextResponse.json(exportData, {
        headers: {
          'Content-Disposition': `attachment; filename="analytics-${exportDate}.json"`,
        },
      })
    }

    // CSV 格式
    const csvLines: string[] = []
    
    // 添加报表头
    csvLines.push(`# PIS 数据统计报表`)
    csvLines.push(`# 导出日期: ${exportDate}`)
    csvLines.push(`# 统计周期: ${periodLabel}`)
    csvLines.push(``)

    // 汇总数据
    if (exportData.summary) {
      const summary = exportData.summary as Record<string, number>
      csvLines.push(`## 数据汇总`)
      csvLines.push(`指标,数值`)
      csvLines.push(`总访问量,${summary.totalViews}`)
      csvLines.push(`独立访客,${summary.uniqueVisitors}`)
      csvLines.push(`照片查看,${summary.photoViews}`)
      csvLines.push(`下载次数,${summary.downloads}`)
      csvLines.push(`下载文件数,${summary.downloadedFiles}`)
      csvLines.push(``)
    }

    // 每日趋势
    if (exportData.dailyTrend) {
      const daily = exportData.dailyTrend as ExportRow[]
      csvLines.push(`## 每日趋势`)
      csvLines.push(`日期,访问量,独立访客,照片查看,下载次数`)
      for (const row of daily) {
        csvLines.push(`${row.date},${row.views},${row.visitors},${row.photo_views},${row.downloads}`)
      }
      csvLines.push(``)
    }

    // 设备统计
    if (exportData.deviceStats) {
      const devices = exportData.deviceStats as Array<{ device_type: string; count: number }>
      csvLines.push(`## 设备类型`)
      csvLines.push(`设备类型,访问次数`)
      for (const row of devices) {
        const deviceName = row.device_type === 'desktop' ? '电脑' : 
                          row.device_type === 'mobile' ? '手机' : 
                          row.device_type === 'tablet' ? '平板' : row.device_type || '未知'
        csvLines.push(`${deviceName},${row.count}`)
      }
      csvLines.push(``)
    }

    // 浏览器统计
    if (exportData.browserStats) {
      const browsers = exportData.browserStats as Array<{ browser: string; count: number }>
      csvLines.push(`## 浏览器分布`)
      csvLines.push(`浏览器,访问次数`)
      for (const row of browsers) {
        csvLines.push(`${row.browser || '未知'},${row.count}`)
      }
      csvLines.push(``)
    }

    // 相册统计
    if (exportData.albumStats) {
      const albums = exportData.albumStats as Array<{ title: string; views: number; visitors: number }>
      csvLines.push(`## 相册排行`)
      csvLines.push(`相册名称,访问量,独立访客`)
      for (const row of albums) {
        csvLines.push(`"${row.title}",${row.views},${row.visitors}`)
      }
    }

    const csvContent = csvLines.join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="analytics-${exportDate}.csv"`,
      },
    })
  } catch (error) {
    console.error('导出统计数据失败:', error)
    return ApiError.internal('导出统计数据失败')
  }
}
