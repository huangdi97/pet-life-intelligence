import "./globals.css";

export const metadata = {
  title: "Pet Life Intelligence",
  description: "v0.1 bootstrap"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
