"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function SelectAttendanceButton({ recordId }: { recordId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/${recordId}/select`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg =
          typeof j.error === "string" ? j.error : `请求失败 ${res.status}`;
        toast.show(`切换展示失败：${msg}`, "error");
        return;
      }
      toast.show("✅ 已设为当前展示", "success");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={loading} onClick={onClick}>
      {loading ? "…" : "设为当前展示"}
    </Button>
  );
}
