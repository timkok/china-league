/**
 * 中国足球职业联赛联合会 cfl-china.cn 抓取适配器（占位实现）
 *
 * 真实实现需要：
 *   - 解析其官网的赛程页面（HTML 或 JSON 接口）
 *   - 抓取战报详情，提取观众人数
 *
 * 这里给出框架代码：
 *   - 拉取首页判断站点可达；不实际写入比赛
 *   - 留出 TODO 让接入者补全选择器
 */

import * as cheerio from "cheerio";
import type { ScraperAdapter, ScrapeResult } from "../types";

export const cflChinaAdapter: ScraperAdapter = {
  key: "cfl-china",
  displayName: "中国足球职业联赛联合会",
  sourceType: "OFFICIAL_LEAGUE",

  async run(ctx): Promise<ScrapeResult> {
    const warnings: string[] = [];
    const baseUrl = "https://www.cfl-china.cn/";

    try {
      const html = await ctx.fetch(baseUrl);
      const $ = cheerio.load(html);
      const title = $("title").text();
      ctx.log(`cfl-china 首页加载成功: ${title}`);

      // TODO: 解析具体的赛程/战报列表 selector
      warnings.push(
        "cfl-china adapter 仍是占位实现，需要根据真实 DOM 补全 selector"
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      warnings.push(`抓取 cfl-china.cn 失败: ${msg}`);
    }

    return {
      matches: [],
      attendance: [],
      warnings,
    };
  },
};
