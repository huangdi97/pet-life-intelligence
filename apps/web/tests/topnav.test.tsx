import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
  apiMock: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("@pli/api-client", () => ({
  api: apiMock,
  ApiError: class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number) {
      super(code);
      this.code = code;
      this.status = status;
    }
  },
  clearSession: vi.fn(),
  getDevUserId: () => "dev-user",
  setDevUserId: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useParams: () => ({}),
}));

import TopNav from "../components/TopNav";

/** Stage H 契约 E.22 + IA：TopNav 5 项导航（E2E .topnav 契约）+ 宠物切换器。 */
describe("TopNav (navigation)", () => {
  it("renders the 5 primary nav entries", () => {
    apiMock.get.mockResolvedValue([]);
    render(<TopNav />);
    expect(screen.getByText("今日")).toBeTruthy();
    expect(screen.getByText("时间线")).toBeTruthy();
    expect(screen.getByText("宠物")).toBeTruthy();
    expect(screen.getByText("助手")).toBeTruthy();
    expect(screen.getByText("我的")).toBeTruthy();
  });

  it("renders pet switcher select when logged in (E2E .topnav select contract)", () => {
    apiMock.get.mockResolvedValue([]);
    render(<TopNav />);
    expect(screen.getByLabelText(/切换当前宠物/)).toBeTruthy();
  });

  it("renders logout for logged-in user (permission)", () => {
    apiMock.get.mockResolvedValue([]);
    render(<TopNav />);
    expect(screen.getByText("退出")).toBeTruthy();
  });
});
