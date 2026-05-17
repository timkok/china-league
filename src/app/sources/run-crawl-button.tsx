"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RunCrawlButton({ adapterKey }: { adapterKey: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/crawl/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adapterKey }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg(`失败：${j.error ?? res.status}`);
      } else {
        setMsg(`完成，保存 ${j.saved} 条`);
      }
      router.refresh();
    } catch (e: any) {
      setMsg(`异常：${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={loading} onClick={onClick} variant="outline">
        {loading ? "抓取中..." : "执行抓取"}
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
