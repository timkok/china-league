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
import { RunCrawlButton } from "./run-crawl-button";

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
  return { sources, jobs, adapters: listAdapters() };
}

const STATUS_VARIANT: Record<string, any> = {
  PENDING: "muted",
  RUNNING: "info",
  SUCCESS: "success",
  PARTIAL: "warning",
  FAILED: "destructive",
};

export default async function SourcesPage() {
  const { sources, jobs, adapters } = await getData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🔌 数据源管理</h1>
        <p className="text-sm text-muted-foreground">
          已注册的抓取适配器、定时任务与最近抓取记录
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>已配置数据源</CardTitle>
          <CardDescription>共 {sources.length} 条</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>适配器</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((s) => {
                const hasAdapter = adapters.some((a) => a.key === s.adapterKey);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.adapterKey}</TableCell>
                    <TableCell>{s.type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.baseUrl || "—"}
                    </TableCell>
                    <TableCell>
                      {s.enabled ? (
                        <Badge variant="success">已启用</Badge>
                      ) : (
                        <Badge variant="muted">已禁用</Badge>
                      )}
                    </TableCell>
                    <TableCell>
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
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    暂未配置数据源
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近抓取记录</CardTitle>
          <CardDescription>最多显示最近 20 条</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>来源</TableHead>
                <TableHead>触发方式</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>发现</TableHead>
                <TableHead>保存</TableHead>
                <TableHead>开始</TableHead>
                <TableHead>结束</TableHead>
                <TableHead>错误</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j) => (
                <TableRow key={j.id}>
                  <TableCell>{j.source.name}</TableCell>
                  <TableCell className="text-xs">{j.trigger}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[j.status] ?? "muted"}>{j.status}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">{j.itemsFound}</TableCell>
                  <TableCell className="font-mono">{j.itemsSaved}</TableCell>
                  <TableCell className="text-xs">
                    {j.startedAt ? formatDate(j.startedAt) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {j.finishedAt ? formatDate(j.finishedAt) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-destructive max-w-xs truncate">
                    {j.errorLog ? j.errorLog.split("\n")[0] : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                    暂无抓取记录，点击上方"执行抓取"试试
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
