# CLAUDE.md

Guidance for AI assistants working in this repo. The README.md is user-facing
(Chinese); this file captures conventions and gotchas useful when writing or
reviewing code.

## Project

**中国足球比赛监测 / China League Tracker** — a Next.js 14 web app that
tracks Chinese football matches (中超/中甲/中乙/中冠/足协杯/女超…) with a
strong focus on **per-match attendance** data: every figure keeps its
`sourceType`, `sourceUrl`, `rawTextExcerpt`, `collectedAt`, and
`confidenceScore`, and the same match can hold multiple competing records.

UI copy and seed data are **Chinese**; keep new user-facing text in
simplified Chinese unless told otherwise.

## Stack

- **Next.js 14** App Router · React 18 · **TypeScript** strict
- **Tailwind CSS** + shadcn-style primitives in `src/components/ui/`
  (Radix + `class-variance-authority`)
- **Prisma 5** + **PostgreSQL** (`DATABASE_URL`)
- **Zod** for API input validation
- **Cheerio** for HTML scraping
- **Recharts** + **TanStack Table** for visualization
- **Vitest** (node environment) for unit tests
- Path alias `@/*` → `src/*` (mirrored in `tsconfig.json` and `vitest.config.ts`)

## Layout

```
src/
  app/                       Next.js App Router (pages + API routes)
    layout.tsx               Root layout, Chinese nav, ToastProvider
    page.tsx                 Dashboard (KPIs, today's matches, top10, league avg)
    landing/page.tsx         Marketing landing — also pre-rendered into docs/index.html
    matches/                 List + [id] detail with manual form & select button
    attendance/missing/      Backfill queue for FINISHED matches without attendance
    stats/{competitions,teams}/  Charts (recharts client components)
    sources/                 Adapter list + last crawl status + run button
    api/
      matches/               GET (filter+paginate) / POST ; [id] GET/PATCH
      attendance/            POST ; missing GET ; [id]/select PATCH
      crawl/run/             POST { adapterKey } — runs an adapter, persists
      stats/{competitions,teams}/  GET aggregations
  components/                Domain components (match-card, confidence-badge, …)
    ui/                      shadcn-style primitives (button, badge, card, …)
    __tests__/               Vitest specs
  lib/
    prisma.ts                Prisma client singleton (globalThis cache in dev)
    utils.ts                 cn(), formatNumber/Date/Time/Relative (zh-CN, Asia/Shanghai)
    confidence.ts            Source base scores, classify/compute, sourceTypeRank
    attendance-parser.ts     Chinese attendance text → ParsedAttendance[]
    scrapers/
      types.ts               ScraperAdapter / Normalized* / ScrapeResult
      fetcher.ts             politeFetch (robots.txt + per-host throttle)
      index.ts               ADAPTERS registry, runAdapterAndPersist, refreshSelectedAttendance
      adapters/              cfl-china (placeholder), sample-news (demo)
    __tests__/               Vitest specs
prisma/
  schema.prisma              Domain model (see below)
  migrations/                Single `20260517021010_init` migration
  seed.ts                    Seeds 4 competitions, 8 teams/venues, 6 matches, ≥5 attendance records
docs/                        Pre-built static snapshot served by GitHub Pages
  index.html                 SSR'd /landing
  preview/                   SSR'd dashboard, matches list & detail, stats, sources, missing
.github/workflows/pages.yml  Deploys docs/ to GitHub Pages on push to a specific branch
```

## Commands

```bash
npm install
cp .env.example .env          # set DATABASE_URL to your local Postgres
npx prisma migrate dev        # apply migrations (creates DB schema)
npm run db:seed               # populate sample data
npm run dev                   # next dev → http://localhost:3000

npm run build                 # production build
npm run lint                  # next lint
npm test                      # vitest run (one-shot)
npm run test:watch            # vitest watch

npm run db:generate           # prisma generate
npm run db:push               # prisma db push (no migration)
npm run db:reset              # prisma migrate reset --force (DESTRUCTIVE)
```

There is **no Postgres in the dev container** by default. Tests in
`src/**/*.test.ts` are pure unit tests and don't need a DB; running
`prisma migrate`, `db:seed`, `npm run dev`, or `npm run build` does.

## Domain model (Prisma)

- **Competition** → **Season** → **Match**. `Competition` is unique by
  `(level, shortName)`; `Season` by `(competitionId, year)`.
