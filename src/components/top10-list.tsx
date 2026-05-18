"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfidenceBadge, AttendanceBadge } from "@/components/confidence-badge";
import { formatDate, formatNumber } from "@/lib/utils";

export type Top10Row = {
  id: string;
  homeShort: string;
  awayShort: string;
  homeGoals: number | null;
  awayGoals: number | null;
  competitionShort: string;
  venueName: string | null;
  kickoffAt: string;
  attendance: number | null;
  confidence: number | null;
  selectedSourceType: string | null;
  selectedSourceName: string | null;
  selectedSourceUrl: string | null;
  estimated: boolean;
};

export function Top10List({ rows }: { rows: Top10Row[] }) {
  const competitions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.competitionShort))),
    [rows]
  );
  const [filter, setFilter] = useState<string>("");

  const filtered = useMemo(
    () =>
      (filter ? rows.filter((r) => r.competitionShort === filter) : rows)
        .slice()
        .sort((a, b) => (b.attendance ?? 0) - (a.attendance ?? 0))
        .slice(0, 10),
    [rows, filter]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">按联赛筛选：</span>
        <FilterChip active={filter === ""} onClick={() => setFilter("")}>
          全部
        </FilterChip>
        {competitions.map((c) => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {c}
          </FilterChip>
        ))}
      </div>

      {/* 桌面/平板：表格 */}
      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table aria-label="单场上座 Top 10">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>比赛</TableHead>
              <TableHead className="hidden lg:table-cell">联赛</TableHead>
              <TableHead className="hidden lg:table-cell">球场</TableHead>
              <TableHead className="hidden xl:table-cell">时间</TableHead>
              <TableHead className="text-right">观众</TableHead>
              <TableHead>可信度</TableHead>
              <TableHead className="hidden sm:table-cell">来源</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="font-bold tabular-nums text-muted-foreground">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <Link href={`/matches/${r.id}`} className="hover:underline">
                    <div className="font-medium">
                      {r.homeShort}{" "}
                      <span className="font-mono text-muted-foreground">
                        {r.homeGoals ?? "-"} : {r.awayGoals ?? "-"}
                      </span>{" "}
                      {r.awayShort}
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant="outline">{r.competitionShort}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                  {r.venueName ?? "—"}
                </TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(r.kickoffAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-mono font-semibold tabular-nums">
                    {formatNumber(r.attendance)}
                  </div>
                  <div className="text-xs text-muted-foreground">人</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <ConfidenceBadge score={r.confidence} />
                    {r.estimated && <AttendanceBadge estimated />}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs">
                  {r.selectedSourceUrl ? (
                    <a
                      href={r.selectedSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground underline-offset-2 hover:underline"
                      aria-label={`打开来源 ${r.selectedSourceName ?? ""}（新窗口）`}
                    >
                      {r.selectedSourceName ?? "来源"} ↗
                    </a>
                  ) : (
                    <span className="text-muted-foreground">
                      {r.selectedSourceName ?? "—"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                  暂无符合筛选条件的比赛
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 手机：卡片列表 */}
      <ul className="space-y-2 md:hidden" aria-label="单场上座 Top 10（手机版）">
        {filtered.map((r, i) => (
          <li key={r.id}>
            <Link
              href={`/matches/${r.id}`}
              className="block rounded-md border bg-card p-3 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <Badge variant="outline">{r.competitionShort}</Badge>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-semibold tabular-nums">
                    {formatNumber(r.attendance)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">人</div>
                </div>
              </div>
              <div className="mt-2 text-sm font-medium">
                {r.homeShort}{" "}
                <span className="font-mono text-muted-foreground">
                  {r.homeGoals ?? "-"} : {r.awayGoals ?? "-"}
                </span>{" "}
                {r.awayShort}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {r.venueName ?? "—"} · {formatDate(r.kickoffAt)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <ConfidenceBadge score={r.confidence} />
                {r.estimated && <AttendanceBadge estimated />}
                {r.selectedSourceName && (
                  <span className="text-xs text-muted-foreground">
                    · {r.selectedSourceName}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            暂无符合筛选条件的比赛
          </li>
        )}
      </ul>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
