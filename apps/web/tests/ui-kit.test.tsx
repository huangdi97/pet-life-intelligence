import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickLogSheet, RiskBanner, TimelineItem } from "@pli/ui-kit";
import { State } from "../components/ui";

/** Stage H 契约 E.22：组件测试 — RiskBanner / TimelineItem(AI 区分) / QuickLogSheet / State。 */

describe("RiskBanner", () => {
  it("renders Chinese label + secondary English (not color-only)", () => {
    render(<RiskBanner level="VET_SOON" reasons={["rule-01"]} next_action="联系兽医" />);
    expect(screen.getByText("建议就医")).toBeTruthy();
    expect(screen.getByText("Vet Soon")).toBeTruthy();
    expect(screen.getByText(/rule-01/)).toBeTruthy();
    expect(screen.getByText(/联系兽医/)).toBeTruthy();
  });

  it("uses role=alert for severe levels", () => {
    render(<RiskBanner level="EMERGENCY" />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("renders role=status for mild levels", () => {
    render(<RiskBanner level="NORMAL" />);
    expect(screen.getByRole("status")).toBeTruthy();
  });
});

describe("TimelineItem", () => {
  it("renders tl-item class for real records", () => {
    const { container } = render(
      <TimelineItem title="喂食" timestamp="2026-09-19T10:00:00Z" source="OWNER_REPORTED" provenance_level="OWNER_REPORTED" version={1} />,
    );
    expect(container.querySelector("li.tl-item")).toBeTruthy();
    expect(container.querySelector("li.tl-ai")).toBeNull();
  });

  it("renders tl-item tl-ai for AI provenance (visual distinction)", () => {
    const { container } = render(
      <TimelineItem title="AI 整理" timestamp="2026-09-19T10:00:00Z" source="AI_EXTRACTED" provenance_level="AI_EXTRACTED" version={1} />,
    );
    expect(container.querySelector("li.tl-item.tl-ai")).toBeTruthy();
  });
});

describe("QuickLogSheet", () => {
  it("renders configured types when open", () => {
    render(
      <QuickLogSheet
        open
        onClose={() => {}}
        onQuickLog={() => {}}
        types={[
          { type: "daily.meal", label: "喂食" },
          { type: "daily.drink", label: "饮水" },
        ]}
      />,
    );
    expect(screen.getByText("喂食")).toBeTruthy();
    expect(screen.getByText("饮水")).toBeTruthy();
  });

  it("renders nothing visible when closed", () => {
    const { container } = render(
      <QuickLogSheet open={false} onClose={() => {}} onQuickLog={() => {}} types={[{ type: "daily.meal", label: "喂食" }]} />,
    );
    expect(screen.queryByText("喂食")).toBeNull();
    expect(container.textContent).toBeDefined();
  });
});

describe("State (page-level states)", () => {
  it("renders denied state with human-language permission copy (permission)", () => {
    render(<State state="denied">x</State>);
    expect(screen.getByText(/没有查看此内容的权限/)).toBeTruthy();
  });

  it("renders error state with retry", () => {
    render(<State state="error" error="服务暂时不可用" onRetry={() => {}}>x</State>);
    expect(screen.getByText(/服务暂时不可用/)).toBeTruthy();
    expect(screen.getByText("重试")).toBeTruthy();
  });

  it("renders empty state when no children", () => {
    render(<State state="ready" empty="还没有记录。">{null}</State>);
    expect(screen.getByText(/还没有记录/)).toBeTruthy();
  });
});