- **Team** ⟷ **TeamAlias** (used by scrapers to resolve 简称/全称).
  Teams have a `homeVenueId` pointing at **Venue**.
- **Match** has FKs to competition, season, home/away team, optional
  venue. `externalId` is a globally unique idempotency key for scrapers.
  `attendance` + `attendanceConfidence` are **denormalized snapshots**
  of the currently-selected record — never write them directly; call
  `refreshSelectedAttendance(matchId)` (see below).
- **AttendanceRecord** is the source of truth. Multiple per match. Key
  fields: `attendanceCount`, `estimated`, `confidenceScore` (0..1),
  `confidenceLabel`, `sourceType`, `sourceName`, `sourceUrl`,
  `rawTextExcerpt`, `note`, `isSelected`, `verified`.
- **Source** + **CrawlJob** record adapter runs.
- **AuditLog** captures `create/update/delete/select` actions on Match
  and AttendanceRecord — write to it whenever an API route mutates
  those entities (existing routes do this).

Enums (mirror these names exactly when adding adapters / APIs):
- `CompetitionLevel`: `CSL`, `CHINA_LEAGUE_ONE`, `CHINA_LEAGUE_TWO`,
  `CHINA_CHAMPIONS_LEAGUE`, `FA_CUP`, `WOMEN_SUPER`, `WOMEN_LEAGUE_ONE`,
  `YOUTH`, `OTHER`
- `MatchStatus`: `SCHEDULED | LIVE | FINISHED | POSTPONED | CANCELLED | ABANDONED`
- `SourceType`: `OFFICIAL_LEAGUE | OFFICIAL_CLUB | MEDIA | SOCIAL | MANUAL | UNKNOWN`
- `ConfidenceLabel`: `OFFICIAL | MEDIA | SOCIAL | MANUAL | UNKNOWN`
- `CrawlJobStatus`: `PENDING | RUNNING | SUCCESS | PARTIAL | FAILED`

## Attendance confidence — the core invariant

Every attendance value must carry provenance and a score. The pipeline:

1. **Compute the score** with `computeConfidenceScore({ sourceType, isEstimate,
   hasUncertaintyWords, verified })` from `src/lib/confidence.ts`. Base
   scores: OFFICIAL_LEAGUE 0.95 · OFFICIAL_CLUB 0.85 · MEDIA 0.75 ·
   SOCIAL 0.55 · MANUAL 0.50 · UNKNOWN 0.30. `isEstimate` −0.10,
   uncertainty words ("预计/或将/可能/拟/据悉/传言") −0.25, `verified`
   clamps to ≥0.90.
2. **Label it** with `classifyConfidence(score)` →
   `OFFICIAL / MEDIA / SOCIAL / MANUAL / UNKNOWN`.
3. **Persist** an `AttendanceRecord` (never mutate `Match.attendance`
   directly).
4. **Call `refreshSelectedAttendance(matchId)`** from
   `src/lib/scrapers/index.ts`. It re-ranks all records for the match
   by `(verified → confidenceScore → sourceTypeRank → !estimated →
   collectedAt)`, sets `isSelected` on the winner, and writes back the
   denormalized `Match.attendance` / `attendanceConfidence`.
5. If the operation is a manual user action, append an `AuditLog`
   entry (existing routes follow this pattern — match the shape).

`POST /api/attendance` and `PATCH /api/attendance/:id/select` already
do all of this; reuse them or copy their flow.

## Attendance parser

`parseAttendanceFromText(text)` in `src/lib/attendance-parser.ts`
extracts candidates from Chinese news/match-report text. Important
behaviors that tests pin down:

- Triggers include `现场观众 / 到场观众 / 上座 / 观众人数 / 入场人数 / 现场球迷 / 球迷数 / 观众`.
- `场均 / 平均上座 / 平均观众` produce results with
  `isPerMatchAverage=true` — `pickBestSingleMatchAttendance` filters
  them out.
- `上座率` is a percentage, **not** a count — explicitly skipped.
- "X 万" / "X 千" / "1.6 万" supported via `chineseShortNumberToInt`,
  with guards against `元/吨/平/米/克/瓦` to avoid false positives.
- Sanity range: 500 ≤ count ≤ 200000.
- "估算" keywords (`超过/近/约/大概/左右/上下/突破`) set
  `estimated=true`; "不确定" keywords (`预计/或将/可能/拟/据悉/传言`)
  set `uncertain=true`. Critically, these are tested in a **local
  window around the number**, not the whole snippet, so don't widen
  that window without updating tests.

