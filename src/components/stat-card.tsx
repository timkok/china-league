import Link from "next/link";
import { cn, formatNumber } from "@/lib/utils";

type Tone = "default" | "warn" | "success" | "info";

type Props = {
  label: string;
  value: number | string | null | undefined;
  hint?: React.ReactNode;
  tone?: Tone;
  href?: string;
  ariaLabel?: string;
};

const TONE: Record<Tone, string> = {
  default: "border-border bg-card",
  warn: "border-amber-300 bg-amber-50/60",
  success: "border-emerald-300 bg-emerald-50/60",
  info: "border-sky-300 bg-sky-50/60",
};

export function StatCard({ label, value, hint, tone = "default", href, ariaLabel }: Props) {
  const formatted =
    typeof value === "number" ? formatNumber(value) : value ?? "—";
  const inner = (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border p-4 shadow-sm transition-colors",
        TONE[tone],
        href && "hover:border-primary/40 hover:bg-accent/40"
      )}
      aria-label={ariaLabel}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
        {formatted}
      </div>
      {hint && (
        <div className="mt-auto pt-2 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full" aria-label={ariaLabel ?? label}>
      {inner}
    </Link>
  ) : (
    inner
  );
}
