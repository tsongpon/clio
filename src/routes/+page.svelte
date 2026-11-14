<script lang="ts">
  import { page } from "$app/stores";
  import { RefreshCw, Bookmark, AlertCircle } from "lucide-svelte";
  import {
    authenticatedFetch,
    isAuthenticated,
    removeToken,
  } from "$lib/utils/auth";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { API_BASE_URL } from "$lib/config";
  import placeholderImage from "$lib/assets/feed-placeholder.svg";
  import searchIcon from "$lib/assets/search-icon.svg";
  import externalReadingCue from "$lib/assets/external-reading-cue.svg";
  import unreadIndicator from "$lib/assets/unread-indicator.svg";
  import openInNewTabIcon from "$lib/assets/open-in-new-tab.svg";
  import {
    subscriptionsStore,
    subscriptionsLoadingStore,
  } from "$lib/stores/subscriptions";
  import { feedStatsStore } from "$lib/stores/feedStats";

  interface FeedItem {
    id: string;
    title: string;
    main_image_url: string;
    link: string;
    description: string;
    guid: string;
    published_at: string;
    is_read: boolean;
  }

  interface FeedResponse {
    data: FeedItem[];
    next_cursor: string | null;
    has_more: boolean;
  }

  let feeds = $state<FeedItem[]>([]);
  let feedNextCursor = $state<string | null>(null);
  let feedHasMore = $state<boolean>(true);
  let pageSize = $state<number>(30);
  let isLoading = $state<boolean>(false);
  let isReloadingFeed = $state<boolean>(false);
  let notification = $state<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  let notificationTimeout: number | null = null;
  let bookmarkingFeedIds = $state<Set<string>>(new Set());

  // Feed view state (client-side search / filter / sorting)
  let searchQuery = $state<string>("");
  let filterMode = $state<"all" | "unread">("all");
  let sortMode = $state<"newest" | "oldest">("newest");
  let isMarkingAllRead = $state<boolean>(false);

  const unreadCount = $derived(feeds.filter((feed) => !feed.is_read).length);

  const displayedFeeds = $derived.by(() => {
    let items = feeds;

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      items = items.filter(
        (feed) =>
          (feed.title || "").toLowerCase().includes(query) ||
          (feed.description || "").toLowerCase().includes(query),
      );
    }

    if (filterMode === "unread") {
      items = items.filter((feed) => !feed.is_read);
    }

    return [...items].sort((a, b) => {
      const aTime = new Date(a.published_at).getTime();
      const bTime = new Date(b.published_at).getTime();
      return sortMode === "newest" ? bTime - aTime : aTime - bTime;
    });
  });

  // The subscription currently filtering the feed (via ?subscription_id=)
  const activeSubscription = $derived.by(() => {
    const subscriptionId = $page.url.searchParams.get("subscription_id");
    if (!subscriptionId) return null;
    return $subscriptionsStore.find((s) => s.id === subscriptionId) ?? null;
  });

  const collectionDate = $derived(
    new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
      .format(new Date())
      .toUpperCase(),
  );

  function handleAuthError(): void {
    // Clear invalid token
    removeToken();
    // Redirect to login
    goto("/login");
  }

  function updateFeedStats(): void {
    feedStatsStore.set({
      total: feeds.length,
      unread: feeds.filter((feed) => !feed.is_read).length,
    });
  }

  // Articles open via anchor links; mark them read in the background.
  async function markFeedRead(feedId: string): Promise<void> {
    const success = await markAsRead(feedId);

    if (success) {
      // Update the feed's is_read status in the UI
      feeds = feeds.map((feed) =>
        feed.id === feedId ? { ...feed, is_read: true } : feed,
      );
      updateFeedStats();
    }
  }

  let previousSubscriptionId = $state<string | null>(null);
  let scrollTrigger = $state<HTMLElement | null>(null);
  let isInitialized = $state<boolean>(false);

  onMount(() => {
    // Check if user has a token
    if (!isAuthenticated()) {
      goto("/login");
      return;
    }

    // Load initial data
    const subscriptionId = $page.url.searchParams.get("subscription_id");
    previousSubscriptionId = subscriptionId;
    isInitialized = true;
    fetchFeeds(null, false, true);
  });

  // Watch for URL parameter changes and reload feeds
  $effect(() => {
    // Skip until initialized to prevent running on mount
    if (!isInitialized) return;

    const subscriptionId = $page.url.searchParams.get("subscription_id");

    // Only reload if subscription_id has actually changed
    if (subscriptionId !== previousSubscriptionId) {
      previousSubscriptionId = subscriptionId;
      // Reset feeds and reload when subscription filter changes
      feeds = [];
      feedNextCursor = null;
      feedHasMore = true;
      fetchFeeds(null, false, false);
    }
  });

  async function fetchFeeds(
    cursor: string | null = null,
    append: boolean = false,
    retrievefeed: boolean = false,
  ): Promise<void> {
    if (isLoading) return;

    isLoading = true;
    try {
      // Get subscription_id from URL if present
      const subscriptionId = $page.url.searchParams.get("subscription_id");

      // Build URL with cursor if provided
      let url = cursor
        ? `${API_BASE_URL}/feeds?next_cursor=${cursor}&page_size=${pageSize}&retrieve_feed=${retrievefeed}`
        : `${API_BASE_URL}/feeds?page_size=${pageSize}&retrieve_feed=${retrievefeed}`;

      // Add subscription_id to URL if present
      if (subscriptionId) {
        url += `&subscription_id=${subscriptionId}`;
      }

      const response = await authenticatedFetch(url);

      if (response.status === 401) {
        // JWT authentication failed
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FeedResponse = await response.json();

      // Update feeds array
      if (append) {
        feeds = [...feeds, ...data.data];
      } else {
        feeds = data.data;
      }

      // Update cursor and hasMore state
      feedNextCursor = data.next_cursor;
      feedHasMore = data.has_more;

      updateFeedStats();

      // Load subscriptions after initial feed load completes
      if (!append && !cursor) {
        await subscriptionsStore.fetch();
        subscriptionsLoadingStore.setLoading(false);
      }
    } catch (error) {
      console.error("Failed to fetch feeds:", error);
    } finally {
      isLoading = false;
    }
  }

  function loadMoreFeeds(): void {
    if (feedHasMore && !isLoading && feedNextCursor) {
      fetchFeeds(feedNextCursor, true, false);
    }
  }

  // Effect to set up infinite scroll observer
  $effect(() => {
    // Watch these reactive values
    const trigger = scrollTrigger;

    if (!trigger) {
      return;
    }

    // Create intersection observer for infinite scroll
    // Use callback that reads latest state values instead of capturing them
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        // Read current state values directly (not captured in closure)
        if (
          entry.isIntersecting &&
          feedHasMore &&
          !isLoading &&
          feedNextCursor
        ) {
          loadMoreFeeds();
        }
      },
      {
        root: null, // viewport
        rootMargin: "100px", // Trigger 100px before reaching the element
        threshold: 0,
      },
    );

    observer.observe(trigger);

    // Cleanup
    return () => {
      observer.disconnect();
    };
  });

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Less than 1 minute
    if (diffMins < 1) return "just now";

    // Less than 1 hour
    if (diffMins < 60)
      return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;

    // Less than 24 hours
    if (diffHours < 24)
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;

    // Less than 7 days
    if (diffDays < 7)
      return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;

    // More than 7 days - show formatted date
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function extractDomain(url: string): string {
    try {
      const urlObject = new URL(url);
      return urlObject.hostname;
    } catch {
      return url;
    }
  }

  // RSS descriptions can contain HTML — reduce them to plain text.
  function stripHtml(html: string): string {
    if (!html) return "";
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function reloadFeed(): Promise<void> {
    if (isReloadingFeed) return;

    isReloadingFeed = true;
    feeds = [];
    feedNextCursor = null;
    feedHasMore = true;

    try {
      await fetchFeeds(null, false, true);
    } finally {
      isReloadingFeed = false;
    }
  }

  async function addBookmark(url: string, feedId: string): Promise<void> {
    // Prevent duplicate submissions for the same feed
    if (bookmarkingFeedIds.has(feedId)) return;

    // Add feedId to the set to mark it as being bookmarked
    // Create a new Set to trigger Svelte 5 reactivity
    bookmarkingFeedIds = new Set(bookmarkingFeedIds).add(feedId);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/bookmarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        showNotification(`Failed to add bookmark: ${response.status}`, "error");
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      showNotification("Bookmark added successfully!", "success");
    } catch (error) {
      console.error("Failed to add bookmark:", error);
      showNotification("Failed to add bookmark", "error");
    } finally {
      // Remove feedId from the set to allow bookmarking again if needed
      // Create a new Set to trigger Svelte 5 reactivity
      const newSet = new Set(bookmarkingFeedIds);
      newSet.delete(feedId);
      bookmarkingFeedIds = newSet;
    }
  }

  async function markAsRead(feedId: string): Promise<boolean> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/markread`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feed_id: feedId }),
      });

      if (response.status === 401) {
        handleAuthError();
        return false;
      }

      if (!response.ok) {
        console.error(`Failed to mark as read: ${response.status}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to mark as read:", error);
      return false;
    }
  }

  // Bulk mark-read for the loaded stories (one request per unread story).
  async function markAllAsRead(): Promise<void> {
    const unreadFeeds = feeds.filter((feed) => !feed.is_read);
    if (unreadFeeds.length === 0 || isMarkingAllRead) return;

    isMarkingAllRead = true;

    try {
      const results = await Promise.allSettled(
        unreadFeeds.map((feed) => markAsRead(feed.id)),
      );

      const readIds = new Set<string>();
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          readIds.add(unreadFeeds[index].id);
        }
      });

      if (readIds.size > 0) {
        feeds = feeds.map((feed) =>
          readIds.has(feed.id) ? { ...feed, is_read: true } : feed,
        );
        updateFeedStats();
      }

      if (readIds.size === unreadFeeds.length) {
        showNotification("All stories marked as read.", "success");
      } else {
        showNotification(
          `Marked ${readIds.size} of ${unreadFeeds.length} stories as read.`,
          readIds.size > 0 ? "success" : "error",
        );
      }
    } finally {
      isMarkingAllRead = false;
    }
  }

  function showNotification(
    message: string,
    type: "success" | "error" = "success",
  ): void {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }

    notification = { message, type };

    notificationTimeout = setTimeout(() => {
      notification = null;
      notificationTimeout = null;
    }, 3000);
  }

  function getProxiedImageUrl(imageUrl: string): string {
    if (!imageUrl) return placeholderImage;
    // Proxy external images through our backend to avoid CORS issues
    return `${API_BASE_URL}/proxy/image?url=${encodeURIComponent(imageUrl)}`;
  }
