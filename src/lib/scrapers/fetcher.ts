/**
 * 礼貌抓取：限速 + 自定义 UA + 简单 robots.txt 缓存
 *
 * 注意：本实现是 best-effort 限制；真正部署请：
 *   - 严格遵守 robots.txt
 *   - 使用 sitemap 优先
 *   - 抓取频率 >= 2 秒
 *   - 出错指数退避
 */

const robotsCache = new Map<string, { disallow: string[]; fetchedAt: number }>();
const lastFetchedAt = new Map<string, number>();

const DEFAULT_INTERVAL_MS = parseInt(
  process.env.SCRAPER_MIN_INTERVAL_MS ?? "2000",
  10
);

const DEFAULT_UA =
  process.env.SCRAPER_USER_AGENT ??
  "ChinaLeagueTrackerBot/0.1 (+contact: example@example.com)";

function getHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

async function loadRobots(originUrl: string, ua: string): Promise<string[]> {
  const host = getHost(originUrl);
  const cached = robotsCache.get(host);
  if (cached && Date.now() - cached.fetchedAt < 24 * 60 * 60 * 1000) {
    return cached.disallow;
  }
  try {
    const robotsUrl = new URL("/robots.txt", originUrl).toString();
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": ua },
    });
    if (!res.ok) {
      robotsCache.set(host, { disallow: [], fetchedAt: Date.now() });
      return [];
    }
    const text = await res.text();
    // 极简 parser: 只看 User-Agent: * 段的 Disallow
    const lines = text.split(/\r?\n/);
    let inStar = false;
    const disallow: string[] = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (/^User-agent:\s*\*/i.test(line)) inStar = true;
      else if (/^User-agent:/i.test(line)) inStar = false;
      else if (inStar && /^Disallow:/i.test(line)) {
        const path = line.split(":")[1]?.trim();
        if (path) disallow.push(path);
      }
    }
    robotsCache.set(host, { disallow, fetchedAt: Date.now() });
    return disallow;
  } catch {
    robotsCache.set(host, { disallow: [], fetchedAt: Date.now() });
    return [];
  }
}

function isPathAllowed(url: string, disallow: string[]): boolean {
  try {
    const u = new URL(url);
    return !disallow.some((d) => d && u.pathname.startsWith(d));
  } catch {
    return false;
  }
}

export type FetcherOptions = {
  userAgent?: string;
  minIntervalMs?: number;
  respectRobots?: boolean;
  init?: RequestInit;
};

export async function politeFetch(
  url: string,
  opts: FetcherOptions = {}
): Promise<string> {
  const ua = opts.userAgent ?? DEFAULT_UA;
  const interval = opts.minIntervalMs ?? DEFAULT_INTERVAL_MS;
  const respectRobots = opts.respectRobots ?? true;

  const host = getHost(url);
  if (!host) throw new Error(`Invalid URL: ${url}`);

  if (respectRobots) {
    const disallow = await loadRobots(url, ua);
    if (!isPathAllowed(url, disallow)) {
      throw new Error(`robots.txt disallow: ${url}`);
    }
  }

  // 限速
  const last = lastFetchedAt.get(host) ?? 0;
  const wait = Math.max(0, interval - (Date.now() - last));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetchedAt.set(host, Date.now());

  const res = await fetch(url, {
    ...opts.init,
    headers: {
      "User-Agent": ua,
      "Accept-Language": "zh-CN,zh;q=0.9",
      ...(opts.init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}
