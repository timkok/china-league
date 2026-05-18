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
import { formatDate } from "@/lib/utils";
import { listAdapters } from "@/lib/scrapers";
import { SourceTypeBadge } from "@/components/confidence-badge";
import { RunCrawlButton } from "./run-crawl-button";
import type { CrawlJobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

async function getData() {
  const [sources, jobs] = await Promise.all([
    prisma.source.findMany({ orderBy: { name: "asc" } }),
    prisma.crawlJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { source: true },
    }),
  ]);
  // 每个 source 的最近一次抓取
  const lastJobBySource = new Map<string, (typeof jobs)[number]>();
  for (const j of jobs) {
    if (!lastJobBySource.has(j.sourceId)) lastJobBySource.set(j.sourceId, j);
  }
  return { sources, jobs, adapters: listAdapters(), lastJobBySource };
}

const STATUS_VARIANT: Record<CrawlJobStatus, Parameters<typeof Badge>[0]["variant"]> = {
  PENDING: "muted",
  RUNNING: "info",
  SUCCESS: "success",
  PARTIAL: "warning",
  FAILED: "destructive",
};

const STATUS_TEXT: Record<CrawlJobStatus, string> = {
  PENDING: "待运行",
  RUNNING: "运行中",
  SUCCESS: "成功",
  PARTIAL: "部分成功",
  FAILED: "失败",
};

export default async function SourcesPage() {
  const { sources, jobs, adapters, lastJobBySource } = await getData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🔌 数据源管理</h1>
        <p className="text-sm text-muted-foreground">
          配置抓取适配器、查看最近一次抓取状态，并按需手动触发
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>已配置数据源（{sources.length}）</CardTitle>
          <CardDescription>
            注册的 adapter 总数：{adapters.length}；缺失 adapter 的来源不能直接抓取
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>adapterKey</TableHead>
                  <TableHead>来源类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最近抓取</TableHead>
                  <TableHead>结果</TableHead>
                  <TableHead className="hidden lg:table-cell">最近错误</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => {
                  const hasAdapter = adapters.some((a) => a.key === s.adapterKey);
                  const last = lastJobBySource.get(s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.name}</div>
                        {s.baseUrl && (
                          <a
                            href={s.baseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                          >
                            {s.baseUrl}
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{s.adapterKey}</TableCell>
                      <TableCell>
                        <SourceTypeBadge type={s.type} />
                      </TableCell>
                      <TableCell>
                        {s.enabled ? (
                          <Badge variant="success">已启用</Badge>
                        ) : (
                          <Badge variant="muted">已禁用</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {last?.finishedAt ? formatDate(last.finishedAt) : "—"}
                      </TableCell>
                      <TableCell>
                        {last ? (
                          <div className="space-y-1">
                            <Badge variant={STATUS_VARIANT[last.status]}>
                              {STATUS_TEXT[last.status]}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              发现 {last.itemsFound} · 保存 {last.itemsSaved}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">未运行</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-xs text-xs text-destructive">
                        {last?.errorLog
                          ? last.errorLog.split("\n")[0].slice(0, 120)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasAdapter ? (
                          <RunCrawlButton adapterKey={s.adapterKey} />
                        ) : (
                          <Badge variant="warning">无 adapter</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sources.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      暂未配置数据源
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近抓取记录</CardTitle>
          <CardDescription>最多显示 20 条</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>来源</TableHead>
                  <TableHead>触发</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>发现</TableHead>
                  <TableHead>保存</TableHead>
                  <TableHead>开始</TableHead>
                  <TableHead>结束</TableHead>
                  <TableHead className="hidden lg:table-cell">错误摘要</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>{j.source.name}</TableCell>
                    <TableCell className="text-xs">
                      {j.trigger === "scheduled" ? "定时" : "手动"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[j.status]}>
                        {STATUS_TEXT[j.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{j.itemsFound}</TableCell>
                    <TableCell className="font-mono tabular-nums">{j.itemsSaved}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {j.startedAt ? formatDate(j.startedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {j.finishedAt ? formatDate(j.finishedAt) : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-md truncate text-xs text-destructive">
                      {j.errorLog ? j.errorLog.split("\n")[0] : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      暂无抓取记录，点击上方&ldquo;执行抓取&rdquo;试试
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
