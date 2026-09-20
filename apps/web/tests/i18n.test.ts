import { describe, expect, it } from "vitest";
import { ApiError } from "@pli/api-client";
import { mapErrorMessage } from "../lib/i18n";

/** Stage H 契约 E.22 + COPY_GUIDELINES §6：错误映射（用户不可见 raw codes）。 */
function apiError(code: string, status: number, message = ""): ApiError {
  return new ApiError(status, { code, message, request_id: "test" });
}

describe("mapErrorMessage", () => {
  it("maps PERMISSION_DENIED to human language", () => {
    const out = mapErrorMessage(apiError("PERMISSION_DENIED", 403));
    expect(out).toContain("没有查看此内容的权限");
  });

  it("maps 404 to 页面不存在", () => {
    const out = mapErrorMessage(apiError("NOT_FOUND", 404));
    expect(out).toBe("页面不存在");
  });

  it("maps 500 to 服务暂时不可用", () => {
    const out = mapErrorMessage(apiError("INTERNAL", 500));
    expect(out).toContain("服务暂时不可用");
  });

  it("never exposes raw EXTERNAL_BLOCKED code", () => {
    const out = mapErrorMessage(apiError("EXTERNAL_BLOCKED", 400));
    expect(out).not.toContain("EXTERNAL_BLOCKED");
    expect(out).toContain("暂未开放");
  });

  it("maps NO_PET_SELECTED Error", () => {
    const out = mapErrorMessage(new Error("NO_PET_SELECTED"));
    expect(out).toContain("请先");
  });

  it("maps network errors to 服务暂时不可用", () => {
    const out = mapErrorMessage(new Error("Failed to fetch"));
    expect(out).toContain("服务暂时不可用");
  });
});
