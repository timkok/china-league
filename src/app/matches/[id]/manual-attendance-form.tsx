"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type SourceType = "OFFICIAL_LEAGUE" | "OFFICIAL_CLUB" | "MEDIA" | "SOCIAL" | "MANUAL";

const SOURCE_OPTIONS: Array<{ value: SourceType; label: string }> = [
  { value: "OFFICIAL_LEAGUE", label: "联赛/足协官方" },
  { value: "OFFICIAL_CLUB", label: "俱乐部官方" },
  { value: "MEDIA", label: "权威媒体" },
  { value: "SOCIAL", label: "社交媒体" },
  { value: "MANUAL", label: "人工录入" },
];

export function ManualAttendanceForm({ matchId }: { matchId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const count = Number(fd.get("attendanceCount"));
    if (!count || count <= 0) {
      setError("请填写有效的观众人数（正整数）");
      return;
    }
    const body = {
      matchId,
      attendanceCount: count,
      sourceType: (fd.get("sourceType") as SourceType) || "MANUAL",
      sourceName: String(fd.get("sourceName") || "人工录入"),
      sourceUrl: (fd.get("sourceUrl") as string) || undefined,
      rawTextExcerpt: (fd.get("rawTextExcerpt") as string) || undefined,
      note: (fd.get("note") as string) || undefined,
      estimated: fd.get("estimated") === "on",
      verified: fd.get("verified") === "on",
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          typeof j.error === "string" ? j.error : `请求失败 ${res.status}`
        );
      }
      toast.show("✅ 已添加一条上座记录", "success");
      form.reset();
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "提交失败";
      setError(msg);
      toast.show(`提交失败：${msg}`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2"
      aria-label="人工补录上座表单"
    >
      <Field label="观众人数 *">
        <Input
          name="attendanceCount"
          type="number"
          min={0}
          required
          inputMode="numeric"
        />
      </Field>
      <Field label="来源类型 *">
        <select
          name="sourceType"
          defaultValue="MANUAL"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          required
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="来源名称 *">
        <Input name="sourceName" required placeholder="例如：现场观察 / 张三" />
      </Field>
      <Field label="来源链接（可选）">
        <Input name="sourceUrl" type="url" placeholder="https://..." />
      </Field>
      <Field label="原文片段（可选）" className="md:col-span-2">
        <textarea
          name="rawTextExcerpt"
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="拷贝原文一句话，便于核对"
        />
      </Field>
      <Field label="备注（可选）" className="md:col-span-2">
        <Input name="note" placeholder="例如：通过现场图片估算" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="estimated" />
        估算数据（含&ldquo;超过 X 万&rdquo;、&ldquo;近 X 千&rdquo;等）
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="verified" />
        我已核验（提升至高可信）
      </label>

      {error && (
        <div className="md:col-span-2 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}
      <div className="md:col-span-2">
        <Button disabled={submitting} type="submit">
          {submitting ? "提交中…" : "提交记录"}
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
