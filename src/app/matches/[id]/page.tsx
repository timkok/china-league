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
import { ConfidenceBadge, SourceTypeText } from "@/components/confidence-badge";
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
        orderBy: [{ isSelected: "desc" }, { confidenceScore: "desc" }, { collectedAt: "desc" }],
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

  const distinctCounts = new Set(
    m.attendanceRecords.filter((r) => r.attendanceCount != null).map((r) => r.attendanceCount)
  );
  const hasConflict = distinctCounts.size > 1;

  return (
    <div className="space-y-6">
      <Link href="/matches" className="text-sm text-muted-foreground hover:underline">
        ← 返回比赛列表
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{m.competition.shortName}</Badge>
            <span className="text-sm text-muted-foreground">{m.season.name}</span>
            {m.round && <span className="text-sm text-muted-foreground">· {m.round}</span>}
            <MatchStatusBadge status={m.status} />
          </div>
          <CardTitle className="mt-3 text-2xl">
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="text-right flex-1">
                <div className="text-xl font-medium">{m.homeTeam.name}</div>
                <div className="text-xs text-muted-foreground">主场 · {m.homeTeam.city}</div>
              </div>
              <div className="text-3xl font-bold font-mono px-4">
                {m.status === "FINISHED" || m.status === "LIVE"
                  ? `${m.homeGoals ?? "-"} : ${m.awayGoals ?? "-"}`
                  : "vs"}
              </div>
              <div className="text-left flex-1">
                <div className="text-xl font-medium">{m.awayTeam.name}</div>
                <div className="text-xs text-muted-foreground">客场 · {m.awayTeam.city}</div>
              </div>
            </div>
          </CardTitle>
          <CardDescription className="text-center">
            🕒 {formatDate(m.kickoffAt)}　·　🏟 {m.venue?.name ?? "球场待定"}
            {m.venue?.capacity != null && `（容量 ${formatNumber(m.venue.capacity)}）`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Info label="当前展示上座">
            {m.attendance != null ? (
              <div className="space-y-1">
                <div className="font-mono text-xl font-semibold">
                  {formatNumber(m.attendance)} 人
                </div>
                {m.attendanceConfidence != null && (
                  <div className="text-xs text-muted-foreground">
                    可信度 {(m.attendanceConfidence * 100).toFixed(0)} / 100
                  </div>
                )}
              </div>
            ) : (
              <Badge variant="warning">待补充</Badge>
            )}
          </Info>
          <Info label="来源记录数">
            <span className="font-mono text-xl">{m.attendanceRecords.length}</span>
          </Info>
          <Info label="多源差异">
            {hasConflict ? (
              <Badge variant="destructive">存在差异</Badge>
            ) : (
              <Badge variant="success">一致</Badge>
            )}
          </Info>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📋 所有上座来源</CardTitle>
          <CardDescription>
            按可信度排序，最可信的一条会被自动选中作为对外展示
            {hasConflict && (
              <span className="ml-2 text-amber-700">
                （检测到多源差异，请人工核实）
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {m.attendanceRecords.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无上座记录</p>
          )}
          {m.attendanceRecords.map((r) => (
            <div
              key={r.id}
              className={`rounded-md border p-3 ${r.isSelected ? "border-emerald-400 bg-emerald-50/40" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ConfidenceBadge label={r.confidenceLabel} score={r.confidenceScore} />
                    <span className="text-sm">
                      <SourceTypeText type={r.sourceType} />　/{" "}
                      <span className="font-medium">{r.sourceName}</span>
                    </span>
                    {r.estimated && <Badge variant="warning">估算</Badge>}
                    {r.verified && <Badge variant="success">已核验</Badge>}
                    {r.isSelected && <Badge variant="info">当前展示</Badge>}
                  </div>
                  <div className="text-2xl font-mono font-semibold">
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
                        　·
                        <a
                          href={r.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          原文链接
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
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>✍️ 人工补录 / 修正</CardTitle>
          <CardDescription>
            人工录入默认置信度 0.5；勾选"已核验"可提升至 0.9
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManualAttendanceForm matchId={m.id} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
