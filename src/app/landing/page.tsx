import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateShort, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge, AttendanceBadge } from "@/components/confidence-badge";

export const dynamic = "force-dynamic";

const PREVIEW_HREF = "./preview/index.html";
const GITHUB = "https://github.com/timkok/china-league";

async function loadMini() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 3);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 4);

  const [todayMatches, recent7, missing, comps, perComp, top, latest] =
    await Promise.all([
      prisma.match.findMany({
        where: { kickoffAt: { gte: todayStart, lt: todayEnd } },
        include: { homeTeam: true, awayTeam: true, venue: true, competition: true },
        orderBy: { kickoffAt: "asc" },
        take: 6,
      }),
      prisma.match.count({ where: { kickoffAt: { gte: weekStart, lt: weekEnd } } }),
      prisma.match.count({ where: { status: "FINISHED", attendance: null } }),
      prisma.competition.findMany(),
      prisma.match.findMany({
        where: { status: "FINISHED", attendance: { not: null } },
        select: { competitionId: true, attendance: true },
      }),
      prisma.match.findMany({
        where: { attendance: { not: null } },
        orderBy: { attendance: "desc" },
        take: 5,
        include: {
          homeTeam: true,
          awayTeam: true,
          competition: true,
          venue: true,
          attendanceRecords: { where: { isSelected: true }, take: 1 },
        },
      }),
      prisma.attendanceRecord.findFirst({ orderBy: { collectedAt: "desc" } }),
    ]);

  const byComp = new Map(comps.map((c) => [c.id, c]));
  const agg = new Map<string, { total: number; count: number }>();
  for (const m of perComp) {
    if (m.attendance == null) continue;
    const a = agg.get(m.competitionId) ?? { total: 0, count: 0 };
    a.total += m.attendance;
    a.count += 1;
    agg.set(m.competitionId, a);
  }
  const averages = [...agg.entries()]
    .map(([id, v]) => ({
      short: byComp.get(id)?.shortName ?? "未知",
      avg: Math.round(v.total / v.count),
      sample: v.count,
    }))
    .sort((a, b) => b.avg - a.avg);

  return {
    todayCount: todayMatches.length,
    today: todayMatches,
    recent7,
    missing,
    leagues: averages.length,
    averages,
    top,
    latest,
  };
}

