import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "中国足球比赛监测",
  description: "持续追踪中超、中甲、中乙、足协杯等中国各级足球比赛的赛程、赛果与上座数据",
};

const NAV = [
  { href: "/", label: "首页" },
  { href: "/matches", label: "比赛列表" },
  { href: "/attendance/missing", label: "缺失上座队列" },
  { href: "/stats/competitions", label: "联赛统计" },
  { href: "/stats/teams", label: "球队统计" },
  { href: "/sources", label: "数据源管理" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background">
        <header className="border-b bg-white">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              ⚽ 中国足球比赛监测
            </Link>
            <nav className="flex gap-1 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
        <footer className="border-t mt-12 py-6 text-center text-xs text-muted-foreground">
          数据来源以官方为准，估算数据仅供参考。请勿用于商业用途。
        </footer>
      </body>
    </html>
  );
}