If you change parsing rules, update `src/lib/__tests__/attendance-parser.test.ts`.

## Scraper framework

To add a source, implement `ScraperAdapter` (`src/lib/scrapers/types.ts`),
register it in the `ADAPTERS` map in `src/lib/scrapers/index.ts`, and
optionally seed a row in `Source`. Inside `run(ctx)`:

- Always use `ctx.fetch(url)` (a wrapper over `politeFetch`). It
  enforces:
  - `User-Agent` from `SCRAPER_USER_AGENT` (must include contact info)
  - per-host throttle ≥ `SCRAPER_MIN_INTERVAL_MS` (default 2000 ms)
  - `robots.txt` `Disallow` for `User-agent: *` — throws on a blocked
    path (don't catch & swallow)
- Return `NormalizedMatch[]` and/or `NormalizedAttendance[]`. For
  attendance you must supply either `matchExternalId` or a `matchHint`
  with `seasonYear + homeTeamName + awayTeamName + kickoffDate`.
  `locateMatch` resolves teams via name / shortName / TeamAlias.
- Errors should be **thrown** (the orchestrator records them in
  `CrawlJob.errorLog`); recoverable issues go in `result.warnings`.

`cfl-china.ts` is a placeholder — fine to leave that way unless the
task is to flesh it out. `sample-news.ts` demonstrates wiring parser →
normalized record.

## API conventions

- Every route file exports `dynamic = "force-dynamic"` — preserve this
  on new routes that touch the DB.
- Validate the body/query with **Zod** and return
  `{ error: parsed.error.issues }, { status: 400 }` on failure (match
  existing shape).
- `params` in App-Router handlers is a **Promise** (`{ params: Promise<{ id: string }> }`)
  — `await` it.
- Mutations that touch attendance must end with
  `await refreshSelectedAttendance(matchId)`.
- Log mutations to `AuditLog` with `entity`, `entityId`, `action`, and
  the diff.

## UI conventions

- Date/time strings always go through `formatDate / formatDateShort /
  formatTime / formatRelative` in `src/lib/utils.ts` — they're locked
  to **Asia/Shanghai** and `zh-CN`. Don't call `toLocaleString`
  ad-hoc.
- Numbers go through `formatNumber` (Chinese grouping).
- Class names compose via `cn()` (clsx + tailwind-merge).
- Confidence and source labels render through
  `<ConfidenceBadge>` / `<SourceTypeBadge>` / `<AttendanceBadge>` in
  `src/components/confidence-badge.tsx` — don't reimplement the
  threshold mapping inline.
- Server components by default; mark client interactivity with
  `"use client"` (e.g. forms, charts, toast triggers in
  `manual-attendance-form.tsx`, `select-attendance-button.tsx`,
  `run-crawl-button.tsx`, `stats/*/chart.tsx`).

## Testing

- Tests live in `src/**/__tests__/*.test.ts(x)` (matched by
  `vitest.config.ts`).
- Node environment, no DOM. Don't import React components that need
  rendering — current tests only cover pure functions
  (`attendance-parser`, `confidence`, `utils`, `confidence-badge`
  helpers).
- Run `npm test` before declaring a change done if you touched
  `lib/` or any utility that has tests.

## GitHub Pages snapshot

`docs/` is a **static export** of the landing + a few read-only
preview pages, served at https://timkok.github.io/china-league/. It
is hand-built / committed; there is no script in this repo that
regenerates it. Don't edit `docs/preview/*.html` to fix data issues —
fix the source (seed or page) and regenerate the snapshot if needed.

The Pages workflow (`.github/workflows/pages.yml`) deploys on push to
branch `claude/football-match-tracker-fDL8m` (not `main`).

## Conventions worth keeping

- **Chinese-first UI**, comments mixed Chinese/English are fine.
- **Asia/Shanghai** is the canonical timezone for any user-visible
  date/time.
- **Never overwrite `Match.attendance` directly** — always go through
  `refreshSelectedAttendance`.
- **Estimated data stays flagged** (`estimated=true`). Don't promote
  it to confirmed.
- **Provenance is mandatory**: every AttendanceRecord must carry
  `sourceType` + `sourceName`; `sourceUrl` and `rawTextExcerpt`
  strongly preferred.
- **No hard-coded API keys**; everything sensitive via `.env`.
- **Respect `robots.txt`** in scrapers and keep `SCRAPER_USER_AGENT`
  identifiable.
