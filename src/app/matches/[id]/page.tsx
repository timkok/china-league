import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchStatusBadge } from "@/components/match-status-badge";
import {
  AttendanceBadge,
  ConfidenceBadge,
  SourceTypeBadge,
  sourceTypeText,
} from "@/components/confidence-badge";
import { formatDate, formatNumber } from "@/lib/utils";
import { ManualAttendanceForm } from "./manual-attendance-form";
import { SelectAttendanceButton } from "./select-attendance-button";

export const dynamic = "force-dynamic";

async function getMatch(id: string) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      competition: true,
      season: true,
      attendanceRecords: {
        orderBy: [
          { isSelected: "desc" },
          { confidenceScore: "desc" },
          { collectedAt: "desc" },
        ],
      },
    },
  });
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = await getMatch(id);
  if (!m) notFound();

  const countsSet = new Set(
    m.attendanceRecords
      .filter((r) => r.attendanceCount != null)
      .map((r) => r.attendanceCount)
  );
  const hasConflict = countsSet.size > 1;

  return (
    <div className="space-y-6">
      <Link
        href="/matches"
        className="text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 返回比赛列表
      </Link>

      {/* 比赛主信息 */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{m.competition.shortName}</Badge>
            <span className="text-muted-foreground">{m.season.name}</span>
            {m.round && (
              <span className="text-muted-foreground">· {m.round}</span>
            )}
            <MatchStatusBadge status={m.status} />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
            <div className="text-right">
              <div className="text-lg font-medium md:text-xl">{m.homeTeam.name}</div>
              <div className="text-xs text-muted-foreground">
                主场 · {m.homeTeam.city ?? "—"}
              </div>
            </div>
            <div className="rounded-lg bg-muted px-4 py-2 text-center font-mono text-2xl font-bold tabular-nums md:text-3xl">
              {m.status === "FINISHED" || m.status === "LIVE"
                ? `${m.homeGoals ?? "-"} : ${m.awayGoals ?? "-"}`
                : "vs"}
            </div>
            <div className="text-left">
              <div className="text-lg font-medium md:text-xl">{m.awayTeam.name}</div>
              <div className="text-xs text-muted-foreground">
                客场 · {m.awayTeam.city ?? "—"}
              </div>
            </div>
          </div>

          <CardDescription className="text-center">
            🕒 {formatDate(m.kickoffAt)} （Asia/Shanghai）　·　🏟{" "}
            {m.venue?.name ?? "球场待定"}
            {m.venue?.capacity != null &&
              `（容量 ${formatNumber(m.venue.capacity)}）`}
          </CardDescription>
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Info label="当前展示上座" tone={m.attendance == null ? "warn" : undefined}>
            {m.attendance != null ? (
              <div>
                <div className="font-mono text-xl font-semibold tabular-nums">
                  {formatNumber(m.attendance)} 人
                </div>
                <div className="mt-1">
                  <ConfidenceBadge score={m.attendanceConfidence} />
                </div>
              </div>
            ) : (
              <Badge variant="warning">待补充</Badge>
            )}
          </Info>
          <Info label="多源记录">
            <div className="font-mono text-xl tabular-nums">
              {m.attendanceRecords.length}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              共 {countsSet.size} 个不同的人数值
            </div>
          </Info>
          <Info label="多源一致性" tone={hasConflict ? "warn" : "success"}>
            {hasConflict ? (
              <Badge variant="destructive">存在差异</Badge>
            ) : (
              <Badge variant="success">一致</Badge>
            )}
          </Info>
        </CardContent>
      </Card>

      {/* 所有来源 */}
      <Card>
        <CardHeader>
          <CardTitle>📋 所有上座来源</CardTitle>
          <CardDescription>
            按可信度排序，最可信的一条会自动作为对外展示
            {hasConflict && (
              <span className="ml-2 text-amber-700">
                · 检测到多源差异，请人工核实
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {m.attendanceRecords.length === 0 && (
            <div className="rounded-md border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              暂无上座记录，可在下方人工补录
            </div>
          )}
          {m.attendanceRecords.map((r) => (
            <article
              key={r.id}
              className={`rounded-md border p-3 ${
                r.isSelected ? "border-emerald-400 bg-emerald-50/40" : ""
              }`}
              aria-label={`来源 ${r.sourceName} 的上座记录`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <SourceTypeBadge type={r.sourceType} />
                    <ConfidenceBadge
                      label={r.confidenceLabel}
                      score={r.confidenceScore}
                    />
                    <AttendanceBadge estimated={r.estimated} />
                    {r.verified && <Badge variant="success">已核验</Badge>}
                    {r.isSelected && <Badge variant="info">当前展示</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {sourceTypeText(r.sourceType)} / {" "}
                    <span className="font-medium text-foreground">{r.sourceName}</span>
                  </div>
                  <div className="font-mono text-2xl font-semibold tabular-nums">
                    {r.attendanceCount != null ? formatNumber(r.attendanceCount) : "—"} 人
                  </div>
                  {r.rawTextExcerpt && (
                    <blockquote className="border-l-2 pl-3 text-sm text-muted-foreground">
                      {r.rawTextExcerpt}
                    </blockquote>
                  )}
                  {r.note && (
                    <div className="text-xs text-amber-700">备注：{r.note}</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    采集时间：{formatDate(r.collectedAt)}
                    {r.sourceUrl && (
                      <>
                        　·{" "}
                        <a
                          href={r.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline-offset-2 hover:underline"
                        >
                          原文链接 ↗
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  {!r.isSelected && r.attendanceCount != null && (
                    <SelectAttendanceButton recordId={r.id} />
                  )}
                </div>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      {/* 补录 */}
      <Card>
        <CardHeader>
          <CardTitle>✍️ 人工补录 / 修正</CardTitle>
          <CardDescription>
            人工录入默认置信度 0.50；勾选&ldquo;已核验&rdquo;后会提升至 0.90 或以上
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManualAttendanceForm matchId={m.id} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: "warn" | "success";
}) {
  const ring =
    tone === "warn"
      ? "border-amber-300 bg-amber-50/50"
      : tone === "success"
      ? "border-emerald-300 bg-emerald-50/50"
      : "border-border bg-muted/30";
  return (
    <div className={`rounded-md border p-4 ${ring}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
