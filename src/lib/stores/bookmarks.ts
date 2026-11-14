import { derived, get, writable } from "svelte/store";
import { goto } from "$app/navigation";
import { API_BASE_URL } from "$lib/config";
import { authenticatedFetch, removeToken } from "$lib/utils/auth";
import { urlKey } from "$lib/utils/story";

export interface BookmarkItem {
  id: string;
  url: string;
  title: string;
  user_id: string;
  main_image_url: string;
  content_summary: string;
  created_at: string;
}

interface BookmarkResponse {
  data: BookmarkItem[];
  next_cursor: string | null;
  has_more: boolean;
}

const PAGE_SIZE = 100;

/**
 * All of the user's bookmarks, shared by the feed (to show "Saved" state),
 * the bookmarks page, and the sidebar count. The API has no per-story
 * "is bookmarked" flag, so the whole list is loaded once and matched by URL.
 */
function createBookmarksStore() {
  const items = writable<BookmarkItem[]>([]);
  const loaded = writable(false);
  const loading = writable(false);
  // URL keys with a save/remove request in flight (blocks double clicks).
  const pending = writable<Set<string>>(new Set());

  // The in-flight full load, shared by every caller that wants the list.
  let loadPromise: Promise<void> | null = null;
  // Bumped on every new load (and on reset) so a superseded load can never
  // overwrite newer data.
  let generation = 0;
  // Saves/removals made while a load is running. The load's snapshot may
  // predate them, so they are re-applied on top of what it fetched.
  let addedDuringLoad = new Map<string, BookmarkItem>();
  let removedDuringLoad = new Set<string>();

  function handleAuthError(): void {
    generation++;
    loadPromise = null;
    items.set([]);
    loaded.set(false);
    loading.set(false);
    removeToken();
    goto("/login");
  }

  function setPending(key: string, on: boolean): void {
    pending.update((set) => {
      const next = new Set(set);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function mergeLocalChanges(fetched: BookmarkItem[]): BookmarkItem[] {
    // Pages can overlap if bookmarks change mid-load; keep one copy of each
    // id (duplicate keys would break keyed lists).
    const seen = new Set<string>();
    const unique = fetched.filter((b) => {
      if (seen.has(b.id) || removedDuringLoad.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
    const added = [...addedDuringLoad.values()].filter((b) => !seen.has(b.id));
    return [...added, ...unique];
  }

  async function fetchAll(gen: number): Promise<void> {
    // On the first load, publish each page as it arrives so the bookmarks
    // page and "Saved" states appear after one request, not after all of
    // them. A refresh of an already-loaded list swaps in the result at the
    // end instead, so the list doesn't shrink and regrow.
    const progressive = !get(loaded);
    try {
      const all: BookmarkItem[] = [];
      let cursor: string | null = null;
      do {
        const url: string = cursor
          ? `${API_BASE_URL}/bookmarks?next_cursor=${encodeURIComponent(cursor)}&page_size=${PAGE_SIZE}`
          : `${API_BASE_URL}/bookmarks?page_size=${PAGE_SIZE}`;
        const response = await authenticatedFetch(url);
        if (gen !== generation) return;
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const page: BookmarkResponse = await response.json();
        if (gen !== generation) return;
        all.push(...(page.data ?? []));
        cursor = page.has_more ? page.next_cursor : null;
        if (progressive && cursor) items.set(mergeLocalChanges(all));
      } while (cursor);

      items.set(mergeLocalChanges(all));
      loaded.set(true);
    } catch (error) {
      console.error("Failed to fetch bookmarks:", error);
    } finally {
      if (gen === generation) loading.set(false);
    }
  }

  function startLoad(): Promise<void> {
    const gen = ++generation;
    addedDuringLoad = new Map();
    removedDuringLoad = new Set();
    loading.set(true);
    const promise: Promise<void> = fetchAll(gen).finally(() => {
      if (loadPromise === promise) loadPromise = null;
    });
    loadPromise = promise;
    return promise;
  }

  /** Record a local change so an in-flight load doesn't undo it. */
  function noteAdded(item: BookmarkItem): void {
    if (!loadPromise) return;
    addedDuringLoad.set(item.id, item);
    removedDuringLoad.delete(item.id);
  }
  function noteRemoved(id: string): void {
    if (!loadPromise) return;
    removedDuringLoad.add(id);
    addedDuringLoad.delete(id);
  }

  return {
    items: { subscribe: items.subscribe },
    loaded: { subscribe: loaded.subscribe },
    loading: { subscribe: loading.subscribe },
    pending: { subscribe: pending.subscribe },

    /** Bookmarks by URL key, for O(1) "is this story saved?" lookups. */
    byUrl: derived(items, ($items) => {
      const map = new Map<string, BookmarkItem>();
      for (const item of $items) map.set(urlKey(item.url), item);
      return map;
    }),

    /** Load once per session; concurrent callers share the request. */
    ensureLoaded(): Promise<void> {
      if (get(loaded)) return Promise.resolve();
      return loadPromise ?? startLoad();
    },

    /** Forget the current user's bookmarks (logout). */
    reset(): void {
      generation++;
      loadPromise = null;
      items.set([]);
      loaded.set(false);
      loading.set(false);
    },

    /** Refresh the list. Joins a load that is already running. */
    reload(): Promise<void> {
      return loadPromise ?? startLoad();
    },

    /** Save a URL. Returns true on success. */
    async add(url: string): Promise<boolean> {
      const key = urlKey(url);
      if (get(pending).has(key)) return false;
      setPending(key, true);
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/bookmarks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (response.status === 401) {
          handleAuthError();
          return false;
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Use the created bookmark when the API returns it; otherwise
        // refetch so the new item (and its id, needed to remove) is known.
        const body = await response.json().catch(() => null);
        const created: BookmarkItem | undefined = body?.data?.id
          ? body.data
          : body?.id
            ? body
            : undefined;
        if (created) {
          noteAdded(created);
          items.update(($items) => [
            created,
            ...$items.filter((b) => b.id !== created.id),
          ]);
        } else {
          // A load already running may have been sent before this save,
          // so wait for it and then load again.
          await loadPromise?.catch(() => {});
          await (loadPromise ?? startLoad());
        }
        return true;
      } catch (error) {
        console.error("Failed to add bookmark:", error);
        return false;
      } finally {
        setPending(key, false);
      }
    },

    /** Remove a bookmark. Returns true on success. */
    async remove(bookmark: BookmarkItem): Promise<boolean> {
      const key = urlKey(bookmark.url);
      if (get(pending).has(key)) return false;
      setPending(key, true);
      try {
        const response = await authenticatedFetch(
          `${API_BASE_URL}/bookmarks/${bookmark.id}`,
          { method: "DELETE" },
        );
        if (response.status === 401) {
          handleAuthError();
          return false;
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        noteRemoved(bookmark.id);
        items.update(($items) => $items.filter((b) => b.id !== bookmark.id));
        return true;
      } catch (error) {
        console.error("Failed to remove bookmark:", error);
        return false;
      } finally {
        setPending(key, false);
      }
    },
  };
}

export const bookmarksStore = createBookmarksStore();
