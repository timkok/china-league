"use client";

import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type LeagueAverageRow = {
  competitionShort: string;
  avg: number;
  sampleCount: number;
};

const COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#a855f7", "#ef4444"];

export function LeagueAverageBlock({ rows }: { rows: LeagueAverageRow[] }) {
  const sorted = rows.slice().sort((a, b) => b.avg - a.avg);
  return (
    <div className="space-y-4">
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <BarChart data={sorted} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="competitionShort" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v: number, _name, item) => [
                `${v.toLocaleString("zh-CN")} 人（${(item.payload as LeagueAverageRow).sampleCount} 场样本）`,
                "场均观众",
              ]}
            />
            <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
              {sorted.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2 text-sm">
        {sorted.map((r) => (
          <li
            key={r.competitionShort}
            className="flex items-center justify-between rounded-md border px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline">{r.competitionShort}</Badge>
              <span className="text-xs text-muted-foreground">
                {r.sampleCount} 场样本
              </span>
              {r.sampleCount < 3 && (
                <Badge variant="warning" aria-label="样本数过少">
                  小样本，仅供参考
                </Badge>
              )}
            </div>
            <span className="font-mono font-medium tabular-nums">
              {formatNumber(Math.round(r.avg))} 人
            </span>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="rounded-md border border-dashed bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
            暂无可统计的联赛数据
          </li>
        )}
      </ul>
    </div>
  );
}
