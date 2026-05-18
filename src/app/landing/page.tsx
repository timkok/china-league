import { prisma } from "@/lib/prisma";
import { formatDate, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge, AttendanceBadge } from "@/components/confidence-badge";

export const dynamic = "force-dynamic";

// 落地页指向预览的相对路径；docs/index.html 与 docs/preview/index.html 共存
const PREVIEW = "./preview/index.html";
const PREVIEW_MATCHES = "./preview/matches.html";
const PREVIEW_MISSING = "./preview/attendance/missing.html";
const PREVIEW_COMP_STATS = "./preview/stats/competitions.html";
const PREVIEW_SOURCES = "./preview/sources.html";
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

  const [todayCount, recent7, missing, comps, perComp, top, latest] =
    await Promise.all([
      prisma.match.count({ where: { kickoffAt: { gte: todayStart, lt: todayEnd } } }),
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
    todayCount,
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
    <div className="-mt-6 -mb-12 bg-gradient-to-b from-slate-50 to-white">
      <ChipBanner />

      {/* === Hero === */}
      <section className="relative overflow-hidden border-b bg-white">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(60% 50% at 80% 0%, rgba(16,185,129,0.10), transparent 70%), radial-gradient(40% 40% at 10% 100%, rgba(59,130,246,0.12), transparent 70%)",
          }}
        />
        <div className="container grid items-center gap-8 py-12 md:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                🇨🇳 中文 · 中超 / 中甲 / 中乙 / 中冠 / 足协杯
              </Badge>
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                📸 静态预览 · seed 示例数据
              </Badge>
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              中国足球比赛监测
              <span className="mt-2 block text-base font-medium text-muted-foreground md:text-xl">
                China League Tracker — 持续追踪赛程、赛果与
                <span className="text-foreground">现场观众人数</span>
              </span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground md:text-lg">
              每条上座数据都保留<b className="text-foreground">来源 URL、来源类型、原文片段、抓取时间</b>
              与<b className="text-foreground">可信度分数</b>。同一场比赛允许多个来源并存，
              UI 显示差异，方便人工核实与修正。
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={PREVIEW}
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                查看 Dashboard 预览 →
              </a>
              <a
                href={GITHUB}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-md border bg-background px-6 text-sm font-medium hover:bg-accent"
                aria-label="在 GitHub 查看仓库（新窗口）"
              >
                GitHub 仓库 ↗
              </a>
              <a
                href="#run-locally"
                className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
              >
                本地运行完整服务
              </a>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
              <b>这是静态预览。</b> 写操作、抓取、数据库与 REST API 均需要本地或服务端启动完整 Next.js
              应用。本页所有数字来自仓库内置的 <code>prisma/seed.ts</code>，并非实时数据。
            </div>
          </div>

          {/* Hero side: KPI tiles */}
          <div className="grid grid-cols-2 gap-3" aria-label="核心指标速览">
            <HeroKpi label="今日比赛" value={data.todayCount} tone="info" />
            <HeroKpi label="最近 7 天" value={data.recent7} hint="向前 3 天向后 4 天" />
            <HeroKpi
              label="缺失上座"
              value={data.missing}
              tone={data.missing > 0 ? "warn" : "ok"}
              hint={data.missing > 0 ? "已结束未补录" : "全部已补录"}
            />
            <HeroKpi label="覆盖联赛" value={data.leagues} tone="ok" hint="有上座样本" />
            <div className="col-span-2 rounded-lg border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium">各级联赛场均观众</span>
                <a href={PREVIEW_COMP_STATS} className="text-primary underline-offset-2 hover:underline">
                  详细 →
                </a>
              </div>
              {data.averages.length === 0 ? (
                <div className="rounded border border-dashed bg-muted/40 px-3 py-4 text-center text-xs text-muted-foreground">
                  暂无数据
                </div>
              ) : (
                <ul className="space-y-2">
                  {data.averages.slice(0, 4).map((r) => (
                    <li key={r.short} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <Badge variant="outline">{r.short}</Badge>
                          <span className="text-muted-foreground">{r.sample} 场</span>
                        </span>
                        <span className="font-mono tabular-nums">{formatNumber(r.avg)} 人</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
                          style={{ width: `${Math.max(3, Math.round((r.avg / maxAvg) * 100))}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* === 解决什么问题 === */}
      <Section id="problem" emoji="🎯" title="项目解决什么问题">
        中国各级足球赛事数据长期分散在不同站点；现场上座更是「官方一套、媒体一套、社区一套」。
      </Section>
      <div className="container">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Tile
            title="赛事数据分散"
            desc="中超、中甲、中乙、中冠、足协杯、女超等赛事分布在不同站点；需要统一抓取并归一化到同一数据模型。"
          />
          <Tile
            title="上座来源不统一"
            desc="官方战报、俱乐部公告、媒体报道、社区估算……同一场比赛常出现多个差异较大的数据。"
          />
          <Tile
            title="可信度差异大"
            desc="按「官方 → 俱乐部 → 媒体 → 社交 → 人工」给来源打分，UI 始终展示最可信值，估算数据单独标记。"
          />
          <Tile
            title="可追溯 / 可修正"
            desc="所有人工修改写入 audit log；含「预计」「或将」「可能」的数据自动降权，避免被当成 confirmed。"
          />
        </div>
      </div>

      {/* === 核心能力 === */}
      <Section id="capabilities" emoji="⚙️" title="核心能力">
        围绕"赛事 → 上座 → 可信度 → 缺失补录 → 抓取 → 统计"完整闭环。
      </Section>
      <div className="container">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Capability
            icon="📅"
            title="比赛追踪"
            desc="按日期、联赛、轮次、球队、城市、球场、状态多维筛选；支持 100+ 比赛分页与搜索。"
            href={PREVIEW_MATCHES}
            cta="进入比赛列表"
          />
          <Capability
            icon="👥"
            title="上座监测"
            desc="每场比赛可保留多条 AttendanceRecord；多源差异在比赛详情页高亮显示。"
            href={PREVIEW}
            cta="查看 Dashboard"
          />
          <Capability
            icon="🛡️"
            title="可信度评分"
            desc="sourceType / estimated / verified / confidenceScore；含不确定性词汇自动降权。"
            href="#trust"
            cta="可信度机制"
          />
          <Capability
            icon="📥"
            title="缺失上座队列"
            desc="自动发现已结束但缺失上座的比赛，支持按联赛、球队、球场、日期筛选；人工补录。"
            href={PREVIEW_MISSING}
            cta="查看缺失队列"
          />
          <Capability
            icon="🔌"
            title="数据源抓取"
            desc="可扩展的 ScraperAdapter 框架，自带 robots.txt 解析与限速；附 cfl-china 占位与示例媒体 adapter。"
            href={PREVIEW_SOURCES}
            cta="查看数据源管理"
          />
          <Capability
            icon="📊"
            title="统计分析"
            desc="联赛场均观众、球队主场排行、单场 Top 10、覆盖样本数；小样本自动标记。"
            href={PREVIEW_COMP_STATS}
            cta="查看联赛统计"
          />
        </div>
      </div>

      {/* === Dashboard 预览 === */}
      <Section id="dashboard" emoji="📊" title="Dashboard 预览（示例数据）">
        下面是从仓库内置 seed 数据生成的看板节选。完整页面请进入静态预览。
      </Section>
      <div className="container space-y-5">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-base font-semibold">🏆 单场上座 Top 5</div>
              <div className="text-xs text-muted-foreground">
                每条记录显示来源、可信度、是否估算
              </div>
            </div>
            <a
              href={PREVIEW}
              className="text-sm text-primary underline-offset-2 hover:underline"
            >
              查看完整 Top 10 →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="单场上座 Top 5">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 w-10">#</th>
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-gradient-to-r from-emerald-50 to-sky-50 p-5">
          <div>
            <div className="font-semibold">想看完整 Dashboard？</div>
            <div className="text-sm text-muted-foreground">
              KPI 卡片、今日比赛、联赛对比、Top 10、可信度说明…一应俱全
            </div>
          </div>
          <a
            href={PREVIEW}
            className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            进入完整 Dashboard 预览 →
          </a>
        </div>
      </div>

      {/* === 可信度机制 === */}
      <Section id="trust" emoji="🛡️" title="数据可信度机制">
        每一条 attendance 记录都附带元数据，便于交叉核对、修正与回溯。
      </Section>
      <div className="container">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-white p-5">
            <h3 className="font-semibold">每条记录保留的字段</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <Field name="sourceUrl" desc="可点击的原文链接，方便复核" />
              <Field name="sourceType" desc="官方联赛 / 俱乐部 / 媒体 / 社交 / 人工 / 未知" />
              <Field name="rawTextExcerpt" desc="新闻或战报原文片段，留底比对" />
              <Field name="collectedAt" desc="数据采集时间；UI 显示 Asia/Shanghai 时区" />
              <Field name="confidenceScore" desc="0..1 数值；按来源、估算、不确定性折扣" />
              <Field name="estimated" desc="「超过 4 万人」「近 3 万」等估算数据强制标记" />
              <Field name="verified" desc="人工核验过的记录，自动提升至高可信" />
            </ul>
          </div>
          <div className="rounded-lg border bg-white p-5">
            <h3 className="font-semibold">可信度等级</h3>
            <ul className="mt-3 space-y-3 text-sm">
              <Tier
                tone="success"
                label="高可信"
                range="≥ 0.90"
                desc="联赛/足协官方、俱乐部官方公告，或人工已核验"
              />
              <Tier
                tone="info"
                label="中高可信"
                range="0.70 – 0.89"
                desc="俱乐部官方、权威媒体的具体报道"
              />
              <Tier
                tone="warning"
                label="待核验"
                range="0.50 – 0.69"
                desc="社交媒体、社区估算、人工未核验"
              />
              <Tier
                tone="muted"
                label="低可信"
                range="< 0.50"
                desc="未知或质量不明的来源"
              />
            </ul>
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              含「预计」「或将」「可能」等不确定描述的数据
              <b>不会被当作 confirmed attendance</b>，会自动降权并写入备注。
            </div>
          </div>
        </div>
      </div>

      {/* === 开发者快速开始（折叠，下沉） === */}
      <Section id="run-locally" emoji="💻" title="开发者快速开始">
        想运行完整服务（包括 API、抓取、人工补录）？按以下步骤本地启动。
      </Section>
      <div className="container space-y-4">
        <details className="rounded-lg border bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            🛠 技术栈 · 项目结构 · 命令
          </summary>
          <div className="mt-3 space-y-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">技术栈</div>
              <div className="mt-1">
                Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL ·
                Recharts · Cheerio · Vitest
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">命令</div>
              <pre className="mt-1 overflow-x-auto rounded-md bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100 md:text-sm">
{`# 1. 克隆 + 安装
git clone https://github.com/timkok/china-league.git
cd china-league
npm install

# 2. 配置数据库
cp .env.example .env
# 将 DATABASE_URL 指向你的 PostgreSQL 实例

# 3. 初始化数据库（含示例数据）
npx prisma migrate dev --name init
npm run db:seed

# 4. 启动开发服务器
npm run dev      # → http://localhost:3000
npm test         # 单元测试（29+ tests）
npm run build    # 生产构建`}
              </pre>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">REST API（本地运行时可用）</div>
              <ul className="mt-1 grid gap-1 font-mono text-xs md:grid-cols-2">
                <li><code>GET /api/matches</code></li>
                <li><code>GET /api/matches/:id</code></li>
                <li><code>POST /api/attendance</code></li>
                <li><code>PATCH /api/attendance/:id/select</code></li>
                <li><code>GET /api/attendance/missing</code></li>
                <li><code>POST /api/crawl/run</code></li>
                <li><code>GET /api/stats/competitions</code></li>
                <li><code>GET /api/stats/teams</code></li>
              </ul>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">数据模型核心表</div>
              <div className="mt-1 text-sm">
                <code>Competition</code> · <code>Season</code> · <code>Team</code> ·{" "}
                <code>TeamAlias</code> · <code>Venue</code> · <code>Match</code> ·{" "}
                <code>AttendanceRecord</code> · <code>Source</code> · <code>CrawlJob</code> ·{" "}
                <code>AuditLog</code>
              </div>
            </div>
          </div>
        </details>

        <details className="rounded-lg border bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            🧪 上座解析（中文规则示例）
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm" aria-label="上座解析规则示例">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-1">输入文本</th>
                  <th className="px-2 py-1">识别值</th>
                  <th className="px-2 py-1">标签</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                <RuleRow text="现场观众人数达 31569 人" value="31,569" tag="单场" />
                <RuleRow text="单场上座 39868 人" value="39,868" tag="单场" />
                <RuleRow text="到场观众 62330 人" value="62,330" tag="单场" />
                <RuleRow text="场均 25754 人" value="25,754" tag="场均（不绑定单场）" />
                <RuleRow text="超过 4 万人" value="40,000" tag="估算" />
                <RuleRow text="近 3 万人" value="30,000" tag="估算" />
                <RuleRow text="1.6 万" value="16,000" tag="估算" />
                <RuleRow text="观众人数为 29,000" value="29,000" tag="单场" />
                <RuleRow text="预计 / 或将 / 可能 …" value="—" tag="不确定 / 降权" />
              </tbody>
            </table>
          </div>
        </details>
      </div>

      {/* === 注意 === */}
      <div className="container my-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <h3 className="mb-2 font-semibold">⚠️ 使用注意</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>本页是 <b>静态预览</b>，所有数字来自 seed 示例数据；写操作 / 抓取 / 数据库需要本地或服务端启动 Next.js 应用。</li>
            <li>抓取请遵守目标网站的 <code>robots.txt</code> 与服务条款；默认 User-Agent 含联系方式、最小请求间隔 2 秒。</li>
            <li>估算数据（如「超过 4 万人」）始终带「估算」标签，请勿当作官方精确数据用于商业分析。</li>
            <li>多源差异（同场比赛有多条不同上座数据）在比赛详情页显式高亮，便于人工核实。</li>
          </ul>
        </div>
      </div>

      <footer className="container pb-10 pt-2 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} 中国足球比赛监测 · MIT License ·{" "}
        <a
          href={GITHUB}
          className="underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub ↗
        </a>
        {data.latest && <span> · seed 数据更新：{formatDate(data.latest.collectedAt)}</span>}
      </footer>
    </div>
  );
}

// ============ 子组件 ============

function ChipBanner() {
  return (
    <div className="border-b bg-gradient-to-r from-emerald-50 via-sky-50 to-emerald-50">
      <div className="container flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone="emerald">📸 静态预览</Pill>
          <Pill tone="emerald">seed 示例数据</Pill>
          <Pill tone="amber">不支持写操作 / 抓取</Pill>
          <Pill tone="slate">完整服务需本地运行</Pill>
        </div>
        <a
          href={GITHUB}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-900 underline-offset-2 hover:underline"
          aria-label="在 GitHub 查看仓库（新窗口）"
        >
          GitHub 仓库 ↗
        </a>
      </div>
    </div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "emerald" | "amber" | "slate";
}) {
  const c =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-100 text-emerald-900"
      : tone === "amber"
      ? "border-amber-300 bg-amber-100 text-amber-900"
      : "border-slate-300 bg-white text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${c}`}>
      {children}
    </span>
  );
}

function Section({
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
    <div className="container mt-12 md:mt-16">
      <div id={id} className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          <span className="mr-2" aria-hidden>{emoji}</span>
          {title}
        </h2>
        {children && (
          <p className="text-sm text-muted-foreground md:text-base">{children}</p>
        )}
      </div>
    </div>
  );
}

function HeroKpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
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
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Tile({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="font-semibold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Capability({
  icon,
  title,
  desc,
  href,
  cta,
}: {
  icon: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-2 text-base font-semibold">
        <span aria-hidden className="text-xl">{icon}</span>
        {title}
      </div>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{desc}</p>
      <a
        href={href}
        className="mt-3 text-sm font-medium text-primary underline-offset-2 hover:underline"
        {...(href.startsWith("http")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {cta} →
      </a>
    </div>
  );
}

function Field({ name, desc }: { name: string; desc: string }) {
  return (
    <li className="flex flex-wrap gap-3">
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{name}</code>
      <span className="flex-1 text-muted-foreground">{desc}</span>
    </li>
  );
}

function Tier({
  tone,
  label,
  range,
  desc,
}: {
  tone: "success" | "info" | "warning" | "muted";
  label: string;
  range: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <Badge variant={tone}>{label}</Badge>
      <div className="flex-1">
        <div className="font-mono text-xs text-muted-foreground">{range}</div>
        <div className="text-sm">{desc}</div>
      </div>
    </li>
  );
}

function RuleRow({ text, value, tag }: { text: string; value: string; tag: string }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-2 py-1 font-mono text-xs">{text}</td>
      <td className="px-2 py-1 font-mono tabular-nums">{value}</td>
      <td className="px-2 py-1 text-muted-foreground">{tag}</td>
    </tr>
  );
}
