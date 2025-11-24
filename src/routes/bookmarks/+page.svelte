<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { ExternalLink, Bookmark, Loader2, Plus, AlertCircle, Trash2 } from "lucide-svelte";
  import {
    authenticatedFetch,
    isAuthenticated,
    removeToken,
  } from "$lib/utils/auth";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { API_BASE_URL } from "$lib/config";
  import placeholderImage from "$lib/assets/feed-placeholder.svg";

  interface BookmarkItem {
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

  let bookmarks = $state<BookmarkItem[]>([]);
  let nextCursor = $state<string | null>(null);
  let hasMore = $state<boolean>(true);
  let isLoading = $state<boolean>(false);
  let pageSize = $state<number>(30);
  let newBookmarkUrl = $state<string>("");
  let isAddingBookmark = $state<boolean>(false);
  let notification = $state<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  let notificationTimeout: number | null = null;

  function handleAuthError(): void {
    removeToken();
    goto("/login");
  }

  function openLink(url: string): void {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  onMount(() => {
    if (!isAuthenticated()) {
      goto("/login");
      return;
    }

    fetchBookmarks();
  });

  async function fetchBookmarks(
    cursor: string | null = null,
    append: boolean = false
  ): Promise<void> {
    if (isLoading) return;

    isLoading = true;
    try {
      const url = cursor
        ? `${API_BASE_URL}/bookmarks?next_cursor=${cursor}&page_size=${pageSize}`
        : `${API_BASE_URL}/bookmarks?page_size=${pageSize}`;

      const response = await authenticatedFetch(url);

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BookmarkResponse = await response.json();

      if (append) {
        bookmarks = [...bookmarks, ...data.data];
      } else {
        bookmarks = data.data;
      }

      nextCursor = data.next_cursor;
      hasMore = data.has_more;
    } catch (error) {
      console.error("Failed to fetch bookmarks:", error);
    } finally {
      isLoading = false;
    }
  }

  function loadMore(): void {
    if (hasMore && !isLoading && nextCursor) {
      fetchBookmarks(nextCursor, true);
    }
  }

  async function addBookmark(): Promise<void> {
    if (!newBookmarkUrl.trim() || isAddingBookmark) return;

    let formattedUrl = newBookmarkUrl.trim();
    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = "https://" + formattedUrl;
    }

    isAddingBookmark = true;

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/bookmarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: formattedUrl }),
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        showNotification(
          `Failed to add bookmark: ${response.status}`,
          "error"
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      newBookmarkUrl = "";
      showNotification("Bookmark added successfully!", "success");
      
      // Refresh the list to show the new bookmark
      // Reset pagination state
      bookmarks = [];
      nextCursor = null;
      hasMore = true;
      await fetchBookmarks();
      
    } catch (error) {
      console.error("Failed to add bookmark:", error);
      showNotification("Failed to add bookmark", "error");
    } finally {
      isAddingBookmark = false;
    }
  }

  async function deleteBookmark(id: string): Promise<void> {
    if (!confirm("Are you sure you want to delete this bookmark?")) return;

    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/bookmarks/${id}`,
        {
          method: "DELETE",
        }
      );

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        showNotification(
          `Failed to delete bookmark: ${response.status}`,
          "error"
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      bookmarks = bookmarks.filter((b) => b.id !== id);
      showNotification("Bookmark deleted successfully!", "success");
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
      showNotification("Failed to delete bookmark", "error");
    }
  }

  function showNotification(
    message: string,
    type: "success" | "error" = "success"
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

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
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

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
  <!-- Notification Toast -->
  {#if notification}
    <div
      class={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-slide-in ${
        notification.type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {#if notification.type === "success"}
        <Bookmark class="w-5 h-5" />
      {:else}
        <AlertCircle class="w-5 h-5" />
      {/if}
      <span class="font-medium">{notification.message}</span>
    </div>
  {/if}

  <div class="mx-auto max-w-7xl">
    <!-- Page Header -->
    <div class="mb-6">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center gap-4">
          <div class="text-4xl">🔖</div>
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Bookmarks</h1>
            <p class="text-sm text-gray-600 mt-1">
              Your saved articles and links
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Bookmark Form -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="flex gap-2">
        <Input
          id="bookmark-input"
          type="text"
          placeholder="Paste a link to bookmark (e.g., https://example.com/article)"
          bind:value={newBookmarkUrl}
          onkeypress={(e) => {
            if (e.key === "Enter") {
              addBookmark();
            }
          }}
          class="flex-1 h-10 rounded-lg"
          disabled={isAddingBookmark}
        />
        <Button
          onclick={addBookmark}
          disabled={isAddingBookmark || !newBookmarkUrl.trim()}
          class="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isAddingBookmark}
            <div class="flex items-center gap-2">
              <Loader2 class="animate-spin h-4 w-4" />
              <span>Adding...</span>
            </div>
          {:else}
            <Plus class="w-4 h-4 mr-1" />
            <span>Add Bookmark</span>
          {/if}
        </Button>
      </div>
    </div>

    <div class="space-y-4">
      {#if bookmarks.length === 0 && !isLoading}
        <div class="bg-white rounded-lg shadow p-8 text-center">
          <div
            class="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <Bookmark class="w-6 h-6 text-slate-400" />
          </div>
          <p class="text-slate-600 font-medium text-sm">No bookmarks yet</p>
          <p class="text-slate-400 text-xs mt-1">
            Save interesting articles to read later!
          </p>
        </div>
      {:else}
        <!-- Bookmark Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each bookmarks as bookmark (bookmark.id)}
            <div
              class="bg-white rounded-lg shadow hover:shadow-lg transition-all overflow-hidden flex flex-col"
            >
              <!-- Main Image -->
              <div
                class="w-full h-48 overflow-hidden cursor-pointer bg-slate-100"
                onclick={() => openLink(bookmark.url)}
                role="button"
                tabindex="0"
                onkeydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openLink(bookmark.url);
                  }
                }}
              >
                <img
                  src={bookmark.main_image_url || placeholderImage}
                  alt={bookmark.title || "Bookmark image"}
                  class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  onerror={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = placeholderImage;
                  }}
                />
              </div>

              <!-- Content -->
              <div class="p-4 flex-1 flex flex-col">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xs text-slate-500">
                    {formatDate(bookmark.created_at)}
                  </span>
                </div>

                <h3
                  class="text-lg font-semibold text-slate-900 mb-2 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                  onclick={() => openLink(bookmark.url)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openLink(bookmark.url);
                    }
                  }}
                >
                  {bookmark.title || "Untitled Bookmark"}
                </h3>

                <p
                  class="text-xs text-blue-600 mb-3 truncate flex items-center gap-1"
                >
                  <ExternalLink class="w-3 h-3 flex-shrink-0" />
                  {extractDomain(bookmark.url)}
                </p>

                {#if bookmark.content_summary}
                  <p class="text-sm text-slate-600 line-clamp-3 mb-4 flex-1">
                    {bookmark.content_summary}
                  </p>
                {/if}

                <div class="pt-3 mt-auto border-t border-slate-100 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={(e) => {
                      e.stopPropagation();
                      deleteBookmark(bookmark.id);
                    }}
                    class="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
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
            <Loader2 class="animate-spin w-6 h-6 text-blue-600" />
            <span class="text-sm text-slate-600">Loading bookmarks...</span>
          </div>
        </div>
      {/if}

      <!-- Load More Button -->
      {#if hasMore && !isLoading && bookmarks.length > 0}
        <div class="bg-white rounded-lg shadow p-4 mt-4">
          <div class="flex justify-center">
            <Button
              onclick={() => loadMore()}
              class="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Load More
            </Button>
          </div>
        </div>
      {/if}

      <!-- End of List -->
      {#if !hasMore && bookmarks.length > 0}
        <div class="bg-white rounded-lg shadow p-4 mt-4 text-center">
          <p class="text-sm text-slate-500">
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
