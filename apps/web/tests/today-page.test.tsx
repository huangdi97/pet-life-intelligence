import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pet } from "@pli/api-client";

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
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useParams: () => ({}),
}));

import TodayPage from "../app/page";

const PETS: Pet[] = [
  {
    id: "pet-1",
    household_id: "hh-1",
    name: "豆豆",
    species: "猫",
    breed: "狸花",
    sex: "F",
    birth_date: null,
    neutered: null,
    weight_note: "",
    timezone: "Asia/Shanghai",
    avatar_artifact_id: null,
    created_at: "2026-01-01T00:00:00Z",
  },
];

describe("TodayPage (state rendering)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("pli_current_pet", "pet-1");
    vi.clearAllMocks();
  });

  it("renders product homepage structure with quick log (populated)", async () => {
    apiMock.get.mockImplementation((path: string) => {
      if (path === "/pets") return Promise.resolve(PETS);
      if (path.includes("/today"))
        return Promise.resolve({
          pet: { id: "pet-1", name: "豆豆", species: "猫" },
          date: "2026-09-19",
          event_counts: { "daily.meal": 2 },
          events: [],
        });
      if (path.includes("/tasks")) return Promise.resolve([]);
      if (path.includes("abnormal-day-hint")) return Promise.resolve({ hints: [] });
      return Promise.reject(new Error("unknown path " + path));
    });
    render(<TodayPage />);
    await waitFor(() => expect(screen.getByText("豆豆 今天怎么样？")).toBeTruthy());
    expect(screen.getByRole("button", { name: "喂食" })).toBeTruthy();
    expect(screen.getByText("最近")).toBeTruthy();
  });

  it("renders 还没有宠物 empty state when no pets (empty)", async () => {
    apiMock.get.mockResolvedValue([]);
    render(<TodayPage />);
    await waitFor(() => expect(screen.getByText(/还没有宠物/)).toBeTruthy());
    expect(screen.getByText("创建宠物档案")).toBeTruthy();
  });

  it("maps API failure to human language, never raw codes (error)", async () => {
    apiMock.get.mockImplementation((path: string) => {
      if (path === "/pets") return Promise.resolve(PETS);
      if (path.includes("/today")) return Promise.reject(new Error("Failed to fetch"));
      if (path.includes("/tasks")) return Promise.resolve([]);
      if (path.includes("abnormal-day-hint")) return Promise.resolve({ hints: [] });
      return Promise.reject(new Error("unknown path " + path));
    });
    render(<TodayPage />);
    await waitFor(() => expect(screen.getAllByText(/服务暂时不可用/).length).toBeGreaterThan(0));
    expect(document.body.textContent).not.toContain("Failed to fetch");
  });
});
