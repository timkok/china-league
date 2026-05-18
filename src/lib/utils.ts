import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("zh-CN");
}

const SHANGHAI = "Asia/Shanghai";

function toDate(d: Date | string | null | undefined): Date | null {
  if (d == null) return null;
  if (d instanceof Date) return d;
  const x = new Date(d);
  return isNaN(x.getTime()) ? null : x;
}

/** YYYY/MM/DD HH:mm, locked to Asia/Shanghai */
export function formatDate(d: Date | string | null | undefined): string {
  const x = toDate(d);
  if (!x) return "—";
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: SHANGHAI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(x);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}

/** YYYY/MM/DD */
export function formatDateShort(d: Date | string | null | undefined): string {
  const x = toDate(d);
  if (!x) return "—";
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: SHANGHAI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(x);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")}`;
}

/** HH:mm */
export function formatTime(d: Date | string | null | undefined): string {
  const x = toDate(d);
  if (!x) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: SHANGHAI,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(x);
}

/** 相对时间："2 天前 / 今天 / 1 小时后" */
export function formatRelative(d: Date | string | null | undefined): string {
  const x = toDate(d);
  if (!x) return "—";
  const diffMs = x.getTime() - Date.now();
  const sign = diffMs >= 0 ? 1 : -1;
  const abs = Math.abs(diffMs);
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (abs < min) return sign > 0 ? "稍后" : "刚刚";
  if (abs < hour) return `${Math.round(abs / min)} 分钟${sign > 0 ? "后" : "前"}`;
  if (abs < day) return `${Math.round(abs / hour)} 小时${sign > 0 ? "后" : "前"}`;
  if (abs < 30 * day) return `${Math.round(abs / day)} 天${sign > 0 ? "后" : "前"}`;
  return formatDateShort(x);
}
