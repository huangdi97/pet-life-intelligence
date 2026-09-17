import type { Metadata, Viewport } from "next";
import "@pli/ui-tokens/css";
import "./globals.css";
import TopNav from "../components/TopNav";
import { PwaShell } from "../components/PwaShell";

export const metadata: Metadata = {
  title: { default: "宠物生活智能", template: "%s — 宠物生活智能" },
  description: "宠物全生命周期记录与健康照护助手",
  manifest: `${process.env.NEXT_BASE_PATH || ""}/manifest.webmanifest`,
  applicationName: "Pet Life Intelligence",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "宠物生活智能", statusBarStyle: "default" },
  openGraph: {
    title: "宠物生活智能",
    description: "宠物全生命周期记录与健康照护助手",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#61795C",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <TopNav />
        <div className="page">{children}</div>
        <PwaShell basePath={process.env.NEXT_BASE_PATH || ""} />
      </body>
    </html>
  );
}