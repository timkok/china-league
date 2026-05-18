import type { Metadata } from "next";
import Link from "next/link";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "中国足球比赛监测",
  description:
    "持续追踪中超、中甲、中乙、足协杯等中国各级足球比赛的赛程、赛果与上座数据",
};

const NAV = [
  { href: "/", label: "首页" },
  { href: "/matches", label: "比赛列表" },
  { href: "/attendance/missing", label: "缺失上座" },
  { href: "/stats/competitions", label: "联赛统计" },
  { href: "/stats/teams", label: "球队统计" },
  { href: "/sources", label: "数据源" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-muted/20">
        <ToastProvider>
          <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
            <div className="container flex flex-col gap-2 py-3 md:flex-row md:h-14 md:items-center md:justify-between md:gap-4 md:py-0">
              <Link
                href="/"
                className="text-lg font-semibold tracking-tight"
                aria-label="返回首页 · 中国足球比赛监测"
              >
                ⚽ 中国足球比赛监测
              </Link>
              <nav
                className="-mx-1 flex flex-wrap gap-1 text-sm"
                aria-label="主导航"
              >
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="container py-6">{children}</main>
          <footer className="mt-12 border-t bg-white py-6 text-center text-xs text-muted-foreground">
            数据来源以官方发布为准，估算数据仅供参考。时区：Asia/Shanghai。
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
