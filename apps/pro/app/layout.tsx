import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@pli/ui-tokens/css";
import "./globals.css";
import TopNav from "../components/TopNav";

export const metadata: Metadata = {
  title: { default: "专业工作台", template: "%s — 专业工作台" },
  description:
    "宠物生活智能 · 专业端：兽医 / 训导师 / 上门服务（Vet / Trainer / Service）",
  applicationName: "Pet Life Intelligence",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#61795C",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <TopNav />
        <div className="page">{children}</div>
      </body>
    </html>
  );
}
