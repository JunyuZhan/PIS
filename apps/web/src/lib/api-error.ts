/**
 * API 错误处理兼容层
 * 
 * 重导出 validation/error-handler 中的错误处理函数
 */

export { handleError, createSuccessResponse } from './validation/error-handler'
// 导出 ApiError 帮助对象
export { ApiError as ApiErrorHelpers } from './validation/error-handler'
// 导出可构造的 ApiError 类
export { ApiError, handleApiError } from './api-utils'
