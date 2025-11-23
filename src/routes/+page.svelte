<script lang="ts">
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import { ExternalLink, RefreshCw } from "lucide-svelte";
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
    title: string;
    main_image_url: string;
    link: string;
    description: string;
    guid: string;
    published_at: string;
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

  function handleAuthError(): void {
    // Clear invalid token
    removeToken();
    // Redirect to login
    goto("/login");
  }

  function openFeedLink(url: string): void {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  onMount(() => {
    // Check if user has a token
    if (!isAuthenticated()) {
      goto("/login");
      return;
    }

    // Load initial data
    fetchFeeds(null, false, true);
  });

  async function fetchFeeds(
    cursor: string | null = null,
    append: boolean = false,
    retrievefeed: boolean = false,
  ): Promise<void> {
    if (isLoading) return;

    isLoading = true;
    try {
      // Build URL with cursor if provided
      const url = cursor
        ? `${API_BASE_URL}/feeds?next_cursor=${cursor}&page_size=${pageSize}&retrieve_feed=${retrievefeed}`
        : `${API_BASE_URL}/feeds?page_size=${pageSize}&retrieve_feed=${retrievefeed}`;

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
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
  <div class="mx-auto max-w-7xl">
    <!-- Page Header -->
    <div class="mb-6">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="text-4xl">🌐</div>
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Feed</h1>
              <p class="text-sm text-gray-600 mt-1">
                Latest updates from your RSS subscriptions
              </p>
            </div>
          </div>
          <Button
            onclick={reloadFeed}
            disabled={isReloadingFeed}
            class="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            aria-label="Reload feed"
          >
            <RefreshCw
              class={`w-4 h-4 mr-2 ${isReloadingFeed ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>
    </div>

    <div class="space-y-4">
      {#if feeds.length === 0}
        <div class="bg-white rounded-lg shadow p-8 text-center">
          <div
            class="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <RefreshCw class="w-6 h-6 text-slate-400" />
          </div>
          <p class="text-slate-600 font-medium text-sm">No feeds yet</p>
          <p class="text-slate-400 text-xs mt-1">
            Check back later for updates!
          </p>
        </div>
      {:else}
        <!-- Feed Card Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each feeds as feed (feed.guid)}
            <div
              class="bg-white rounded-lg shadow hover:shadow-lg transition-all overflow-hidden flex flex-col"
            >
              <!-- Main Image on Top -->
              <div
                class="w-full h-52 overflow-hidden cursor-pointer"
                onclick={() => openFeedLink(feed.link)}
                role="button"
                tabindex="0"
                onkeydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openFeedLink(feed.link);
                  }
                }}
              >
                <img
                  src={feed.main_image_url || placeholderImage}
                  alt={feed.title || "Feed image"}
                  class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  onerror={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = placeholderImage;
                  }}
                />
              </div>

              <!-- Date Below Image -->
              <div class="px-4 pt-3 pb-2">
                <span class="text-xs text-slate-500">
                  {formatDate(feed.published_at)}
                </span>
              </div>

              <!-- Card Content -->
              <div class="px-4 pb-4 flex-1 flex flex-col">
                <!-- Title -->
                <h3
                  class="text-lg font-semibold text-slate-900 mb-2 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                  onclick={() => openFeedLink(feed.link)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openFeedLink(feed.link);
                    }
                  }}
                >
                  {feed.title || "Untitled Feed"}
                </h3>

                <!-- Feed Source -->
                <p
                  class="text-xs text-blue-600 mb-3 truncate flex items-center gap-1"
                >
                  <ExternalLink class="w-3 h-3 flex-shrink-0" />
                  {extractDomain(feed.link)}
                </p>

                <!-- Description -->
                {#if feed.description}
                  <div class="text-sm text-slate-600 mb-4 line-clamp-4 flex-1">
                    {@html feed.description.substring(0, 300)}{feed.description
                      .length > 300
                      ? "..."
                      : ""}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Loading Indicator -->
      {#if isLoading}
        <div class="bg-white rounded-lg shadow p-6 mt-4">
          <div class="flex items-center justify-center gap-3">
            <div
              class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"
            ></div>
            <span class="text-sm text-slate-600">Loading more feeds...</span>
          </div>
        </div>
      {/if}

      <!-- Load More Button (shown when there's more content but not loading) -->
      {#if feedHasMore && !isLoading && feeds.length > 0 && feedNextCursor}
        <div class="bg-white rounded-lg shadow p-4 mt-4">
          <div class="flex justify-center">
            <Button
              onclick={() => loadMoreFeeds()}
              class="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              aria-label="Load more feeds"
            >
              Load More
            </Button>
          </div>
        </div>
      {/if}

      <!-- End of List Indicator -->
      {#if !feedHasMore && feeds.length > 0}
        <div class="bg-white rounded-lg shadow p-4 mt-4">
          <div class="flex flex-col items-center gap-3">
            <p class="text-center text-sm text-slate-500">
              You've reached the end of your feeds
            </p>
            <Button
              onclick={reloadFeed}
              disabled={isReloadingFeed}
              class="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Reload feed"
            >
              <RefreshCw
                class={`w-4 h-4 mr-2 ${isReloadingFeed ? "animate-spin" : ""}`}
              />
              {isReloadingFeed ? "Reloading..." : "Reload Feed"}
            </Button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
