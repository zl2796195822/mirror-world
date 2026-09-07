import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "./components/shell";

export const metadata: Metadata = {
  title: "镜界 · 世界观察",
  description: "Persistent Digital Society 的观察入口。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
