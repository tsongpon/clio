/**
 * Short-lived cache of per-subscription unread counts for the Manage
 * subscriptions page. The API has no unread field, so each count costs a
 * feed request; caching avoids repeating them on every visit.
 */
export type UnreadInfo = { count: number; more: boolean } | "error";

const TTL_MS = 2 * 60 * 1000;
const cache = new Map<string, { info: UnreadInfo; at: number }>();

export function getCachedUnread(subscriptionId: string): UnreadInfo | null {
  const entry = cache.get(subscriptionId);
  if (!entry || Date.now() - entry.at > TTL_MS) return null;
  return entry.info;
}

export function setCachedUnread(subscriptionId: string, info: UnreadInfo) {
  // Errors aren't cached, so the next visit retries them.
  if (info === "error") cache.delete(subscriptionId);
  else cache.set(subscriptionId, { info, at: Date.now() });
}

/** Drop all counts, e.g. after stories are marked as read. */
export function invalidateUnreadCounts(): void {
  cache.clear();
}