export default async function LandingPage() {
  const data = await loadMini();
  const maxAvg = Math.max(1, ...data.averages.map((a) => a.avg));

  return (
    <div className="-mt-6 -mb-12 space-y-12 bg-muted/20">
      <Banner />

      {/* Hero */}
      <section className="container mt-6 grid gap-6 rounded-xl border bg-white p-8 shadow-sm md:p-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="space-y-5">
          <Badge variant="outline" className="border-emerald-300 text-emerald-700">
            🇨🇳 静态预览 · 示例数据
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            中国足球比赛监测
            <span className="block text-xl font-medium text-muted-foreground md:text-2xl">
              China League Tracker
            </span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground md:text-lg">
            持续追踪中超 · 中甲 · 中乙 · 中冠 · 足协杯 · 女超等中国各级足球赛事的赛程、赛果与
            <b className="text-foreground">现场观众人数</b>，每条上座数据都保留来源、原文、时间戳与可信度。
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={PREVIEW_HREF}
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              查看 Dashboard 静态预览 →
            </a>
            <a
              href={GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md border bg-background px-6 text-sm font-medium hover:bg-accent"
            >
              查看 GitHub 仓库
            </a>
            <a
              href="#run-locally"
              className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              本地启动完整服务
            </a>
          </div>
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            ⚠️ 这是 <b>静态快照</b>（来自 seed 示例数据）。写操作、抓取、API 与数据库均需要在
            本地或服务端运行完整 Next.js 应用。
          </p>
        </div>

        {/* Hero KPI mini */}
        <div className="grid grid-cols-2 gap-3">
          <KpiTile label="今日比赛" value={data.todayCount} tone="info" />
          <KpiTile label="最近 7 天" value={data.recent7} />
          <KpiTile label="缺失上座" value={data.missing} tone={data.missing > 0 ? "warn" : "ok"} />
          <KpiTile label="覆盖联赛" value={data.leagues} tone="ok" />
        </div>
      </section>

      {/* What we solve */}
      <section className="container space-y-4">
        <SectionTitle id="problem" emoji="🎯" title="我们解决什么问题">
          中国各级足球赛事信息长期分散；上座数据更是"官方一套、媒体一套、社交一套"。
        </SectionTitle>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Tile
            title="赛事数据分散"
            body="中超、中甲、中乙、中冠、足协杯、女超等赛事在不同站点；统一抓取并归一化为同一数据模型。"
          />
          <Tile
            title="上座来源不一致"
            body="官方战报、俱乐部公告、媒体报道、社区估算……同场比赛常出现多个差异较大的数据。"
          />
          <Tile
            title="可信度难判断"
            body="按「官方 > 俱乐部 > 媒体 > 社交 > 人工」打分，每条记录都保留 sourceUrl 和原文片段以便核对。"
          />
          <Tile
            title="可追溯 / 可修正"
            body="所有人工修改写入 audit log；估算数据始终带「估算」标签，避免被误用为精确值。"
          />
        </div>
      </section>

      {/* Mini dashboard */}
      <section className="container space-y-4">
        <SectionTitle id="dashboard" emoji="📊" title="Dashboard 预览（示例数据）">
          下面的数字与排行来自仓库内置的 seed 数据，仅作展示。点击右上角进入完整预览。
        </SectionTitle>
        <div className="flex justify-end">
          <a
            href={PREVIEW_HREF}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            打开完整预览 →
          </a>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="今日比赛" value={data.todayCount} hint="按 Asia/Shanghai 时区统计" />
          <Stat label="最近 7 天比赛" value={data.recent7} hint="向前 3 天、向后 4 天" />
          <Stat
            label="缺失上座的已结束比赛"
            value={data.missing}
            hint="点击查看完整预览中的补录队列"
            tone={data.missing > 0 ? "warn" : "ok"}
          />
          <Stat label="已覆盖联赛" value={data.leagues} hint="已有可统计的上座样本" tone="ok" />
        </div>

        {/* Today */}
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-base font-semibold">🎯 今日比赛</div>
              <div className="text-xs text-muted-foreground">
                {formatDateShort(new Date())} · 共 {data.todayCount} 场
              </div>
            </div>
            <a
              href={`${PREVIEW_HREF.replace("index.html", "")}matches.html`}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              查看比赛列表 →
            </a>
          </div>
          {data.today.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
              🛌 今天没有安排比赛 · 可查看 7 天内的比赛
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.today.map((m) => (
                <div key={m.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="outline">{m.competition.shortName}</Badge>
                    <span className="text-muted-foreground">{m.round ?? "—"}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <div className="flex-1 truncate text-right font-medium">
                      {m.homeTeam.shortName}
                    </div>
                    <div className="rounded bg-muted px-2 py-0.5 font-mono font-semibold">vs</div>
                    <div className="flex-1 truncate font-medium">{m.awayTeam.shortName}</div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    🕒 {formatDate(m.kickoffAt)} · 🏟 {m.venue?.name ?? "球场待定"}
                  </div>
                  <div className="mt-1 text-xs">
                    {m.attendance != null ? (
                      <span className="font-mono">
                        👥 {formatNumber(m.attendance)} 人
                      </span>
                    ) : (
                      <Badge variant="warning">上座待补</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 5 */}
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-base font-semibold">🏆 单场上座 Top 5</div>
              <div className="text-xs text-muted-foreground">
                完整 Top 10 与按联赛筛选见预览页
              </div>
            </div>
            <a
              href={PREVIEW_HREF}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              查看完整 Top 10 →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">比赛</th>
                  <th className="px-3 py-2 hidden md:table-cell">联赛</th>
                  <th className="px-3 py-2 hidden lg:table-cell">球场</th>
                  <th className="px-3 py-2 text-right">观众</th>
                  <th className="px-3 py-2">可信度</th>
                </tr>
              </thead>
              <tbody>
                {data.top.map((m, i) => {
                  const r = m.attendanceRecords[0];
                  return (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-bold text-muted-foreground tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">
                          {m.homeTeam.shortName}{" "}
                          <span className="font-mono text-muted-foreground">
                            {m.homeGoals ?? "-"} : {m.awayGoals ?? "-"}
                          </span>{" "}
                          {m.awayTeam.shortName}
                        </div>
                        <div className="text-xs text-muted-foreground md:hidden">
                          {m.competition.shortName} · {m.venue?.name ?? "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell">
                        <Badge variant="outline">{m.competition.shortName}</Badge>
                      </td>
                      <td className="px-3 py-2 hidden lg:table-cell text-xs text-muted-foreground">
                        {m.venue?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="font-mono font-semibold tabular-nums">
                          {formatNumber(m.attendance)}
                        </div>
                        <div className="text-xs text-muted-foreground">人</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <ConfidenceBadge score={m.attendanceConfidence} />
                          {r?.estimated && <AttendanceBadge estimated />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {data.top.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      暂无上座数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* League averages bars */}
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-base font-semibold">📈 各级联赛场均观众</div>
              <div className="text-xs text-muted-foreground">
                基于已结束比赛中已选中的上座数据；样本不足 3 场会标记
              </div>
            </div>
          </div>
          <ul className="space-y-2">
            {data.averages.length === 0 && (
              <li className="rounded-md border border-dashed bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
                暂无可统计的联赛数据
              </li>
            )}
            {data.averages.map((r) => (
              <li key={r.short} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{r.short}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {r.sample} 场样本
                    </span>
                    {r.sample < 3 && (
                      <Badge variant="warning">小样本，仅供参考</Badge>
                    )}
                  </div>
                  <span className="font-mono font-medium tabular-nums">
                    {formatNumber(r.avg)} 人
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(r.avg / maxAvg) * 100}%` }}
                    aria-hidden
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Confidence mechanism */}
      <section className="container space-y-4">
        <SectionTitle id="trust" emoji="🛡️" title="数据可信度机制">
          每一条 attendance 记录都附带元数据，便于交叉核对、修正与回溯。
        </SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-white p-5">
            <h3 className="font-semibold">字段</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <Field name="sourceUrl" desc="可点击的原文链接，方便复核" />
              <Field name="sourceType" desc="官方联赛 / 俱乐部 / 媒体 / 社交 / 人工" />
              <Field name="rawTextExcerpt" desc="新闻原文片段，留底" />
              <Field name="collectedAt" desc="数据采集时间，UTC 存储，UI 显示北京时间" />
              <Field name="confidenceScore" desc="0..1 可信度数值，由来源/估算/不确定性折扣计算得出" />
              <Field name="estimated" desc="'超过 4 万人'/'近 3 万人' 等估算数据强制标记" />
              <Field name="verified" desc="人工核验过的记录，自动提升到高可信" />
            </ul>
          </div>
          <div className="rounded-lg border bg-white p-5">
            <h3 className="font-semibold">可信度等级</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <ConfTier
                label="高可信"
                range="≥ 0.90"
                tone="success"
                desc="联赛/足协官方、俱乐部官方公告、或人工已核验"
              />
              <ConfTier
                label="中高可信"
                range="0.70 – 0.89"
                tone="info"
                desc="俱乐部官方、权威媒体报道"
              />
              <ConfTier
                label="待核验"
                range="0.50 – 0.69"
                tone="warning"
                desc="社交媒体、社区估算、人工未核验"
              />
              <ConfTier
                label="低可信"
                range="< 0.50"
                tone="muted"
                desc="未知或质量不明的来源"
              />
            </ul>
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              含&ldquo;预计&rdquo;&ldquo;或将&rdquo;&ldquo;可能&rdquo;等不确定描述的数据
              <b>不会被当作 confirmed attendance</b>，会自动降权并写入备注。
            </div>
          </div>
        </div>
      </section>

      {/* Run locally */}
      <section className="container space-y-4">
        <SectionTitle id="run-locally" emoji="💻" title="本地运行完整服务">
          静态预览不支持写操作 / 抓取 / API。要使用完整功能（包括人工补录、抓取调度），请按以下步骤启动：
        </SectionTitle>
        <div className="rounded-lg border bg-zinc-900 p-5 text-sm text-zinc-100">
          <pre className="overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed md:text-sm">
{`# 1. 克隆仓库
git clone https://github.com/timkok/china-league.git
cd china-league

# 2. 安装依赖
npm install

# 3. 配置数据库
cp .env.example .env
#    编辑 .env，将 DATABASE_URL 指向你的 PostgreSQL 实例

# 4. 初始化数据库（含示例数据）
npx prisma migrate dev --name init
npm run db:seed

# 5. 启动开发服务器
npm run dev
#    → http://localhost:3000`}
          </pre>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Tile title="技术栈" body="Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL · Recharts · Cheerio · Vitest" />
          <Tile title="REST API" body="/api/matches · /api/attendance · /api/crawl/run · /api/stats/competitions · /api/stats/teams" />
          <Tile title="抓取" body="可扩展的 adapter 框架，自带 robots.txt 解析与限速；附 cfl-china 占位与示例媒体 adapter" />
        </div>
      </section>

      {/* Notes */}
      <section className="container">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <h3 className="mb-2 font-semibold">⚠️ 注意事项</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>本页是 <b>静态预览</b>，所有数字来自 seed 示例数据；写操作 / 抓取 / 数据库需本地或服务端启动 Next.js 应用。</li>
            <li>抓取请遵守目标网站的 <code>robots.txt</code> 与服务条款；默认 User-Agent 含联系方式、最小请求间隔 2 秒。</li>
            <li>估算数据（如&ldquo;超过 4 万人&rdquo;）始终带&ldquo;估算&rdquo;标签，请勿当作官方精确数据用于商业分析。</li>
            <li>多源差异（同场比赛有多条不同上座数据）在比赛详情页会被显式高亮，便于人工核实。</li>
          </ul>
        </div>
      </section>

      <footer className="container pb-10 pt-2 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} 中国足球比赛监测 · MIT License ·
        <Link href={GITHUB} className="ml-1 underline-offset-2 hover:underline">
          GitHub
        </Link>
        {data.latest && (
          <span> · seed 数据更新：{formatDate(data.latest.collectedAt)}</span>
        )}
      </footer>
    </div>
  );
}

function Banner() {
  return (
    <div className="bg-gradient-to-r from-emerald-50 via-sky-50 to-emerald-50">
      <div className="container flex flex-wrap items-center justify-between gap-2 py-2 text-xs text-emerald-900">
        <span>
          📸 你正在浏览 <b>中国足球比赛监测</b> 的 GitHub Pages 静态预览（seed 示例数据）
        </span>
        <a
          href={GITHUB}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          GitHub 仓库 ↗
        </a>
      </div>
    </div>
  );
}

function SectionTitle({
  id,
  emoji,
  title,
  children,
}: {
  id?: string;
  emoji: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div id={id} className="space-y-1">
      <h2 className="text-2xl font-bold tracking-tight">
        <span className="mr-2" aria-hidden>{emoji}</span>
        {title}
      </h2>
      {children && (
        <p className="text-sm text-muted-foreground md:text-base">{children}</p>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "info" | "warn" | "ok";
}) {
  const ring =
    tone === "warn"
      ? "border-amber-300 bg-amber-50/60"
      : tone === "ok"
      ? "border-emerald-300 bg-emerald-50/60"
      : tone === "info"
      ? "border-sky-300 bg-sky-50/60"
      : "border-border bg-white";
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${ring}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "warn" | "ok";
}) {
  const ring =
    tone === "warn"
      ? "border-amber-300 bg-amber-50/60"
      : tone === "ok"
      ? "border-emerald-300 bg-emerald-50/60"
      : "border-border bg-white";
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${ring}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">
        {formatNumber(value)}
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Tile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="font-semibold">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground md:text-sm">{body}</p>
    </div>
  );
}

function Field({ name, desc }: { name: string; desc: string }) {
  return (
    <li className="flex gap-3">
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{name}</code>
      <span className="text-muted-foreground">{desc}</span>
    </li>
  );
}

function ConfTier({
  label,
  range,
  tone,
  desc,
}: {
  label: string;
  range: string;
  tone: "success" | "info" | "warning" | "muted";
  desc: string;
}) {
  return (
    <li className="flex items-start gap-2">
      <Badge variant={tone}>{label}</Badge>
      <div>
        <div className="font-mono text-xs text-muted-foreground">{range}</div>
        <div className="text-sm">{desc}</div>
      </div>
    </li>
  );
}
