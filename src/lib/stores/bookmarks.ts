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

  let loadPromise: Promise<void> | null = null;

  function handleAuthError(): void {
    items.set([]);
    loaded.set(false);
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

  async function fetchAll(): Promise<void> {
    loading.set(true);
    try {
      const all: BookmarkItem[] = [];
      let cursor: string | null = null;
      do {
        const url: string = cursor
          ? `${API_BASE_URL}/bookmarks?next_cursor=${cursor}&page_size=${PAGE_SIZE}`
          : `${API_BASE_URL}/bookmarks?page_size=${PAGE_SIZE}`;
        const response = await authenticatedFetch(url);
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const page: BookmarkResponse = await response.json();
        all.push(...(page.data ?? []));
        cursor = page.has_more ? page.next_cursor : null;
      } while (cursor);

      items.set(all);
      loaded.set(true);
    } catch (error) {
      console.error("Failed to fetch bookmarks:", error);
    } finally {
      loading.set(false);
    }
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
      loadPromise ??= fetchAll().finally(() => {
        loadPromise = null;
      });
      return loadPromise;
    },

    /** Forget the current user's bookmarks (logout). */
    reset(): void {
      items.set([]);
      loaded.set(false);
      loadPromise = null;
    },

    reload(): Promise<void> {
      loadPromise = fetchAll().finally(() => {
        loadPromise = null;
      });
      return loadPromise;
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
          items.update(($items) => [
            created,
            ...$items.filter((b) => b.id !== created.id),
          ]);
        } else {
          await fetchAll();
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
