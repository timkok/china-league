/**
 * Seed: 中超 / 中甲 / 中乙 示例比赛 + 至少 3 条 AttendanceRecord
 *
 * 用法: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import { classifyConfidence, computeConfidenceScore } from "../src/lib/confidence";
import { refreshSelectedAttendance } from "../src/lib/scrapers";

const prisma = new PrismaClient();

async function upsertCompetition(args: {
  name: string;
  shortName: string;
  level: any;
  website?: string;
}) {
  return prisma.competition.upsert({
    where: { level_shortName: { level: args.level, shortName: args.shortName } },
    create: {
      name: args.name,
      shortName: args.shortName,
      level: args.level,
      websiteUrl: args.website,
    },
    update: {},
  });
}

async function upsertSeason(competitionId: string, year: number) {
  return prisma.season.upsert({
    where: { competitionId_year: { competitionId, year } },
    create: {
      competitionId,
      year,
      name: `${year}赛季`,
      startDate: new Date(`${year}-03-01`),
      endDate: new Date(`${year}-11-30`),
    },
    update: {},
  });
}

async function upsertVenue(args: {
  name: string;
  city?: string;
  province?: string;
  capacity?: number;
}) {
  return prisma.venue.upsert({
    where: { name_city: { name: args.name, city: args.city ?? "" } },
    create: args,
    update: {},
  });
}

async function upsertTeam(args: {
  name: string;
  shortName: string;
  city?: string;
  province?: string;
  homeVenueId?: string;
  aliases?: string[];
}) {
  const team = await prisma.team.upsert({
    where: { name: args.name },
    create: {
      name: args.name,
      shortName: args.shortName,
      city: args.city,
      province: args.province,
      homeVenueId: args.homeVenueId,
    },
    update: {
      shortName: args.shortName,
      city: args.city,
      homeVenueId: args.homeVenueId,
    },
  });
  for (const alias of args.aliases ?? []) {
    await prisma.teamAlias.upsert({
      where: { alias },
      create: { alias, teamId: team.id },
      update: {},
    });
  }
  return team;
}

async function main() {
  console.log("🏟️  Seeding 中国足球比赛数据...");

  // -- 赛事
  const csl = await upsertCompetition({
    name: "中国足球协会超级联赛",
    shortName: "中超",
    level: "CSL",
    website: "https://www.cfl-china.cn/",
  });
  const cl1 = await upsertCompetition({
    name: "中国足球协会甲级联赛",
    shortName: "中甲",
    level: "CHINA_LEAGUE_ONE",
  });
  const cl2 = await upsertCompetition({
    name: "中国足球协会乙级联赛",
    shortName: "中乙",
    level: "CHINA_LEAGUE_TWO",
  });
  const facup = await upsertCompetition({
    name: "中国足协杯",
    shortName: "足协杯",
    level: "FA_CUP",
  });

  const season2025 = await upsertSeason(csl.id, 2025);
  const cl1Season2025 = await upsertSeason(cl1.id, 2025);
  const cl2Season2025 = await upsertSeason(cl2.id, 2025);
  const cupSeason2025 = await upsertSeason(facup.id, 2025);

  // -- 球场
  const v_shStadium = await upsertVenue({
    name: "上海体育场",
    city: "上海",
    province: "上海",
    capacity: 56842,
  });
  const v_hkSports = await upsertVenue({
    name: "虹口足球场",
    city: "上海",
    province: "上海",
    capacity: 33060,
  });
  const v_pudongSoccer = await upsertVenue({
    name: "上海浦东足球场",
    city: "上海",
    province: "上海",
    capacity: 33765,
  });
  const v_workersStadium = await upsertVenue({
    name: "北京工人体育场",
    city: "北京",
    province: "北京",
    capacity: 68000,
  });
  const v_chengduPhoenix = await upsertVenue({
    name: "成都凤凰山体育公园专业足球场",
    city: "成都",
    province: "四川",
    capacity: 60000,
  });
  const v_qingdaoYouth = await upsertVenue({
    name: "青岛青春足球场",
    city: "青岛",
    province: "山东",
    capacity: 50568,
  });
  const v_nantongZhiyun = await upsertVenue({
    name: "南通支云足球场",
    city: "南通",
    province: "江苏",
    capacity: 32000,
  });
  const v_yanbian = await upsertVenue({
    name: "延吉人民体育场",
    city: "延吉",
    province: "吉林",
    capacity: 30000,
  });

  // -- 球队
  const t_shaihaigang = await upsertTeam({
    name: "上海海港足球俱乐部",
    shortName: "上海海港",
    city: "上海",
    province: "上海",
    homeVenueId: v_pudongSoccer.id,
    aliases: ["海港", "上港", "上海上港"],
  });
  const t_shenhua = await upsertTeam({
    name: "上海申花足球俱乐部",
    shortName: "上海申花",
    city: "上海",
    province: "上海",
    homeVenueId: v_hkSports.id,
    aliases: ["申花"],
  });
  const t_guoan = await upsertTeam({
    name: "北京国安足球俱乐部",
    shortName: "北京国安",
    city: "北京",
    province: "北京",
    homeVenueId: v_workersStadium.id,
    aliases: ["国安"],
  });
  const t_chengdu = await upsertTeam({
    name: "成都蓉城足球俱乐部",
    shortName: "成都蓉城",
    city: "成都",
    province: "四川",
    homeVenueId: v_chengduPhoenix.id,
    aliases: ["蓉城"],
  });
  const t_qingdao = await upsertTeam({
    name: "青岛海牛足球俱乐部",
    shortName: "青岛海牛",
    city: "青岛",
    province: "山东",
    homeVenueId: v_qingdaoYouth.id,
    aliases: ["海牛"],
  });
  const t_nantong = await upsertTeam({
    name: "南通支云足球俱乐部",
    shortName: "南通支云",
    city: "南通",
    province: "江苏",
    homeVenueId: v_nantongZhiyun.id,
    aliases: ["支云"],
  });
  const t_yanbian = await upsertTeam({
    name: "延边龙鼎足球俱乐部",
    shortName: "延边龙鼎",
    city: "延吉",
    province: "吉林",
    homeVenueId: v_yanbian.id,
    aliases: ["延边", "龙鼎"],
  });
  const t_meixian = await upsertTeam({
    name: "广东广州豹足球俱乐部",
    shortName: "广州豹",
    city: "广州",
    province: "广东",
    aliases: ["广州豹"],
  });

  // -- 比赛
  type Mk = {
    competitionId: string;
    seasonId: string;
    homeTeamId: string;
    awayTeamId: string;
    venueId?: string;
    kickoffAt: string;
    round?: string;
    matchday?: number;
    status?: any;
    homeGoals?: number;
    awayGoals?: number;
    externalId?: string;
  };

  const matchesSpec: Mk[] = [
    // 中超：上海海港 vs 上海申花（上海德比，已结束）
    {
      competitionId: csl.id,
      seasonId: season2025.id,
      homeTeamId: t_shaihaigang.id,
      awayTeamId: t_shenhua.id,
      venueId: v_shStadium.id,
      kickoffAt: "2025-04-12T19:35:00+08:00",
      round: "第10轮",
      matchday: 10,
      status: "FINISHED",
      homeGoals: 1,
      awayGoals: 1,
      externalId: "seed-csl-2025-10-shaihaigang-shenhua",
    },
    // 中超：成都蓉城 vs 北京国安（已结束，高上座）
    {
      competitionId: csl.id,
      seasonId: season2025.id,
      homeTeamId: t_chengdu.id,
      awayTeamId: t_guoan.id,
      venueId: v_chengduPhoenix.id,
      kickoffAt: "2025-04-19T19:35:00+08:00",
      round: "第11轮",
      matchday: 11,
      status: "FINISHED",
      homeGoals: 2,
      awayGoals: 0,
      externalId: "seed-csl-2025-11-chengdu-guoan",
    },
    // 中超：今天的比赛（dashboard 演示用）
    (() => {
      const today = new Date();
      today.setHours(19, 35, 0, 0);
      return {
        competitionId: csl.id,
        seasonId: season2025.id,
        homeTeamId: t_guoan.id,
        awayTeamId: t_shaihaigang.id,
        venueId: v_workersStadium.id,
        kickoffAt: today.toISOString(),
        round: "第13轮",
        matchday: 13,
        status: "SCHEDULED" as const,
        externalId: "seed-csl-2025-13-guoan-shaihaigang",
      };
    })(),
    // 中甲：青岛海牛 vs 南通支云
    {
      competitionId: cl1.id,
      seasonId: cl1Season2025.id,
      homeTeamId: t_qingdao.id,
      awayTeamId: t_nantong.id,
      venueId: v_qingdaoYouth.id,
      kickoffAt: "2025-04-13T15:30:00+08:00",
      round: "第8轮",
      matchday: 8,
      status: "FINISHED",
      homeGoals: 0,
      awayGoals: 1,
      externalId: "seed-cl1-2025-8-qingdao-nantong",
    },
    // 中乙：延边龙鼎 vs 广州豹
    {
      competitionId: cl2.id,
      seasonId: cl2Season2025.id,
      homeTeamId: t_yanbian.id,
      awayTeamId: t_meixian.id,
      venueId: v_yanbian.id,
      kickoffAt: "2025-04-20T15:00:00+08:00",
      round: "第6轮",
      matchday: 6,
      status: "FINISHED",
      homeGoals: 2,
      awayGoals: 2,
      externalId: "seed-cl2-2025-6-yanbian-meixian",
    },
    // 足协杯
    {
      competitionId: facup.id,
      seasonId: cupSeason2025.id,
      homeTeamId: t_nantong.id,
      awayTeamId: t_shenhua.id,
      venueId: v_nantongZhiyun.id,
      kickoffAt: "2025-05-07T19:35:00+08:00",
      round: "1/8决赛",
      status: "SCHEDULED",
      externalId: "seed-cup-2025-r16-nantong-shenhua",
    },
  ];

  const createdMatches = [];
  for (const m of matchesSpec) {
    const existing = m.externalId
      ? await prisma.match.findUnique({ where: { externalId: m.externalId } })
      : null;
    if (existing) {
      createdMatches.push(existing);
      continue;
    }
    const created = await prisma.match.create({
      data: {
        competitionId: m.competitionId,
        seasonId: m.seasonId,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        venueId: m.venueId,
        kickoffAt: new Date(m.kickoffAt),
        round: m.round,
        matchday: m.matchday,
        status: m.status ?? "SCHEDULED",
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
        externalId: m.externalId,
      },
    });
    createdMatches.push(created);
  }

  // -- AttendanceRecord（要求 ≥3 条，覆盖官方/媒体/估算）
  // 1) 官方来源：上海海港 vs 上海申花
  const m_derby = createdMatches.find(
    (m) => m.externalId === "seed-csl-2025-10-shaihaigang-shenhua"
  )!;
  await createAttendance(m_derby.id, {
    sourceType: "OFFICIAL_LEAGUE",
    sourceName: "中超联赛官方",
    sourceUrl: "https://www.cfl-china.cn/news/sample-derby",
    attendanceCount: 31569,
    estimated: false,
    rawTextExcerpt: "现场观众人数达 31569 人，创本赛季单场上座新高。",
  });
  // 2) 媒体来源：同一场，数据略有不同（演示来源差异）
  await createAttendance(m_derby.id, {
    sourceType: "MEDIA",
    sourceName: "示例体育媒体",
    sourceUrl: "https://example.com/news/sample-derby-media",
    attendanceCount: 31500,
    estimated: false,
    rawTextExcerpt: "到场观众 31500 人，看台几乎座无虚席。",
  });

  // 3) 估算来源："超过 4 万人" → estimated=true
  const m_chengdu = createdMatches.find(
    (m) => m.externalId === "seed-csl-2025-11-chengdu-guoan"
  )!;
  await createAttendance(m_chengdu.id, {
    sourceType: "MEDIA",
    sourceName: "示例媒体",
    sourceUrl: "https://example.com/news/chengdu-guoan",
    attendanceCount: 40000,
    estimated: true,
    rawTextExcerpt: "成都凤凰山专业足球场内，现场观众超过 4 万人。",
    note: "原文为估算表达，仅作为参考",
  });
  await createAttendance(m_chengdu.id, {
    sourceType: "OFFICIAL_CLUB",
    sourceName: "成都蓉城俱乐部",
    sourceUrl: "https://example.com/chengdurongcheng/match-report",
    attendanceCount: 41832,
    estimated: false,
    rawTextExcerpt: "本场比赛上座 41832 人，再创本赛季新高。",
  });

  // 4) 中甲示例：青岛 vs 南通
  const m_cl1 = createdMatches.find(
    (m) => m.externalId === "seed-cl1-2025-8-qingdao-nantong"
  )!;
  await createAttendance(m_cl1.id, {
    sourceType: "MEDIA",
    sourceName: "示例媒体",
    sourceUrl: "https://example.com/news/qingdao-nantong",
    attendanceCount: 28000,
    estimated: true,
    rawTextExcerpt: "现场到场观众近 2.8 万人。",
  });

  // 5) 中乙示例：人工录入
  const m_cl2 = createdMatches.find(
    (m) => m.externalId === "seed-cl2-2025-6-yanbian-meixian"
  )!;
  await createAttendance(m_cl2.id, {
    sourceType: "MANUAL",
    sourceName: "人工录入",
    attendanceCount: 12000,
    estimated: false,
    rawTextExcerpt: "现场目测约 1.2 万人",
    note: "通过现场图片估计，请进一步核实",
  });

  // 刷新所有有 attendance 记录的比赛的 selected
  for (const m of [m_derby, m_chengdu, m_cl1, m_cl2]) {
    await refreshSelectedAttendance(m.id);
  }

  // -- 数据源记录
  await prisma.source.upsert({
    where: { adapterKey: "cfl-china" },
    create: {
      adapterKey: "cfl-china",
      name: "中国足球职业联赛联合会",
      baseUrl: "https://www.cfl-china.cn/",
      type: "OFFICIAL_LEAGUE",
      enabled: true,
      notes: "官方网站，置信度最高",
    },
    update: {},
  });
  await prisma.source.upsert({
    where: { adapterKey: "sample-news" },
    create: {
      adapterKey: "sample-news",
      name: "示例媒体（演示用）",
      baseUrl: "https://example.com/",
      type: "MEDIA",
      enabled: true,
      notes: "示例 adapter，仅用于演示解析流程",
    },
    update: {},
  });

  console.log("✅ Seed 完成");
}

async function createAttendance(
  matchId: string,
  args: {
    sourceType: any;
    sourceName: string;
    sourceUrl?: string;
    attendanceCount?: number;
    estimated?: boolean;
    rawTextExcerpt?: string;
    note?: string;
    verified?: boolean;
  }
) {
  const score = computeConfidenceScore({
    sourceType: args.sourceType,
    isEstimate: args.estimated,
    hasUncertaintyWords: false,
    verified: args.verified,
  });
  await prisma.attendanceRecord.create({
    data: {
      matchId,
      attendanceCount: args.attendanceCount ?? null,
      estimated: args.estimated ?? false,
      confidenceScore: score,
      confidenceLabel: classifyConfidence(score),
      sourceType: args.sourceType,
      sourceName: args.sourceName,
      sourceUrl: args.sourceUrl,
      rawTextExcerpt: args.rawTextExcerpt,
      note: args.note,
      verified: args.verified ?? false,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
