import { writable } from "svelte/store";

/**
 * Aggregated stats for the currently loaded feed.
 * Updated by the feed page after fetches/mutations so the sidebar can
 * display the unread count next to "All feeds".
 */
export interface FeedStats {
  total: number;
  unread: number;
}

export const feedStatsStore = writable<FeedStats>({ total: 0, unread: 0 });
