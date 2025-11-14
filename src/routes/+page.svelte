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
  let pageSize = $state<number>(12);
  let isLoading = $state<boolean>(false);
  let hasMore = $state<boolean>(true);
  let activeTab = $state<"toread" | "archive">("toread");
  let isAddingBookmark = $state<boolean>(false);

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
    const isArchived = activeTab === "archive";
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/bookmarks?archived=${isArchived}&page=${page}&page_size=${pageSize}`,
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
      user_id: "songpon",
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

  function switchTab(tab: "toread" | "archive"): void {
    activeTab = tab;
    currentPage = 1;
    bookmarks = [];
    hasMore = true;
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
</script>

<div
  class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 md:p-4"
>
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

    <div class="space-y-2">
      <!-- Tabs -->
      <div class="bg-white rounded-lg shadow p-1 mb-4">
        <div class="flex gap-1">
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

      <div class="flex items-center justify-between mb-2">
        <h2 class="text-lg font-semibold text-slate-900">
          {activeTab === "toread" ? "To Read" : "Archived Bookmarks"}
        </h2>
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
        <!-- 3-Column Card Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  {:else}
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={(e) => {
                        e.stopPropagation();
                        unarchiveBookmark(bookmark.id);
                      }}
                      class="flex-1 h-9 text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-all"
                      aria-label="Unarchive bookmark"
                    >
                      <Archive class="w-4 h-4 mr-1" />
                      Unarchive
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
