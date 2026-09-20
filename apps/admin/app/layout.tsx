import type { Metadata } from "next";
import "@pli/ui-tokens/css";
import "./admin.css";
import AdminNav from "../components/AdminNav";

export const metadata: Metadata = {
  title: { default: "PLI 管理台", template: "%s — PLI 管理台" },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="admin-shell">
          <AdminNav />
          <div className="admin-page">{children}</div>
        </div>
      </body>
    </html>
  );
}
