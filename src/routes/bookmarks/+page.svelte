<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import {
    ExternalLink,
    Bookmark,
    Loader2,
    Plus,
    AlertCircle,
    Trash2,
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
    append: boolean = false,
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
        showNotification(`Failed to add bookmark: ${response.status}`, "error");
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
        },
      );

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        showNotification(
          `Failed to delete bookmark: ${response.status}`,
          "error",
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
      <h1 class="text-2xl font-semibold text-gray-900">Bookmarks</h1>
    </div>

    <!-- Add Bookmark Form -->
    <div class="border border-[#FFD4B3] rounded-lg p-4 mb-4">
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
          class="flex-1 h-9 rounded-md border-[#FFBA80] focus:border-[#FF6600] focus:ring-[#FF6600]"
          disabled={isAddingBookmark}
        />
        <Button
          onclick={addBookmark}
          disabled={isAddingBookmark || !newBookmarkUrl.trim()}
          class="h-9 px-3 bg-[#FF6600] hover:bg-[#FF8533] text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isAddingBookmark}
            <div class="flex items-center gap-2">
              <Loader2 class="animate-spin h-4 w-4" />
              <span>Adding...</span>
            </div>
          {:else}
            <Plus class="w-4 h-4 mr-1" />
            <span>Add</span>
          {/if}
        </Button>
      </div>
    </div>

    <div class="space-y-4">
      {#if bookmarks.length === 0 && !isLoading}
        <div class="border border-[#FFD4B3] rounded-lg p-8 text-center">
          <div
            class="bg-[#FFE6D5] w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
          >
            <Bookmark class="w-5 h-5 text-[#FF6600]" />
          </div>
          <p class="text-gray-600 text-sm">No bookmarks yet</p>
          <p class="text-gray-400 text-xs mt-1">
            Save interesting articles to read later!
          </p>
        </div>
      {:else}
        <!-- Bookmark Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each bookmarks as bookmark (bookmark.id)}
            <div
              class="rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col bg-white"
            >
              <!-- Main Image -->
              <div
                class="w-full h-48 overflow-hidden cursor-pointer bg-gray-100"
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
                  src={getProxiedImageUrl(bookmark.main_image_url)}
                  alt={bookmark.title || "Bookmark image"}
                  class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  onerror={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = placeholderImage;
                  }}
                />
              </div>

              <!-- Content -->
              <div class="p-3 flex-1 flex flex-col">
                <h3
                  class="text-base font-medium text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:text-gray-600 transition-colors"
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

                <div class="text-xs text-gray-500 mb-2 space-y-1">
                  <p class="flex items-center gap-1">
                    <ExternalLink class="w-3 h-3 flex-shrink-0" />
                    {extractDomain(bookmark.url)}
                  </p>
                  <p>{formatDate(bookmark.created_at)}</p>
                </div>

                {#if bookmark.content_summary}
                  <p class="text-xs text-gray-600 line-clamp-2 mb-3 flex-1">
                    {bookmark.content_summary}
                  </p>
                {/if}

                <div
                  class="pt-2 mt-auto border-t border-orange-50 flex justify-end"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={(e) => {
                      e.stopPropagation();
                      deleteBookmark(bookmark.id);
                    }}
                    class="text-[#FF6600] hover:text-[#FF8533] hover:bg-[#FFE6D5] h-7 px-2 text-xs"
                    aria-label="Delete bookmark"
                  >
                    <Trash2 class="w-3 h-3 mr-1" />
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
        <div class="border border-[#FFD4B3] rounded-lg p-4 mt-4">
          <div class="flex items-center justify-center gap-2">
            <Loader2 class="animate-spin w-5 h-5 text-[#FF6600]" />
            <span class="text-sm text-gray-600">Loading bookmarks...</span>
          </div>
        </div>
      {/if}

      <!-- Load More Button -->
      {#if hasMore && !isLoading && bookmarks.length > 0}
        <div class="border border-[#FFD4B3] rounded-lg p-4 mt-4">
          <div class="flex justify-center">
            <Button
              onclick={() => loadMore()}
              class="h-8 px-4 bg-[#FF6600] hover:bg-[#FF8533] text-white rounded-md text-sm"
            >
              Load More
            </Button>
          </div>
        </div>
      {/if}

      <!-- End of List -->
      {#if !hasMore && bookmarks.length > 0}
        <div class="border border-[#FFD4B3] rounded-lg p-4 mt-4 text-center">
          <p class="text-sm text-gray-500">
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
