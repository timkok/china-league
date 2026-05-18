# 中国足球比赛监测 / China League Tracker

一个持续追踪中国各级足球比赛（中超 / 中甲 / 中乙 / 中冠 / 足协杯 / 女超 / 女甲 等）赛程、赛果与**现场观众人数**的中文 Web App。

> 重点：每条上座数据都保留**来源 URL、抓取时间、来源类型、原文片段、可信度**，并支持多源差异展示与人工修正。

## 🌐 在线预览（静态）

- **GitHub Pages 项目主页**：https://timkok.github.io/china-league/
  - 落地页：项目价值、可信度机制、本地启动说明、嵌入式 mini dashboard
  - Dashboard 完整预览：https://timkok.github.io/china-league/preview/

> 静态预览基于 seed 示例数据；写操作、抓取、API 都需要本地启动完整 Next.js 应用。

`docs/` 内的目录结构：

```
docs/
├── index.html               ← 落地页（/landing 路由 SSR 后处理）
├── preview/
│   ├── index.html           ← Dashboard
│   ├── matches.html         ← 比赛列表
│   ├── matches/<id>.html    ← 比赛详情
│   ├── attendance/missing.html
│   ├── sources.html
│   └── stats/{competitions,teams}.html
└── .nojekyll
```

## ✨ 功能

- **比赛**：按日期 / 联赛 / 轮次 / 球队 / 城市 / 球场 / 状态多维筛选；支持比赛详情、人工修正、多源对比
- **上座监测**：每场支持多条 `AttendanceRecord`，按 `OFFICIAL_LEAGUE > OFFICIAL_CLUB > MEDIA > SOCIAL > MANUAL` 优先级自动挑选展示
- **数据源**：可扩展的 `ScraperAdapter` 框架；内置 `cfl-china`（占位）与 `sample-news`（演示）两个 adapter；遵守 robots.txt + 限速
- **观众人数解析**：对中文新闻 / 战报做规则化抽取，区分**单场 / 场均 / 估算 / 不确定**
- **可视化**：联赛场均对比柱图、球队主场排行、球队场次趋势线
- **API**：完整 REST 入口（详见下方）

## 🧱 技术栈

Next.js 14 (App Router) + TypeScript · Tailwind CSS · shadcn-style UI · Prisma + PostgreSQL · Recharts · TanStack Table · Cheerio · Vitest

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 复制环境变量并填好数据库 URL
cp .env.example .env
# 编辑 .env, 将 DATABASE_URL 指向你的 PostgreSQL 实例

# 3. 创建数据库结构 + 种子数据
npx prisma migrate dev --name init
npm run db:seed

# 4. 启动开发服务器
npm run dev
# 打开 http://localhost:3000
```

### 测试

```bash
npm test         # 一次性运行
npm run test:watch
```

## 🗂 目录

```
prisma/
  schema.prisma       Prisma 数据库 schema
  seed.ts             种子数据：中超/中甲/中乙 + 至少 3 条 attendance 记录
src/
  app/                Next.js App Router 页面 + API routes
    api/
      matches/                 GET / POST / PATCH 比赛
      attendance/              POST 新建上座；GET /missing；PATCH /:id/select
      crawl/run/               POST 手动触发抓取
      stats/competitions       联赛聚合
      stats/teams              球队聚合
    matches/                   列表 + 详情
    attendance/missing/        缺失上座队列
    stats/                     联赛 / 球队统计
    sources/                   数据源管理
  components/                  UI 组件
  lib/
    prisma.ts                  Prisma client（单例）
    attendance-parser.ts       中文上座解析
    confidence.ts              可信度规则
    scrapers/                  抓取适配器框架
      types.ts                 通用类型
      fetcher.ts               polite-fetch + robots.txt
      index.ts                 调度 + 写库
      adapters/
        cfl-china.ts           官方占位
        sample-news.ts         媒体示例
