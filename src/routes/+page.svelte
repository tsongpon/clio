<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Card } from "$lib/components/ui/card";
  import {
    Archive,
    ExternalLink,
    Bookmark,
    User,
    LogOut,
    Eye,
    Trash2,
    RefreshCw,
    Check,
    X,
  } from "lucide-svelte";
  import {
    authenticatedFetch,
    isAuthenticated,
    removeToken,
    getUser,
  } from "$lib/utils/auth";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { API_BASE_URL } from "$lib/config";
  import placeholderImage from "$lib/assets/placeholder.svg";

  interface BookmarkItem {
    id: string;
    url: string;
    title: string;
    user_id: string;
    created_at: string;
    is_archived: boolean;
    main_image_url?: string;
    content_summary?: string;
  }

  interface PaginatedResponse {
    bookmarks: BookmarkItem[];
    next_cursor: string | null;
    has_more: boolean;
  }

  interface FeedItem {
    title: string;
    main_image_url: string;
    link: string;
    description: string;
    guid: string;
    published_at: string;
  }

  interface FeedResponse {
    feeds: FeedItem[];
    next_cursor: string | null;
    has_more: boolean;
  }

  let url = $state<string>("");
  let feedUrl = $state<string>("");
  let bookmarks = $state<BookmarkItem[]>([]);
  let showDropdown = $state<boolean>(false);
  let user = $state<any>(null);
  let bookmarkNextCursor = $state<string | null>(null);
  let hasMore = $state<boolean>(true);
  let isLoading = $state<boolean>(false);
  let activeTab = $state<"toread" | "archive" | "feed">("feed");
  let isAddingBookmark = $state<boolean>(false);
  let isAddingFeed = $state<boolean>(false);
  let feeds = $state<FeedItem[]>([]);
  let feedNextCursor = $state<string | null>(null);
  let feedHasMore = $state<boolean>(true);
  let pageSize = $state<number>(24);
  let isReloadingFeed = $state<boolean>(false);
  let bookmarkNotification = $state<string | null>(null);
  let notificationTimeout: number | null = null;

  function handleAuthError(): void {
    // Clear invalid token
    removeToken();
    // Redirect to login
    goto("/login");
  }

  function handleLogout(): void {
    removeToken();
    goto("/login");
  }

  function toggleDropdown(): void {
    showDropdown = !showDropdown;
  }

  function closeDropdown(): void {
    showDropdown = false;
  }

  function openBookmark(url: string): void {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest(".user-dropdown")) {
      closeDropdown();
    }
  }

  onMount(() => {
    // Check if user has a token
    if (!isAuthenticated()) {
      goto("/login");
      return;
    }

    // Get user info
    user = getUser();

    // retrievefeed();
    fetchFeeds(null, false, true);

    // Add click outside listener
    document.addEventListener("click", handleClickOutside);

    // Add scroll listener for infinite scroll
    window.addEventListener("scroll", handleScroll);

    // Cleanup
    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
    };
  });

  async function fetchBookmarks(
    cursor: string | null = null,
    append: boolean = false,
  ): Promise<void> {
    if (isLoading) return;

    isLoading = true;
    const isArchived = activeTab === "archive";
    try {
      // Build URL with cursor if provided
      const url = cursor
        ? `${API_BASE_URL}/bookmarks?archived=${isArchived}&cursor=${cursor}`
        : `${API_BASE_URL}/bookmarks?archived=${isArchived}`;

      const response = await authenticatedFetch(url);

      if (response.status === 401) {
        // JWT authentication failed
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PaginatedResponse = await response.json();

      if (append) {
        bookmarks = [...bookmarks, ...data.bookmarks];
      } else {
        bookmarks = data.bookmarks;
      }

      // Update cursor and hasMore state
      bookmarkNextCursor = data.next_cursor;
      hasMore = data.has_more;
    } catch (error) {
      console.error("Failed to fetch bookmarks:", error);
      // You might want to show an error message to the user here
    } finally {
      isLoading = false;
    }
  }

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
        ? `${API_BASE_URL}/feeds?cursor=${cursor}&page_size=${pageSize}&retrieve_feed=${retrievefeed}`
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

      // Update feeds array
      if (append) {
        feeds = [...feeds, ...data.feeds];
      } else {
        feeds = data.feeds;
      }

      // Update cursor and hasMore state
      feedNextCursor = data.next_cursor;
      feedHasMore = data.has_more;
    } catch (error) {
      console.error("Failed to fetch feeds:", error);
      // You might want to show an error message to the user here
    } finally {
      isLoading = false;
    }
  }

  function loadMoreBookmarks(): void {
    if (hasMore && !isLoading && bookmarkNextCursor) {
      fetchBookmarks(bookmarkNextCursor, true);
    }
  }

  function loadMoreFeeds(): void {
    if (feedHasMore && !isLoading && feedNextCursor) {
      fetchFeeds(feedNextCursor, true, false);
    }
  }

  function handleScroll(): void {
    const scrollableHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;

    // Load more when user scrolls to bottom (with 100px threshold)
    if (scrollableHeight - scrolled < 100) {
      if (activeTab === "feed") {
        loadMoreFeeds();
      } else {
        loadMoreBookmarks();
      }
    }
  }

  async function addBookmark(): Promise<void> {
    if (!url.trim() || isAddingBookmark) return;

    // Basic URL validation
    let formattedUrl: string = url.trim();
    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = "https://" + formattedUrl;
    }

    const newBookmark: BookmarkItem = {
      url: formattedUrl,
    };

    isAddingBookmark = true;

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/bookmarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newBookmark),
      });

      if (response.status === 401) {
        // JWT authentication failed
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // bookmarks = [newBookmark, ...bookmarks];
      url = "";
      fetchBookmarks();
    } catch (error) {
      console.error("Failed to add bookmark:", error);
      // You might want to show an error message to the user here
    } finally {
      isAddingBookmark = false;
    }
  }

  async function addFeedUrl(): Promise<void> {
    if (!feedUrl.trim() || isAddingFeed) return;

    // Basic URL validation
    let formattedUrl: string = feedUrl.trim();
    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = "https://" + formattedUrl;
    }

    isAddingFeed = true;

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/addfeedurl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feed_url: formattedUrl }),
      });

      if (response.status === 401) {
        // JWT authentication failed
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      feedUrl = "";
      // Refresh feeds after adding new feed URL
      feeds = [];
      feedNextCursor = null;
      feedHasMore = true;
      fetchFeeds(null, false, true);
    } catch (error) {
      console.error("Failed to add feed URL:", error);
      // You might want to show an error message to the user here
    } finally {
      isAddingFeed = false;
    }
  }

  async function archiveBookmark(id: string): Promise<void> {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/bookmarks/${id}/archive`,
        {
          method: "POST",
        },
      );

      if (response.status === 401) {
        // JWT authentication failed
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Show success notification
      showNotification("Bookmark archived successfully!");
    } catch (error) {
      console.error("Failed to archive bookmark:", error);
      showNotification("Failed to archive bookmark");
    }
    fetchBookmarks();
  }

  async function unarchiveBookmark(id: string): Promise<void> {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/bookmarks/${id}/unarchive`,
        {
          method: "POST",
        },
      );

      if (response.status === 401) {
        // JWT authentication failed
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to unarchive bookmark:", error);
      // You might want to show an error message to the user here
    }
    fetchBookmarks();
  }

  async function deleteBookmark(id: string): Promise<void> {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/bookmarks/${id}`,
        {
          method: "DELETE",
        },
      );

      if (response.status === 401) {
        // JWT authentication failed
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
      // You might want to show an error message to the user here
    }
    fetchBookmarks();
  }

  function switchTab(tab: "toread" | "archive" | "feed"): void {
    activeTab = tab;
    if (tab === "feed") {
      feeds = [];
      feedNextCursor = null;
      feedHasMore = true;
      fetchFeeds(null, false, false);
    } else {
      bookmarks = [];
      bookmarkNextCursor = null;
      hasMore = true;
      fetchBookmarks();
    }
  }

  function handleKeyPress(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      addBookmark();
    }
  }

  function isValidUrl(string: string): boolean {
    try {
      const urlPattern =
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
      return urlPattern.test(string.trim());
    } catch {
      return false;
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

  async function removeFeed(feedGuid: string): Promise<void> {
    try {
      // Mock API endpoint - replace with actual endpoint when ready
      const response = await authenticatedFetch(
        `${API_BASE_URL}/feeds/${feedGuid}/remove`,
        {
          method: "POST",
        },
      );

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Remove the feed from the local array
      feeds = feeds.filter((f) => f.guid !== feedGuid);
    } catch (error) {
      console.error("Failed to remove feed:", error);
      // For now, still remove it locally even if API fails (mock behavior)
      feeds = feeds.filter((f) => f.guid !== feedGuid);
    }
  }

  async function bookmarkFeed(feed: FeedItem): Promise<void> {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/bookmarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: feed.link,
        }),
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Show success notification
      showNotification("Feed saved to bookmarks!");
    } catch (error) {
      console.error("Failed to bookmark feed:", error);
      showNotification("Failed to save bookmark");
    }
  }

  function showNotification(message: string): void {
    // Clear existing timeout if any
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }

    bookmarkNotification = message;

    // Auto-hide after 3 seconds
    notificationTimeout = setTimeout(() => {
      bookmarkNotification = null;
      notificationTimeout = null;
    }, 3000);
  }
</script>

<div
  class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 md:p-4"
>
  <!-- Notification Toast -->
  {#if bookmarkNotification}
    <div
      class="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-slide-in"
    >
      <Bookmark class="w-5 h-5" />
      <span class="font-medium">{bookmarkNotification}</span>
    </div>
  {/if}

  <div class="mx-auto max-w-7xl">
    <div class="mb-4 bg-white rounded-lg shadow p-4">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <div class="bg-blue-600 p-2 rounded-lg">
            <Bookmark class="w-5 h-5 text-white" />
          </div>
          <h1
            class="text-balance text-2xl font-bold tracking-tight text-slate-900"
          >
            Bookmark Manager
          </h1>
        </div>

        <!-- User Profile Dropdown -->
        <div class="relative user-dropdown">
          <button
            onclick={toggleDropdown}
            class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="User menu"
          >
            <div class="bg-blue-600 p-2 rounded-full">
              <User class="w-4 h-4 text-white" />
            </div>
            {#if user?.name}
              <span class="text-sm font-medium text-slate-700 hidden sm:block">
                {user.name}
              </span>
            {/if}
          </button>

          {#if showDropdown}
            <div
              class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10"
            >
              {#if user?.email}
                <div class="px-4 py-2 border-b border-slate-200">
                  <p class="text-xs text-slate-500">Signed in as</p>
                  <p class="text-sm font-medium text-slate-900 truncate">
                    {user.email}
                  </p>
                </div>
              {/if}

              <button
                onclick={handleLogout}
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <LogOut class="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          {/if}
        </div>
      </div>
      <p class="text-slate-600 text-sm ml-[44px]">
        Save and organize your favorite websites
      </p>
    </div>

    <div class="space-y-2">
      <!-- Tabs -->
      <div class="bg-white rounded-lg shadow p-1 mb-4">
        <div class="flex gap-1">
          <button
            onclick={() => switchTab("feed")}
            class={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === "feed"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Feed
          </button>
          <button
            onclick={() => switchTab("toread")}
            class={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === "toread"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            To Read
          </button>
          <button
            onclick={() => switchTab("archive")}
            class={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === "archive"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Archive
          </button>
        </div>
      </div>

      <!-- Add Feed URL Box - Only show on Feed tab -->
      {#if activeTab === "feed"}
        <div class="bg-white rounded-lg shadow p-4 mb-4">
          <div class="flex gap-2">
            <Input
              id="feed-url-input"
              type="text"
              placeholder="Enter RSS feed URL"
              bind:value={feedUrl}
              onkeypress={(e) => {
                if (e.key === "Enter") {
                  addFeedUrl();
                }
              }}
              class="flex-1 h-10 rounded-lg"
              disabled={isAddingFeed}
            />
            <Button
              onclick={addFeedUrl}
              disabled={isAddingFeed}
              class="h-10 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if isAddingFeed}
                <div class="flex items-center gap-2">
                  <div
                    class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"
                  ></div>
                  <span>Adding...</span>
                </div>
              {:else}
                Subscribe
              {/if}
            </Button>
          </div>
        </div>
      {/if}

      <!-- Add Bookmark Box - Only show on To Read tab -->
      {#if activeTab === "toread"}
        <div class="bg-white rounded-lg shadow p-4 mb-4">
          <div class="flex gap-2">
            <Input
              id="bookmark-input"
              type="text"
              placeholder="Enter website URL"
              bind:value={url}
              onkeypress={handleKeyPress}
              class="flex-1 h-10 rounded-lg"
              disabled={isAddingBookmark}
            />
            <Button
              onclick={addBookmark}
              disabled={isAddingBookmark}
              class="h-10 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if isAddingBookmark}
                <div class="flex items-center gap-2">
                  <div
                    class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"
                  ></div>
                  <span>Adding...</span>
                </div>
              {:else}
                Add
              {/if}
            </Button>
          </div>
        </div>
      {/if}

      <div class="flex items-center justify-between mb-2">
        {#if activeTab === "feed"}
          <Button
            onclick={reloadFeed}
            disabled={isReloadingFeed}
            class="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Reload feed"
          >
            <RefreshCw
              class={`w-4 h-4 mr-2 ${isReloadingFeed ? "animate-spin" : ""}`}
            />
            Feed
          </Button>
        {:else}
          <h2 class="text-lg font-semibold text-slate-900">
            {activeTab === "toread" ? "To Read" : "Archived Bookmarks"}
          </h2>
        {/if}
      </div>

      {#if activeTab === "feed"}
        <!-- Feed Tab Content -->
        {#if feeds.length === 0}
          <div class="bg-white rounded-lg shadow p-8 text-center">
            <div
              class="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            >
              <Bookmark class="w-6 h-6 text-slate-400" />
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
                  class="w-full h-48 overflow-hidden cursor-pointer"
                  onclick={() => openBookmark(feed.link)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openBookmark(feed.link);
                    }
                  }}
                >
                  <img
                    src={feed.main_image_url || placeholderImage}
                    alt={feed.title || "Feed image"}
                    class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    onerror={(e) => {
                      e.currentTarget.src = placeholderImage;
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
                    onclick={() => openBookmark(feed.link)}
                    role="button"
                    tabindex="0"
                    onkeydown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openBookmark(feed.link);
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
                    <div
                      class="text-sm text-slate-600 mb-4 line-clamp-3 flex-1"
                    >
                      {@html feed.description.substring(0, 200)}{feed
                        .description.length > 200
                        ? "..."
                        : ""}
                    </div>
                  {/if}

                  <!-- Action Buttons -->
                  <div
                    class="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={(e) => {
                        e.stopPropagation();
                        bookmarkFeed(feed);
                      }}
                      class="w-full h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all"
                      aria-label="Bookmark this feed"
                    >
                      <Bookmark class="w-4 h-4 mr-1" />
                      Bookmark
                    </Button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {:else if bookmarks.length === 0}
        <div class="bg-white rounded-lg shadow p-8 text-center">
          <div
            class="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <Bookmark class="w-6 h-6 text-slate-400" />
          </div>
          <p class="text-slate-600 font-medium text-sm">No bookmarks yet</p>
          <p class="text-slate-400 text-xs mt-1">
            Add your first bookmark above!
          </p>
        </div>
      {:else}
        <!-- 3-Column Card Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each bookmarks as bookmark (bookmark.id)}
            <div
              class="bg-white rounded-lg shadow hover:shadow-lg transition-all overflow-hidden flex flex-col"
            >
              <!-- Main Image on Top -->
              <div
                class="w-full h-48 overflow-hidden cursor-pointer"
                onclick={() => openBookmark(bookmark.url)}
                role="button"
                tabindex="0"
                onkeydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openBookmark(bookmark.url);
                  }
                }}
              >
                <img
                  src={bookmark.main_image_url || placeholderImage}
                  alt={bookmark.title || "Bookmark image"}
                  class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  onerror={(e) => {
                    e.currentTarget.src = placeholderImage;
                  }}
                />
              </div>

              <!-- Date Below Image -->
              <div class="px-4 pt-3 pb-2">
                <span class="text-xs text-slate-500">
                  {formatDate(bookmark.created_at)}
                </span>
              </div>

              <!-- Card Content -->
              <div class="px-4 pb-4 flex-1 flex flex-col">
                <!-- Title -->
                <h3
                  class="text-lg font-semibold text-slate-900 mb-2 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                  onclick={() => openBookmark(bookmark.url)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openBookmark(bookmark.url);
                    }
                  }}
                >
                  {bookmark.title || "Untitled Bookmark"}
                </h3>

                <!-- Domain -->
                <p
                  class="text-xs text-blue-600 mb-3 truncate flex items-center gap-1"
                >
                  <ExternalLink class="w-3 h-3 flex-shrink-0" />
                  {extractDomain(bookmark.url)}
                </p>

                <!-- Content Summary -->
                {#if bookmark.content_summary}
                  <p class="text-sm text-slate-600 mb-4 line-clamp-3 flex-1">
                    {bookmark.content_summary.substring(0, 200)}{bookmark
                      .content_summary.length > 200
                      ? "..."
                      : ""}
                  </p>
                {/if}

                <!-- Action Buttons at Bottom -->
                <div
                  class="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100"
                >
                  {#if activeTab === "toread"}
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={(e) => {
                        e.stopPropagation();
                        archiveBookmark(bookmark.id);
                      }}
                      class="flex-1 h-9 text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-all"
                      aria-label="Archive bookmark"
                    >
                      <Archive class="w-4 h-4 mr-1" />
                      Archive
                    </Button>
                  {/if}
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={(e) => {
                      e.stopPropagation();
                      deleteBookmark(bookmark.id);
                    }}
                    class="flex-1 h-9 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all"
                    aria-label="Delete bookmark"
                  >
                    <Trash2 class="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
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
            <span class="text-sm text-slate-600">
              {activeTab === "feed"
                ? "Loading more feeds..."
                : "Loading more bookmarks..."}
            </span>
          </div>
        </div>
      {/if}

      <!-- End of List Indicator -->
      {#if activeTab === "feed" && !feedHasMore && feeds.length > 0}
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
      {:else if activeTab !== "feed" && !hasMore && bookmarks.length > 0}
        <div class="bg-white rounded-lg shadow p-4 mt-4">
          <p class="text-center text-sm text-slate-500">
            You've reached the end of your bookmarks
          </p>
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

  :global(.animate-slide-in) {
    animation: slide-in 0.3s ease-out;
  }
</style>
