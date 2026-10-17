import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    lifecycle_status: "ACTIVE",
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
    // R2-P: the pet stage is the first visual — name + real-data headline.
    await waitFor(() => expect(screen.getByText("豆豆")).toBeTruthy());
    expect(screen.getByText("今天记录了 2 件生活片段")).toBeTruthy();
    expect(screen.getByRole("button", { name: /快速记录/ })).toBeTruthy();
    expect(screen.getByText("最近")).toBeTruthy();
  });

  it("renders 还没有宠物 empty state when no pets (empty)", async () => {
    apiMock.get.mockResolvedValue([]);
    render(<TodayPage />);
    await waitFor(() => expect(screen.getByText(/还没有宠物/)).toBeTruthy());
    expect(screen.getByText("创建宠物档案")).toBeTruthy();
  });

  it("does not misrepresent an API failure as a pet-free household", async () => {
    apiMock.get.mockRejectedValue(new Error("Failed to fetch"));
    render(<TodayPage />);
    await waitFor(() => expect(screen.getByTestId("pli.today.pets-error")).toBeTruthy());
    expect(screen.queryByTestId("pli.empty.pet")).toBeNull();
    expect(screen.getByTestId("pli.today.pets-retry")).toBeTruthy();
    expect(document.body.textContent).not.toContain("Failed to fetch");
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
  it("closes the current Quick Log form immediately when switching to another pet", async () => {
    apiMock.get.mockImplementation((path: string) => {
      if (path === "/pets") return Promise.resolve([
        PETS[0], { ...PETS[0], id: "pet-2", name: "咪咪" },
      ]);
      if (path.endsWith("/today")) return Promise.resolve({
        pet: { id: "pet-1", name: "豆豆", species: "猫" },
        date: "2026-10-08", event_counts: {}, events: [],
      });
      if (path.includes("/tasks")) return Promise.resolve([]);
      if (path.includes("abnormal-day-hint")) return Promise.resolve({ hints: [] });
      if (path.includes("visual-models")) return Promise.resolve({ models: [] });
      return Promise.resolve({});
    });
    render(<TodayPage />);
    const openButton = await screen.findByRole("button", { name: /快速记录/ });
    fireEvent.click(openButton);
    expect(screen.getByRole("dialog", { name: "快速记录" })).toBeTruthy();
    await act(async () => {
      window.localStorage.setItem("pli_current_pet", "pet-2");
      window.dispatchEvent(new Event("pli-pet-changed"));
    });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "快速记录" })).toBeNull());
  });

});
