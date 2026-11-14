import { API_BASE_URL } from "$lib/config";
import type { RSSSubscription } from "$lib/types/subscription";

/** Hostname without a leading "www.", or null for unparseable URLs. */
export function normalizeHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Map subscription hostnames to their titles so a story can show the name of
 * the feed it came from (e.g. "THE QUIET WEB") instead of a bare domain.
 */
export function buildSourceTitles(
  subscriptions: RSSSubscription[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const subscription of subscriptions) {
    for (const url of [subscription.url, subscription.feed_url]) {
      const host = normalizeHost(url);
      if (host && !map.has(host)) map.set(host, subscription.title);
    }
  }
  return map;
}

export function sourceLabel(
  link: string,
  sourceTitles: Map<string, string>,
): string {
  const host = normalizeHost(link);
  return (host && sourceTitles.get(host)) || extractDomain(link);
}

/**
 * Story metadata in the design's style: "Today · 9:42 AM", "Yesterday",
 * then "Nov 10" (with the year once it is no longer the current year).
 */
export function formatStoryDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (dayDiff <= 0) {
    const time = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
    return `Today · ${time}`;
  }

  if (dayDiff === 1) return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  }).format(date);
}

/** RSS descriptions can contain HTML — reduce them to plain text. */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Proxy external images through the backend to avoid CORS issues. */
export function getProxiedImageUrl(imageUrl: string): string {
  return `${API_BASE_URL}/proxy/image?url=${encodeURIComponent(imageUrl)}`;
}

/** Key used to match a feed story to a bookmark by URL. */
export function urlKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}
