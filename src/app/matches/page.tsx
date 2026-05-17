import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MatchStatusBadge } from "@/components/match-status-badge";
import { formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Search = {
  competition?: string;
  team?: string;
  city?: string;
  status?: string;
  from?: string;
  to?: string;
};

async function getMatches(s: Search) {
  const where: any = {};

  if (s.competition) {
    where.competition = { shortName: s.competition };
  }
  if (s.status) {
    where.status = s.status;
  }
  if (s.from || s.to) {
    where.kickoffAt = {};
    if (s.from) where.kickoffAt.gte = new Date(s.from);
    if (s.to) {
      const t = new Date(s.to);
      t.setDate(t.getDate() + 1);
      where.kickoffAt.lt = t;
    }
  }
  if (s.team) {
    where.OR = [
      { homeTeam: { OR: [{ name: { contains: s.team } }, { shortName: { contains: s.team } }] } },
      { awayTeam: { OR: [{ name: { contains: s.team } }, { shortName: { contains: s.team } }] } },
    ];
  }
  if (s.city) {
    where.venue = { city: { contains: s.city } };
  }

  return prisma.match.findMany({
    where,
    include: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      competition: true,
    },
    orderBy: { kickoffAt: "desc" },
    take: 100,
  });
}

async function getCompetitions() {
  return prisma.competition.findMany({ orderBy: { name: "asc" } });
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const s = await searchParams;
  const [matches, competitions] = await Promise.all([getMatches(s), getCompetitions()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">📅 比赛列表</h1>
        <p className="text-sm text-muted-foreground">最多显示 100 条，按开球时间倒序</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
          <CardDescription>按联赛、球队、城市、状态、日期筛选</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-6 text-sm">
            <select
              name="competition"
              defaultValue={s.competition ?? ""}
              className="h-10 rounded-md border bg-background px-3"
            >
              <option value="">全部联赛</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.shortName}>
                  {c.shortName}
                </option>
              ))}
            </select>
            <input
              name="team"
              defaultValue={s.team ?? ""}
              placeholder="球队（全称/简称）"
              className="h-10 rounded-md border bg-background px-3"
            />
            <input
              name="city"
              defaultValue={s.city ?? ""}
              placeholder="城市"
              className="h-10 rounded-md border bg-background px-3"
            />
            <select
              name="status"
              defaultValue={s.status ?? ""}
              className="h-10 rounded-md border bg-background px-3"
            >
              <option value="">全部状态</option>
              <option value="SCHEDULED">未开始</option>
              <option value="LIVE">进行中</option>
              <option value="FINISHED">已结束</option>
              <option value="POSTPONED">延期</option>
              <option value="CANCELLED">取消</option>
            </select>
            <input
              name="from"
              type="date"
              defaultValue={s.from ?? ""}
              className="h-10 rounded-md border bg-background px-3"
            />
            <input
              name="to"
              type="date"
              defaultValue={s.to ?? ""}
              className="h-10 rounded-md border bg-background px-3"
            />
            <div className="md:col-span-6 flex gap-2">
              <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                应用筛选
              </button>
              <Link
                href="/matches"
                className="h-9 inline-flex items-center rounded-md border px-4 text-sm font-medium"
              >
                重置
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>联赛</TableHead>
                <TableHead>轮次</TableHead>
                <TableHead>主队</TableHead>
                <TableHead className="text-center">比分</TableHead>
                <TableHead>客队</TableHead>
                <TableHead>球场</TableHead>
                <TableHead className="text-right">观众</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(m.kickoffAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.competition.shortName}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.round ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/matches/${m.id}`} className="hover:underline">
                      {m.homeTeam.shortName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {m.status === "FINISHED" || m.status === "LIVE"
                      ? `${m.homeGoals ?? "-"} : ${m.awayGoals ?? "-"}`
                      : "—"}
                  </TableCell>
                  <TableCell className="font-medium">{m.awayTeam.shortName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.venue?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {m.attendance != null ? (
                      <span className="font-mono">{formatNumber(m.attendance)}</span>
                    ) : (
                      <Badge variant="warning">待补充</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <MatchStatusBadge status={m.status} />
                  </TableCell>
                </TableRow>
              ))}
              {matches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">
                    无匹配结果
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
