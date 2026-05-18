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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Search = {
  competition?: string;
  team?: string;
  venue?: string;
  from?: string;
  to?: string;
};

async function getCompetitions() {
  return prisma.competition.findMany({ orderBy: { name: "asc" } });
}

async function getMissing(s: Search) {
  const where: Prisma.MatchWhereInput = {
    status: "FINISHED",
    attendance: null,
  };
  if (s.competition) where.competition = { shortName: s.competition };
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
      {
        homeTeam: {
          OR: [{ name: { contains: s.team } }, { shortName: { contains: s.team } }],
        },
      },
      {
        awayTeam: {
          OR: [{ name: { contains: s.team } }, { shortName: { contains: s.team } }],
        },
      },
    ];
  }
  if (s.venue) {
    where.venue = { name: { contains: s.venue } };
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
    take: 200,
  });
}

export default async function MissingAttendancePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const s = await searchParams;
  const [list, competitions] = await Promise.all([getMissing(s), getCompetitions()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">📥 缺失上座队列</h1>
        <p className="text-sm text-muted-foreground">
          已结束但尚无上座数据的比赛。点击任意一条进入详情页人工补录。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
          <CardDescription>按联赛、球队、球场、日期筛选</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-3 text-sm md:grid-cols-5"
            aria-label="缺失队列筛选"
          >
            <select
              name="competition"
              defaultValue={s.competition ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3"
              aria-label="联赛"
            >
              <option value="">全部联赛</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.shortName}>
                  {c.shortName}
                </option>
              ))}
            </select>
            <Input
              name="team"
              defaultValue={s.team ?? ""}
              placeholder="球队（全称或简称）"
              aria-label="球队"
            />
            <Input
              name="venue"
              defaultValue={s.venue ?? ""}
              placeholder="球场名"
              aria-label="球场"
            />
            <Input
              name="from"
              type="date"
              defaultValue={s.from ?? ""}
              aria-label="起始日期"
            />
            <Input
              name="to"
              type="date"
              defaultValue={s.to ?? ""}
              aria-label="截止日期"
            />
            <div className="md:col-span-5 flex gap-2">
              <Button type="submit">应用筛选</Button>
              <Link
                href="/attendance/missing"
                className="inline-flex h-10 items-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-accent"
              >
                重置
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>共 {list.length} 场待补</CardTitle>
          <CardDescription>按比赛时间倒序，最多 200 条</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon="🎉"
                title="没有缺失上座的比赛"
                description="所有筛选条件下的已结束比赛都已有上座数据。"
                actionHref="/matches"
                actionLabel="返回比赛列表"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>联赛</TableHead>
                    <TableHead>主队</TableHead>
                    <TableHead className="text-center">比分</TableHead>
                    <TableHead>客队</TableHead>
                    <TableHead className="hidden md:table-cell">球场</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(m.kickoffAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.competition.shortName}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{m.homeTeam.shortName}</TableCell>
                      <TableCell className="text-center font-mono tabular-nums">
                        {m.homeGoals ?? "-"} : {m.awayGoals ?? "-"}
                      </TableCell>
                      <TableCell className="font-medium">{m.awayTeam.shortName}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {m.venue?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/matches/${m.id}`}
                          className="text-sm text-primary underline-offset-2 hover:underline"
                        >
                          补录上座 →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
