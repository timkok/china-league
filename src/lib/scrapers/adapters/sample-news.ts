/**
 * 示例媒体适配器：演示如何把一段新闻原文解析为 AttendanceRecord。
 * 真实使用时把 SAMPLE_NEWS 替换为对站点的实际抓取，并附上来源 URL。
 */

import { parseAttendanceFromText, pickBestSingleMatchAttendance } from "../../attendance-parser";
import type { ScraperAdapter, ScrapeResult } from "../types";

const SAMPLE_NEWS: Array<{
  url: string;
  title: string;
  publishedAt: Date;
  body: string;
  hint?: {
    seasonYear: number;
    homeTeamName: string;
    awayTeamName: string;
    kickoffDate?: Date;
  };
}> = [
  {
    url: "https://example.com/news/sample-1",
    title: "上海德比上座新高 现场观众人数达 31569 人",
    publishedAt: new Date("2025-04-12T14:00:00+08:00"),
    body:
      "本场上海德比战，上海海港主场迎战上海申花，现场观众人数达 31569 人，创下本赛季单场上座新高。",
    hint: {
      seasonYear: 2025,
      homeTeamName: "上海海港",
      awayTeamName: "上海申花",
      kickoffDate: new Date("2025-04-12T19:35:00+08:00"),
    },
  },
];

export const sampleNewsAdapter: ScraperAdapter = {
  key: "sample-news",
  displayName: "示例媒体（演示用）",
  sourceType: "MEDIA",

  async run(ctx): Promise<ScrapeResult> {
    const warnings: string[] = [];
    const attendance = [];

    for (const article of SAMPLE_NEWS) {
      const parsed = parseAttendanceFromText(article.body);
      const best = pickBestSingleMatchAttendance(parsed);
      if (!best) {
        warnings.push(`未能从 ${article.url} 提取人数`);
        continue;
      }
      attendance.push({
        sourceType: "MEDIA" as const,
        sourceName: "示例媒体",
        sourceUrl: article.url,
        attendanceCount: best.count,
        estimated: best.estimated,
        rawTextExcerpt: best.rawTextExcerpt,
        matchHint: article.hint,
      });
      ctx.log(`提取成功：${article.title} -> ${best.count}`);
    }

    return { matches: [], attendance, warnings };
  },
};