</script>

<div class="min-h-full px-6 pt-[34px] pb-16 lg:px-10">
  <!-- Notification Toast -->
  {#if notification}
    <div
      class={`animate-slide-in fixed top-4 right-4 z-50 flex items-center gap-2 rounded-[7px] px-4 py-2 shadow-md ${
        notification.type === "success"
          ? "bg-[#315d43] text-white"
          : "bg-red-500 text-white"
      }`}
    >
      {#if notification.type === "success"}
        <Bookmark class="h-4 w-4" />
      {:else}
        <AlertCircle class="h-4 w-4" />
      {/if}
      <span class="text-sm">{notification.message}</span>
    </div>
  {/if}

  <div class="mx-auto w-full max-w-[1312px]">
    <!-- Page Header -->
    <div
      class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between"
    >
      <div>
        <p class="text-[10px] font-semibold tracking-[1.2px] text-[#63715f]">
          {collectionDate}
        </p>
        <h1
          class="mt-[13px] font-serif text-[34px] leading-[1.3] text-[#17362b]"
        >
          {activeSubscription
            ? activeSubscription.title
            : "Your daily collection"}
        </h1>
        <p class="mt-[10px] text-[13px] leading-[1.5] text-[#63715f]">
          {feeds.length}
          {feeds.length === 1 ? "article" : "articles"} · {unreadCount} unread ·
          Curated by you
        </p>
      </div>

      <div class="flex w-full flex-col lg:w-[472px] lg:shrink-0">
        <div class="relative">
          <img
            src={searchIcon}
            alt=""
            class="pointer-events-none absolute top-1/2 left-[15px] h-[18px] w-[18px] -translate-y-1/2"
          />
          <input
            type="search"
            bind:value={searchQuery}
            placeholder="Search your articles"
            aria-label="Search your articles"
            class="h-[46px] w-full rounded-[8px] border border-[#dce1d5] bg-[#f2f4ec] pr-4 pl-[46px] text-[13px] text-[#17362b] transition-colors placeholder:text-[#63715f] focus:border-[#315d43] focus:bg-white focus:outline-none"
          />
        </div>
        <div class="mt-[14px] flex justify-end">
          <button
            type="button"
            onclick={markAllAsRead}
            disabled={isMarkingAllRead || unreadCount === 0}
            class="text-[11px] font-medium text-[#315d43] transition-opacity hover:underline disabled:opacity-50 disabled:hover:no-underline"
            title="Mark all loaded stories as read"
          >
            {isMarkingAllRead ? "Marking..." : "Mark all as read"}
          </button>
        </div>
      </div>
    </div>

    <!-- Filters + sorting -->
    <div
      class="mt-[30px] flex flex-wrap items-center justify-between gap-x-4 gap-y-3"
    >
      <div class="flex items-center gap-2.5">
        <button
          type="button"
          onclick={() => (filterMode = "all")}
          aria-pressed={filterMode === "all"}
          class="flex h-[34px] items-center rounded-[17px] px-[22px] text-[11px] font-medium transition-colors {filterMode ===
          'all'
            ? 'bg-[#17362b] text-white'
            : 'bg-[#eef1e6] text-[#41553e] hover:bg-[#e2e7da]'}"
        >
          All {feeds.length}
        </button>
        <button
          type="button"
          onclick={() => (filterMode = "unread")}
          aria-pressed={filterMode === "unread"}
          class="flex h-[34px] items-center rounded-[17px] px-[22px] text-[11px] font-medium transition-colors {filterMode ===
          'unread'
            ? 'bg-[#17362b] text-white'
            : 'bg-[#eef1e6] text-[#41553e] hover:bg-[#e2e7da]'}"
        >
          Unread {unreadCount}
        </button>
      </div>
      <button
        type="button"
        onclick={() => (sortMode = sortMode === "newest" ? "oldest" : "newest")}
        class="text-[11px] text-[#63715f] transition-colors hover:text-[#315d43]"
        title="Toggle sort order"
      >
        {sortMode === "newest" ? "Newest first ↓" : "Oldest first ↑"}
      </button>
    </div>

    <!-- Helper row -->
    <div class="mt-[19px] flex items-center gap-[9px]">
      <img src={externalReadingCue} alt="" class="h-3.5 w-3.5 shrink-0" />
      <p class="text-[11px] leading-[1.5] text-[#63715f]">
        Select a story to read the full article in a new tab.
      </p>
    </div>

    <div class="mt-[21px]">
      {#if isLoading && feeds.length === 0}
        <!-- Initial Loading State - Skeleton Grid -->
        <div
          class="grid grid-cols-1 gap-x-6 gap-y-9 md:grid-cols-2 xl:grid-cols-3"
        >
          {#each Array(6) as _, i (i)}
            <div class="flex flex-col">
              <div
                class="animate-shimmer aspect-[408/230] rounded-[10px] bg-gradient-to-r from-[#eef1e6] via-[#f6f7f1] to-[#eef1e6] bg-[length:200%_100%]"
              ></div>
              <div class="mt-4 space-y-3">
                <div
                  class="animate-shimmer h-4 w-3/4 rounded bg-gradient-to-r from-[#dce6d3] via-[#e8ecdf] to-[#dce6d3] bg-[length:200%_100%]"
                ></div>
                <div
                  class="animate-shimmer h-3 w-1/2 rounded bg-gradient-to-r from-[#dce6d3] via-[#e8ecdf] to-[#dce6d3] bg-[length:200%_100%]"
                ></div>
                <div
                  class="animate-shimmer h-3 w-1/3 rounded bg-gradient-to-r from-[#dce6d3] via-[#e8ecdf] to-[#dce6d3] bg-[length:200%_100%]"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      {:else if feeds.length === 0}
        <!-- No Feeds State -->
        <div class="rounded-[14px] border border-[#dce1d5] p-8 text-center">
          <div
            class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#dce6d3]"
          >
            <RefreshCw class="h-5 w-5 text-[#315d43]" />
          </div>
          <p class="text-sm text-[#41553e]">No feeds yet</p>
          <p class="mt-1 text-xs text-[#63715f]">
            Check back later for updates!
          </p>
        </div>
      {:else if displayedFeeds.length === 0}
        <!-- No search results -->
        <p class="py-16 text-center text-sm text-[#63715f]">
          No stories match your search.
        </p>
      {:else}
        <!-- Story card grid -->
        <div
          class="grid grid-cols-1 gap-x-6 gap-y-9 md:grid-cols-2 xl:grid-cols-3"
        >
          {#each displayedFeeds as feed (feed.id)}
            <article class="flex flex-col">
              <!-- Main picture -->
              <a
                href={feed.link}
                target="_blank"
                rel="noopener noreferrer"
                onclick={() => markFeedRead(feed.id)}
                class="group relative block aspect-[408/230] overflow-hidden rounded-[10px]"
                aria-label="Open article in a new tab"
              >
                <img
                  src={getProxiedImageUrl(feed.main_image_url)}
                  alt={feed.title || "Feed image"}
                  class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onerror={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = placeholderImage;
                  }}
                />
                {#if feed.is_read}
                  <span
                    class="absolute right-3 bottom-3 rounded-[5px] bg-[#fcfbf7] px-[14px] py-[6px] text-[9px] font-medium text-[#54705a]"
                  >
                    Read
                  </span>
                {/if}
              </a>

              <!-- Source -->
              <div class="mt-4 flex items-center gap-[9px]">
                {#if !feed.is_read}
                  <img
                    src={unreadIndicator}
                    alt=""
                    class="h-[5px] w-[5px] shrink-0"
                  />
                {/if}
                <p
                  class="truncate text-[10px] font-semibold tracking-[0.6px] text-[#54705a] uppercase"
                >
                  {extractDomain(feed.link)}
                </p>
              </div>

              <!-- Headline + actions -->
              <div class="mt-[11px] flex items-start justify-between gap-3">
                <h3
                  class="line-clamp-2 min-w-0 flex-1 text-[18px] leading-[1.5] text-[#17362b] {feed.is_read
                    ? 'font-medium'
                    : 'font-semibold'}"
                >
                  <a
                    href={feed.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onclick={() => markFeedRead(feed.id)}
                    class="transition-colors hover:text-[#315d43]"
                  >
                    {feed.title || "Untitled Feed"}
                  </a>
                </h3>
                <div class="flex shrink-0 items-start pt-[5px] pr-0.5">
                  <button
                    type="button"
                    onclick={() => addBookmark(feed.link, feed.id)}
                    disabled={bookmarkingFeedIds.has(feed.id)}
                    class="rounded p-1 text-[#54705A] transition-colors hover:text-[#315d43] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Bookmark this feed"
                    title={bookmarkingFeedIds.has(feed.id)
                      ? "Saving..."
                      : "Bookmark"}
                  >
                    <Bookmark class="h-[17px] w-[17px]" strokeWidth={1.6} />
                  </button>
                  <a
                    href={feed.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onclick={() => markFeedRead(feed.id)}
                    class="rounded p-1"
                    aria-label="Open in new tab"
                  >
                    <img
                      src={openInNewTabIcon}
                      alt=""
                      class="h-[17px] w-[17px]"
                    />
                  </a>
                </div>
              </div>

              <!-- Preview -->
              <p
                class="mt-[10px] line-clamp-2 text-[12px] leading-[1.5] text-[#63715f]"
              >
                {stripHtml(feed.description)}
              </p>

              <!-- Metadata -->
              <p class="mt-[13px] text-[10px] leading-[1.5] text-[#63715f]">
                {formatDate(feed.published_at)}
              </p>
            </article>
          {/each}
        </div>
      {/if}

      <!-- Infinite Scroll Trigger -->
      {#if feedHasMore && feeds.length > 0 && feedNextCursor}
        <div bind:this={scrollTrigger} class="h-4 w-full"></div>
      {/if}

      <!-- Loading Indicator -->
      {#if isLoading && feeds.length > 0}
        <div class="mt-4 flex items-center justify-center py-8">
          <div class="flex flex-col items-center gap-3">
            <div class="flex gap-2">
              <div
                class="h-2 w-2 animate-bounce rounded-full bg-[#315d43] [animation-delay:-0.3s]"
              ></div>
              <div
                class="h-2 w-2 animate-bounce rounded-full bg-[#315d43] [animation-delay:-0.15s]"
              ></div>
              <div
                class="h-2 w-2 animate-bounce rounded-full bg-[#315d43]"
              ></div>
            </div>
            <span class="text-sm font-medium text-[#63715f]"
              >Loading more...</span
            >
          </div>
        </div>
      {/if}

      <!-- Feed footer -->
      {#if !feedHasMore && feeds.length > 0}
        <div class="mt-14">
          <div class="h-px bg-[#e0e5d8]"></div>
          <div
            class="mt-[18px] flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] leading-[1.5] text-[#63715f]"
          >
            <p>
              All {feeds.length}
              {feeds.length === 1 ? "story" : "stories"} from your subscriptions.
            </p>
            <div class="flex items-center gap-5">
              <p>
                {displayedFeeds.length} of {feeds.length}
                {feeds.length === 1 ? "story" : "stories"}
              </p>
              <button
                type="button"
                onclick={reloadFeed}
                disabled={isReloadingFeed}
                class="font-medium text-[#315d43] transition-opacity hover:underline disabled:opacity-50 disabled:hover:no-underline"
              >
                {isReloadingFeed ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  :global(.animate-slide-in) {
    animation: slide-in 0.3s ease-out;
  }

  :global(.animate-shimmer) {
    animation: shimmer 2s infinite linear;
  }
</style>
