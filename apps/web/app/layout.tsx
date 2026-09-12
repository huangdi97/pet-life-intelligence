import type { Metadata } from "next";
import "./globals.css";
import TopNav from "../components/TopNav";

export const metadata: Metadata = {
  title: "Pet Life Intelligence",
  description: "v0.1 — 今日/时间线/照护/健康闭环",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <TopNav />
        <div className="page">{children}</div>
      </body>
    </html>
  );
}
