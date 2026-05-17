import { politeFetch } from "./fetcher";
import type { ScraperAdapter, ScraperContext, ScrapeResult } from "./types";
import { cflChinaAdapter } from "./adapters/cfl-china";
import { sampleNewsAdapter } from "./adapters/sample-news";
import { prisma } from "../prisma";
import {
  classifyConfidence,
  computeConfidenceScore,
  sourceTypeRank,
} from "../confidence";

export const ADAPTERS: Record<string, ScraperAdapter> = {
  [cflChinaAdapter.key]: cflChinaAdapter,
  [sampleNewsAdapter.key]: sampleNewsAdapter,
};

export function getAdapter(key: string): ScraperAdapter | undefined {
  return ADAPTERS[key];
}

export function listAdapters(): ScraperAdapter[] {
  return Object.values(ADAPTERS);
}

export function makeContext(): ScraperContext {
  return {
    userAgent:
      process.env.SCRAPER_USER_AGENT ??
      "ChinaLeagueTrackerBot/0.1 (+contact: example@example.com)",
    minIntervalMs: parseInt(process.env.SCRAPER_MIN_INTERVAL_MS ?? "2000", 10),
    fetch: (url, init) => politeFetch(url, { init }),
    log: (msg) => console.log(`[scraper] ${msg}`),
  };
}

/**
 * 运行一个 adapter 并将结果写入数据库（去重、置信度、isSelected 刷新）。
 */
export async function runAdapterAndPersist(
  adapterKey: string,
  trigger: "manual" | "scheduled" = "manual"
): Promise<{
  jobId: string;
  result: ScrapeResult;
  saved: number;
}> {
  const adapter = getAdapter(adapterKey);
  if (!adapter) throw new Error(`未知 adapter: ${adapterKey}`);

  // 确保 Source 存在
  const source = await prisma.source.upsert({
    where: { adapterKey: adapter.key },
    create: {
      adapterKey: adapter.key,
      name: adapter.displayName,
      baseUrl: "",
      type: adapter.sourceType,
    },
    update: {},
  });

  const job = await prisma.crawlJob.create({
    data: {
      sourceId: source.id,
      status: "RUNNING",
      trigger,
      startedAt: new Date(),
    },
  });

  const ctx = makeContext();
  let result: ScrapeResult = { matches: [], attendance: [], warnings: [] };
  let errorLog: string | null = null;

  try {
    result = await adapter.run(ctx);
  } catch (e) {
    errorLog = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
  }

  let saved = 0;
  if (!errorLog) {
    for (const att of result.attendance) {
      try {
        const match = await locateMatch(att);
        if (!match) continue;

        const score = computeConfidenceScore({
          sourceType: att.sourceType,
          isEstimate: att.estimated,
          hasUncertaintyWords: false,
        });
        const label = classifyConfidence(score);
        await prisma.attendanceRecord.create({
          data: {
            matchId: match.id,
            attendanceCount: att.attendanceCount ?? null,
            estimated: att.estimated ?? false,
            confidenceScore: score,
            confidenceLabel: label,
            sourceType: att.sourceType,
            sourceName: att.sourceName,
            sourceUrl: att.sourceUrl,
            rawTextExcerpt: att.rawTextExcerpt,
            note: att.note,
          },
        });
        await refreshSelectedAttendance(match.id);
        saved += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.warnings = [...(result.warnings ?? []), `attendance 写入失败: ${msg}`];
      }
    }
  }

  await prisma.crawlJob.update({
    where: { id: job.id },
    data: {
      status: errorLog ? "FAILED" : result.warnings?.length ? "PARTIAL" : "SUCCESS",
      finishedAt: new Date(),
      itemsFound: result.attendance.length + result.matches.length,
      itemsSaved: saved,
      errorLog: errorLog ?? (result.warnings?.join("\n") || null),
    },
  });

  return { jobId: job.id, result, saved };
}

async function locateMatch(att: {
  matchExternalId?: string;
  matchHint?: {
    seasonYear: number;
    homeTeamName: string;
    awayTeamName: string;
    kickoffDate?: Date;
  };
}) {
  if (att.matchExternalId) {
    const m = await prisma.match.findUnique({
      where: { externalId: att.matchExternalId },
    });
    if (m) return m;
  }
  if (!att.matchHint) return null;

  const home = await resolveTeam(att.matchHint.homeTeamName);
  const away = await resolveTeam(att.matchHint.awayTeamName);
  if (!home || !away) return null;

  const where: any = {
    homeTeamId: home.id,
    awayTeamId: away.id,
  };
  if (att.matchHint.kickoffDate) {
    const start = new Date(att.matchHint.kickoffDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.kickoffAt = { gte: start, lt: end };
  }
  return prisma.match.findFirst({ where, orderBy: { kickoffAt: "desc" } });
}

async function resolveTeam(name: string) {
  const direct = await prisma.team.findFirst({
    where: {
      OR: [
        { name },
        { shortName: name },
        { aliases: { some: { alias: name } } },
      ],
    },
  });
  return direct;
}

/**
 * 根据现有 AttendanceRecord 列表，挑出"最可信"那条并标记 isSelected = true，
 * 同时把 Match.attendance / attendanceConfidence 字段刷新。
 */
export async function refreshSelectedAttendance(matchId: string): Promise<void> {
  const records = await prisma.attendanceRecord.findMany({
    where: { matchId, attendanceCount: { not: null } },
  });
  if (records.length === 0) {
    await prisma.match.update({
      where: { id: matchId },
      data: { attendance: null, attendanceConfidence: null },
    });
    return;
  }

  // 排序：人工 verified 优先；其次 confidence；其次 sourceTypeRank；其次非 estimated；其次 collectedAt 新
  records.sort((a, b) => {
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    if (a.confidenceScore !== b.confidenceScore)
      return b.confidenceScore - a.confidenceScore;
    const ra = sourceTypeRank(a.sourceType);
    const rb = sourceTypeRank(b.sourceType);
    if (ra !== rb) return ra - rb;
    if (a.estimated !== b.estimated) return a.estimated ? 1 : -1;
    return b.collectedAt.getTime() - a.collectedAt.getTime();
  });
  const winner = records[0];

  await prisma.$transaction([
    prisma.attendanceRecord.updateMany({
      where: { matchId, NOT: { id: winner.id } },
      data: { isSelected: false },
    }),
    prisma.attendanceRecord.update({
      where: { id: winner.id },
      data: { isSelected: true },
    }),
    prisma.match.update({
      where: { id: matchId },
      data: {
        attendance: winner.attendanceCount,
        attendanceConfidence: winner.confidenceScore,
      },
    }),
  ]);
}
