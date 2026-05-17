"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ManualAttendanceForm({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      matchId,
      attendanceCount: Number(fd.get("attendanceCount")),
      sourceName: String(fd.get("sourceName") || "人工录入"),
      sourceUrl: (fd.get("sourceUrl") as string) || undefined,
      rawTextExcerpt: (fd.get("rawTextExcerpt") as string) || undefined,
      note: (fd.get("note") as string) || undefined,
      estimated: fd.get("estimated") === "on",
      verified: fd.get("verified") === "on",
    };
    if (!body.attendanceCount || body.attendanceCount <= 0) {
      setError("请填写有效的观众人数");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `请求失败 ${res.status}`);
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      <Field label="观众人数 *">
        <Input name="attendanceCount" type="number" min={0} required />
      </Field>
      <Field label="来源名称 *">
        <Input name="sourceName" required placeholder="例如：现场观察 / 张三" />
      </Field>
      <Field label="来源链接（可选）" className="md:col-span-2">
        <Input name="sourceUrl" type="url" placeholder="https://..." />
      </Field>
      <Field label="原文片段（可选）" className="md:col-span-2">
        <textarea
          name="rawTextExcerpt"
          rows={2}
          className="w-full rounded-md border bg-background px-3 py-2"
          placeholder="拷贝原文一句话，便于核对"
        />
      </Field>
      <Field label="备注（可选）" className="md:col-span-2">
        <Input name="note" placeholder="例如：通过现场图片估算" />
      </Field>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="estimated" />
        估算数据
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="verified" />
        我已核验
      </label>

      {error && (
        <div className="md:col-span-2 text-sm text-destructive">{error}</div>
      )}
      <div className="md:col-span-2">
        <Button disabled={submitting} type="submit">
          {submitting ? "提交中..." : "提交记录"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
