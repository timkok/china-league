import type { CompetitionLevel, MatchStatus, SourceType } from "@prisma/client";

export type NormalizedTeamRef = {
  name: string;       // 全称或抓到的最长名
  aliases?: string[]; // 已知简称/别名
};

export type NormalizedMatch = {
  externalId?: string;           // 数据源内的唯一 ID（便于幂等）
  competitionLevel: CompetitionLevel;
  competitionName?: string;
  seasonYear: number;
  round?: string;
  matchday?: number;

  homeTeam: NormalizedTeamRef;
  awayTeam: NormalizedTeamRef;

  venueName?: string;
  venueCity?: string;

  kickoffAt: Date;
  status?: MatchStatus;
  homeGoals?: number | null;
  awayGoals?: number | null;
};

export type NormalizedAttendance = {
  // 必须能定位到比赛：可用 externalId 或 (赛季年 + 主客队名 + kickoff 日期)
  matchExternalId?: string;
  matchHint?: {
    seasonYear: number;
    homeTeamName: string;
    awayTeamName: string;
    kickoffDate?: Date;
  };

  attendanceCount?: number;
  estimated?: boolean;
  sourceType: SourceType;
  sourceName: string;
  sourceUrl?: string;
  rawTextExcerpt?: string;
  note?: string;
};

export type ScrapeResult = {
  matches: NormalizedMatch[];
  attendance: NormalizedAttendance[];
  warnings?: string[];
};

export interface ScraperAdapter {
  key: string;
  displayName: string;
  sourceType: SourceType;

  // 抓取 + 归一化。可手动触发，也可由调度器触发。
  run(ctx: ScraperContext): Promise<ScrapeResult>;
}

export type ScraperContext = {
  userAgent: string;
  minIntervalMs: number;
  // 一个简单的 polite-fetch（实现见 fetcher.ts）
  fetch: (url: string, init?: RequestInit) => Promise<string>;
  log: (msg: string) => void;
};
