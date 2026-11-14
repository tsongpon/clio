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
  import searchIcon from "$lib/assets/search-icon.svg";
  import externalReadingCue from "$lib/assets/external-reading-cue.svg";
  import StoryCard from "$lib/components/StoryCard.svelte";
  import BookmarkButton from "$lib/components/BookmarkButton.svelte";
  import { bookmarksStore } from "$lib/stores/bookmarks";
  import {
    buildSourceTitles,
    formatStoryDate,
    sourceLabel,
    stripHtml,
    urlKey,
  } from "$lib/utils/story";
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
  let notification = $state<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  let notificationTimeout: number | null = null;
  const bookmarksByUrl = bookmarksStore.byUrl;
  const pendingBookmarks = bookmarksStore.pending;

  // Feed view state (client-side search / sorting)
  let searchQuery = $state<string>("");
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

  const sourceTitles = $derived(buildSourceTitles($subscriptionsStore));

  function feedSource(feed: FeedItem): string {
    if (activeSubscription) return activeSubscription.title;
    return sourceLabel(feed.link, sourceTitles);
  }

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
        // Bookmarks drive each card's "Saved" state and the sidebar count.
        bookmarksStore.ensureLoaded();
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

  // Bookmark toggle: "Bookmark" saves the story, "Saved" removes it again.
  async function toggleBookmark(feed: FeedItem): Promise<void> {
    const existing = $bookmarksByUrl.get(urlKey(feed.link));
    if (existing) {
      const ok = await bookmarksStore.remove(existing);
      showNotification(
        ok ? "Removed from bookmarks." : "Couldn't remove the bookmark.",
        ok ? "success" : "error",
      );
    } else {
      const ok = await bookmarksStore.add(feed.link);
      showNotification(
        ok ? "Saved to bookmarks." : "Couldn't save the bookmark.",
        ok ? "success" : "error",
      );
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
          The latest stories from your subscriptions.
        </p>
      </div>

      <div class="flex w-full flex-col lg:mt-[25px] lg:w-[472px] lg:shrink-0">
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

    <!-- Section heading + sorting -->
    <div class="mt-[35px] flex items-center justify-between gap-4">
      <h2 class="text-[16px] leading-[1.5] font-medium text-[#17362b]">
        Latest stories
      </h2>
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
    <div class="mt-[21px] flex items-center gap-[9px]">
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
            <StoryCard
              href={feed.link}
              title={feed.title}
              imageUrl={feed.main_image_url}
              source={feedSource(feed)}
              description={stripHtml(feed.description)}
              meta={formatStoryDate(feed.published_at)}
              isRead={feed.is_read}
              onOpen={() => markFeedRead(feed.id)}
            >
              {#snippet action()}
                <BookmarkButton
                  variant={$bookmarksByUrl.has(urlKey(feed.link))
                    ? "saved"
                    : "save"}
                  busy={$pendingBookmarks.has(urlKey(feed.link))}
                  onclick={() => toggleBookmark(feed)}
                />
              {/snippet}
            </StoryCard>
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
