import { ApiError } from "@pli/api-client";

/** 错误映射（PRO Stage H）：用户不可见 raw error codes / HTTP 状态码，
 *  一律映射为人话（服务暂时不可用 / 没有权限）。 */

/** 读取失败的提示。 */
export function mapErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "PERMISSION_DENIED")
      return "没有查看此内容的权限。如需访问，请联系宠物主人授权。";
    if (err.status === 404 || err.code === "NOT_FOUND") return "页面不存在。";
    if (err.status === 401 || err.code === "UNAUTHORIZED") return "请先登录。";
    if (err.status === 422 || err.code === "VALIDATION_ERROR")
      return "提交的内容格式有误，请检查后重试。";
    return "服务暂时不可用，请稍后重试。";
  }
  if (err instanceof Error) {
    const msg = err.message;
    if (msg === "NO_PET_SELECTED") return "请先在上方选择患者。";
    if (msg.includes("timeout") || msg.includes("abort")) return "连接超时，请重试。";
    return "服务暂时不可用，请稍后重试。";
  }
  return "服务暂时不可用，请稍后重试。";
}

/** 写操作失败的提示（结局记录等）。 */
export function mapActionError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "PERMISSION_DENIED") return "没有执行此操作的权限。";
    if (err.status === 404 || err.code === "NOT_FOUND") return "页面不存在。";
    if (err.status === 422 || err.code === "VALIDATION_ERROR")
      return "提交的内容格式有误，请检查后重试。";
    return "操作未完成，请稍后重试。";
  }
  return "操作未完成，请稍后重试。";
}
