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

  interface BookmarkItem {
    id: string;
    url: string;
    title: string;
    user_id: string;
    created_at: string;
    is_archived: boolean;
  }

  interface PaginatedResponse {
    bookmarks: BookmarkItem[];
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
  }

  let url = $state<string>("");
  let bookmarks = $state<BookmarkItem[]>([]);
  let showDropdown = $state<boolean>(false);
  let user = $state<any>(null);
  let currentPage = $state<number>(1);
  let totalPages = $state<number>(1);
  let totalCount = $state<number>(0);
  let pageSize = $state<number>(15);
  let isLoading = $state<boolean>(false);
  let hasMore = $state<boolean>(true);

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

    fetchBookmarks();

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
    page: number = 1,
    append: boolean = false,
  ): Promise<void> {
    if (isLoading) return;

    isLoading = true;
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/bookmarks?archived=false&page=${page}&page_size=${pageSize}`,
      );

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

      currentPage = data.page;
      totalPages = data.total_pages;
      totalCount = data.total_count;
      hasMore = currentPage < totalPages;
    } catch (error) {
      console.error("Failed to fetch bookmarks:", error);
      // You might want to show an error message to the user here
    } finally {
      isLoading = false;
    }
  }

  function loadMoreBookmarks(): void {
    if (hasMore && !isLoading) {
      fetchBookmarks(currentPage + 1, true);
    }
  }

  function handleScroll(): void {
    const scrollableHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;

    // Load more when user scrolls to bottom (with 100px threshold)
    if (scrollableHeight - scrolled < 100) {
      loadMoreBookmarks();
    }
  }

  async function addBookmark(): Promise<void> {
    if (!url.trim()) return;

    // Basic URL validation
    let formattedUrl: string = url.trim();
    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = "https://" + formattedUrl;
    }

    const newBookmark: BookmarkItem = {
      user_id: "songpon",
      url: formattedUrl,
    };

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
    } catch (error) {
      console.error("Failed to archive bookmark:", error);
      // You might want to show an error message to the user here
    }
    fetchBookmarks();
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

  async function handleFocus(): Promise<void> {
    // Only auto-paste if the input is empty
    if (url.trim()) return;

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && isValidUrl(clipboardText)) {
        url = clipboardText.trim();
      }
    } catch (error) {
      // Clipboard access might be denied or not available
      // Silently fail - this is a nice-to-have feature
      console.log("Clipboard access not available:", error);
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
</script>

<div
  class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 md:p-4"
>
  <div class="mx-auto max-w-4xl">
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

    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <label
        for="bookmark-input"
        class="block text-sm font-medium text-slate-700 mb-2"
        >Add New Bookmark</label
      >
      <div class="flex gap-2">
        <Input
          id="bookmark-input"
          type="text"
          placeholder="Enter website URL (e.g., example.com)"
          bind:value={url}
          onkeypress={handleKeyPress}
          onfocus={handleFocus}
          class="flex-1 h-10 rounded-lg"
        />
        <Button
          onclick={addBookmark}
          class="h-10 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
        >
          Add
        </Button>
      </div>
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-lg font-semibold text-slate-900">Saved Bookmarks</h2>
        <span
          class="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium"
        >
          {totalCount}
        </span>
      </div>

      {#if bookmarks.length === 0}
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
        {#each bookmarks as bookmark (bookmark.id)}
          <div
            class="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
          >
            <div class="p-3 flex items-center justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <ExternalLink
                    class="w-3.5 h-3.5 flex-shrink-0 text-slate-400"
                  />
                  <span class="text-base font-semibold text-slate-900 truncate">
                    {bookmark.title || "Untitled Bookmark"}
                  </span>
                </div>
                <p class="text-xs text-blue-600 truncate ml-5">
                  {bookmark.url}
                </p>
                <div class="flex items-center gap-2 mt-1 ml-5">
                  <span
                    class="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded"
                  >
                    {formatDate(bookmark.created_at)}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onclick={() => openBookmark(bookmark.url)}
                  class="flex-shrink-0 h-8 w-8 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all"
                  aria-label="Open bookmark"
                >
                  <Eye class="w-3.5 h-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onclick={() => archiveBookmark(bookmark.id)}
                  class="flex-shrink-0 h-8 w-8 rounded-full text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-all"
                  aria-label="Archive bookmark"
                >
                  <Archive class="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        {/each}
      {/if}

      <!-- Loading Indicator -->
      {#if isLoading}
        <div class="bg-white rounded-lg shadow p-6 mt-4">
          <div class="flex items-center justify-center gap-3">
            <div
              class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"
            ></div>
            <span class="text-sm text-slate-600">Loading more bookmarks...</span
            >
          </div>
        </div>
      {/if}

      <!-- End of List Indicator -->
      {#if !hasMore && bookmarks.length > 0}
        <div class="bg-white rounded-lg shadow p-4 mt-4">
          <p class="text-center text-sm text-slate-500">
            You've reached the end of your bookmarks
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>