```

## 📊 数据模型概览

- `Competition`（赛事/联赛） — `Season` — `Match`
- `Team` — `TeamAlias`（解决简称/全称不一致）
- `Venue`（球场，含容量）
- `Match.attendance` / `attendanceConfidence` 是当前**展示**值的冗余字段（写入由 `refreshSelectedAttendance` 控制）
- `AttendanceRecord`（多源原始记录） — 关键字段：
  - `attendanceCount` / `estimated` / `confidenceScore` / `confidenceLabel`
  - `sourceType` / `sourceName` / `sourceUrl` / `rawTextExcerpt` / `note`
  - `collectedAt` / `createdBy` / `isSelected` / `verified`
- `Source` + `CrawlJob`（抓取任务历史）
- `AuditLog`（人工 / 系统修改痕迹）

## 🔌 数据源 / 抓取

```ts
// 实现一个 adapter：返回归一化的 NormalizedMatch / NormalizedAttendance
import type { ScraperAdapter } from "@/lib/scrapers/types";

export const myAdapter: ScraperAdapter = {
  key: "my-source",
  displayName: "我的来源",
  sourceType: "MEDIA",
  async run(ctx) {
    const html = await ctx.fetch("https://example.com/...");
    // ...解析...
    return { matches: [], attendance: [], warnings: [] };
  },
};
```

将 adapter 注册到 `src/lib/scrapers/index.ts` 的 `ADAPTERS`，并在 `Source` 表里通过相同的 `adapterKey` 启用。

**抓取礼仪**：
- 默认 `User-Agent` 含联系方式，可通过 `SCRAPER_USER_AGENT` 覆盖
- `politeFetch` 默认两次请求间隔 ≥ 2 秒，可通过 `SCRAPER_MIN_INTERVAL_MS` 调整
- 自动加载 `robots.txt` 并对 `User-agent: *` 的 `Disallow` 取并集，被禁路径直接抛错
- 失败的任务保存到 `CrawlJob.errorLog`

## 📝 上座解析

`parseAttendanceFromText(text)` 接受一段中文报道，输出候选 `ParsedAttendance[]`。
支持表达：

| 例子 | 识别结果 |
|---|---|
| `现场观众人数达 31569 人` | 31569，单场 |
| `单场上座 39868 人` | 39868，单场 |
| `到场观众 62330 人` | 62330，单场 |
| `场均 25754 人` | 25754，**场均**（不会写入单场） |
| `超过 4 万人` | 40000，**estimated** |
| `近 3 万人` | 30000，**estimated** |
| `1.6 万` | 16000，**estimated** |
| `观众人数为 29,000` | 29000 |
| `预计 / 或将 / 可能` | uncertain，不能作为 confirmed |

## 📐 可信度规则

| 来源 | 默认分 |
|---|---|
| 联赛 / 足协官方 | 0.95 |
| 俱乐部官方 | 0.85 |
| 主流媒体 | 0.75 |
| 社交 / 社区 | 0.55 |
| 人工录入 | 0.50（verified 后 ≥0.90） |

- 估算扣 0.10
- 含"预计/或将/可能/拟"扣 0.25
- 当一场比赛存在多条记录时，按 (verified → confidence → sourceTypeRank → 非 estimated → collectedAt) 排序自动挑选 `isSelected = true`

## 🔌 REST API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/matches` | 列表，支持 `competition / team / city / status / from / to / page / pageSize` |
| GET | `/api/matches/:id` | 详情（含所有 attendance 记录） |
| POST | `/api/matches` | 新建（管理用） |
| PATCH | `/api/matches/:id` | 修改 |
| GET | `/api/attendance/missing` | 缺失上座队列 |
| POST | `/api/attendance` | 新建一条上座记录（人工或脚本） |
| PATCH | `/api/attendance/:id/select` | 手动指定展示值 |
| POST | `/api/crawl/run` | 手动触发某个 adapter |
| GET | `/api/stats/competitions` | 联赛聚合 |
| GET | `/api/stats/teams` | 球队主场聚合 |

## ⚙️ 调度抓取（可选）

可用 `BullMQ + Redis` / `node-cron` / 外部 cron 调用 `/api/crawl/run`：
```bash
*/30 * * * * curl -X POST http://localhost:3000/api/crawl/run -d '{"adapterKey":"cfl-china"}' -H 'content-type: application/json'
```

## ⚠️ 注意

- 真实环境请确认抓取目标的 ToS 与 robots.txt
- **不要硬编码 API key**；使用环境变量
- 比赛是否"开放给公众的"上座统计，请保留来源链接以便核对
- 估算性数据请始终保留 `estimated=true`，避免被当作精确值用于商业分析

## 📜 License

MIT
