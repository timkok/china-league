"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function RunCrawlButton({ adapterKey }: { adapterKey: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/crawl/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adapterKey }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof j.error === "string" ? j.error : `请求失败 ${res.status}`;
        toast.show(`抓取失败：${msg}`, "error");
      } else {
        const warn = Array.isArray(j.warnings) && j.warnings.length > 0;
        toast.show(
          `抓取完成：发现 ${j.found ?? 0} 条，保存 ${j.saved ?? 0} 条${warn ? "（含警告）" : ""}`,
          warn ? "default" : "success"
        );
      }
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "未知错误";
      toast.show(`抓取异常：${msg}`, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={loading} onClick={onClick}>
      {loading ? "抓取中…" : "执行抓取"}
    </Button>
  );
}
