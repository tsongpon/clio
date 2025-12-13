<script lang="ts">
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import {
    ExternalLink,
    RefreshCw,
    Bookmark,
    AlertCircle,
  } from "lucide-svelte";
  import {
    authenticatedFetch,
    isAuthenticated,
    removeToken,
  } from "$lib/utils/auth";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { API_BASE_URL } from "$lib/config";
  import placeholderImage from "$lib/assets/feed-placeholder.svg";

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

  // Get current subscription name for display
  const currentSubscriptionName = $derived.by(() => {
    const subscriptionId = $page.url.searchParams.get("subscription_id");
    if (!subscriptionId) return null;
    // We don't have access to subscriptions here, so we'll just show it's filtered
    return "Filtered Feed";
  });

  function handleAuthError(): void {
    // Clear invalid token
    removeToken();
    // Redirect to login
    goto("/login");
  }

  async function openFeedLink(feedId: string, url: string): Promise<void> {
    // Open the link first for immediate user feedback
    window.open(url, "_blank", "noopener,noreferrer");

    // Mark as read in the background
    const success = await markAsRead(feedId);

    if (success) {
      // Update the feed's is_read status in the UI
      feeds = feeds.map((feed) =>
        feed.id === feedId ? { ...feed, is_read: true } : feed,
      );
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

      console.log("fetchFeeds response:", {
        itemsCount: data.data.length,
        nextCursor: data.next_cursor,
        hasMore: data.has_more,
        append,
      });

      // Update feeds array
      if (append) {
        feeds = [...feeds, ...data.data];
      } else {
        feeds = data.data;
      }

      // Update cursor and hasMore state
      feedNextCursor = data.next_cursor;
      feedHasMore = data.has_more;

      // Check if page is scrollable after initial load
      if (!append) {
        setTimeout(() => {
          const isScrollable =
            document.documentElement.scrollHeight > window.innerHeight;
          console.log("Page scrollability check:", {
            scrollHeight: document.documentElement.scrollHeight,
            windowHeight: window.innerHeight,
            isScrollable,
            feedCount: feeds.length,
          });
        }, 100);
      }
    } catch (error) {
      console.error("Failed to fetch feeds:", error);
    } finally {
      isLoading = false;
    }
  }

  function loadMoreFeeds(): void {
    console.log("loadMoreFeeds called:", {
      feedHasMore,
      isLoading,
      feedNextCursor,
    });
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

    console.log("Setting up IntersectionObserver");

    // Create intersection observer for infinite scroll
    // Use callback that reads latest state values instead of capturing them
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        console.log("Intersection event:", {
          isIntersecting: entry.isIntersecting,
          feedHasMore,
          isLoading,
          feedNextCursor,
        });

        // Read current state values directly (not captured in closure)
        if (
          entry.isIntersecting &&
          feedHasMore &&
          !isLoading &&
          feedNextCursor
        ) {
          console.log("Triggering load more feeds");
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
      console.log("Cleaning up IntersectionObserver");
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

  async function addBookmark(url: string): Promise<void> {
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

<div class="min-h-screen bg-white p-4 lg:p-6">
  <!-- Notification Toast -->
  {#if notification}
    <div
      class={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-md z-50 flex items-center gap-2 animate-slide-in ${
        notification.type === "success"
          ? "bg-[#FF6600] text-white"
          : "bg-red-500 text-white"
      }`}
    >
      {#if notification.type === "success"}
        <Bookmark class="w-4 h-4" />
      {:else}
        <AlertCircle class="w-4 h-4" />
      {/if}
      <span class="text-sm">{notification.message}</span>
    </div>
  {/if}
  <div class="mx-auto max-w-7xl">
    <!-- Page Header -->
    <div class="mb-4">
      <h1 class="text-2xl font-semibold text-gray-900">
        {#if $page.url.searchParams.get("subscription_id")}
          Filtered Feed
        {:else}
          All Feed
        {/if}
      </h1>
    </div>

    <div class="space-y-4">
      {#if isLoading && feeds.length === 0}
        <!-- Initial Loading State - Skeleton Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each Array(6) as _, i}
            <div class="rounded-lg overflow-hidden bg-white shadow-sm">
              <!-- Skeleton Image -->
              <div
                class="w-full h-48 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%]"
              ></div>

              <!-- Skeleton Content -->
              <div class="p-3 space-y-3">
                <!-- Skeleton Title -->
                <div class="space-y-2">
                  <div
                    class="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%] rounded"
                  ></div>
                  <div
                    class="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%] rounded w-3/4"
                  ></div>
                </div>

                <!-- Skeleton Meta -->
                <div class="space-y-2">
                  <div
                    class="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%] rounded w-1/2"
                  ></div>
                  <div
                    class="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%] rounded w-1/3"
                  ></div>
                </div>

                <!-- Skeleton Button -->
                <div class="pt-2 border-t border-gray-100">
                  <div
                    class="h-7 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%] rounded w-24"
                  ></div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else if feeds.length === 0}
        <!-- No Feeds State -->
        <div class="border border-[#FFD4B3] rounded-lg p-8 text-center">
          <div
            class="bg-[#FFE6D5] w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
          >
            <RefreshCw class="w-5 h-5 text-[#FF6600]" />
          </div>
          <p class="text-gray-600 text-sm">No feeds yet</p>
          <p class="text-gray-400 text-xs mt-1">
            Check back later for updates!
          </p>
        </div>
      {:else}
        <!-- Feed Card Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each feeds as feed (feed.id)}
            <div
              class="rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col bg-white"
              style={feed.is_read ? "opacity: 0.6;" : ""}
            >
              <!-- Main Image on Top -->
              <div
                class="w-full h-48 overflow-hidden cursor-pointer relative"
                onclick={() => openFeedLink(feed.id, feed.link)}
                role="button"
                tabindex="0"
                onkeydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openFeedLink(feed.id, feed.link);
                  }
                }}
              >
                <img
                  src={getProxiedImageUrl(feed.main_image_url)}
                  alt={feed.title || "Feed image"}
                  class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  onerror={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = placeholderImage;
                  }}
                />
                {#if feed.is_read}
                  <div
                    class="absolute top-2 right-2 bg-[#FF6600] text-white text-xs font-medium px-2 py-1 rounded"
                  >
                    READ
                  </div>
                {/if}
              </div>

              <!-- Card Content -->
              <div class="p-3 flex-1 flex flex-col">
                <!-- Title -->
                <h3
                  class="text-base font-medium text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:text-gray-600 transition-colors"
                  onclick={() => openFeedLink(feed.id, feed.link)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openFeedLink(feed.id, feed.link);
                    }
                  }}
                >
                  {feed.title || "Untitled Feed"}
                </h3>

                <!-- Date and Source -->
                <div class="text-xs text-gray-500 mb-2 space-y-1">
                  <p class="flex items-center gap-1">
                    <ExternalLink class="w-3 h-3 flex-shrink-0" />
                    {extractDomain(feed.link)}
                  </p>
                  <p>{formatDate(feed.published_at)}</p>
                </div>

                <!-- Actions -->
                <div
                  class="pt-2 mt-auto border-t border-orange-50 flex justify-end"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={(e) => {
                      e.stopPropagation();
                      addBookmark(feed.link);
                    }}
                    class="text-gray-600 hover:text-[#FF6600] hover:bg-[#FFE6D5] h-7 px-2 text-xs"
                    aria-label="Bookmark this feed"
                  >
                    <Bookmark class="w-3 h-3 mr-1" />
                    Bookmark
                  </Button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Infinite Scroll Trigger -->
      {#if feedHasMore && feeds.length > 0 && feedNextCursor}
        <div bind:this={scrollTrigger} class="w-full h-4"></div>
      {/if}

      <!-- Loading Indicator -->
      {#if isLoading && feeds.length > 0}
        <div class="flex items-center justify-center py-8 mt-4">
          <div class="flex flex-col items-center gap-3">
            <!-- Modern spinner with pulsing dots -->
            <div class="flex gap-2">
              <div
                class="w-2 h-2 rounded-full bg-[#FF6600] animate-bounce [animation-delay:-0.3s]"
              ></div>
              <div
                class="w-2 h-2 rounded-full bg-[#FF6600] animate-bounce [animation-delay:-0.15s]"
              ></div>
              <div
                class="w-2 h-2 rounded-full bg-[#FF6600] animate-bounce"
              ></div>
            </div>
            <span class="text-sm text-gray-500 font-medium"
              >Loading more...</span
            >
          </div>
        </div>
      {/if}

      <!-- End of List Indicator -->
      {#if !feedHasMore && feeds.length > 0}
        <div class="border border-[#FFD4B3] rounded-lg p-4 mt-4">
          <div class="flex flex-col items-center gap-2">
            <p class="text-center text-sm text-gray-500">
              You've reached the end of your feeds
            </p>
            <Button
              onclick={reloadFeed}
              disabled={isReloadingFeed}
              class="h-8 px-3 bg-[#FF6600] hover:bg-[#FF8533] text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Reload feed"
            >
              <RefreshCw
                class={`w-4 h-4 mr-1.5 ${isReloadingFeed ? "animate-spin" : ""}`}
              />
              {isReloadingFeed ? "Reloading..." : "Reload Feed"}
            </Button>
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
