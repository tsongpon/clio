<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Card } from "$lib/components/ui/card";
  import { Archive, ExternalLink, Bookmark } from "lucide-svelte";

  interface BookmarkItem {
    id: string;
    url: string;
    user_id: string;
    created_at: string;
    is_archived: boolean;
  }

  let url = $state<string>("");
  let bookmarks = $state<BookmarkItem[]>([]);

  async function fetchBookmarks(): Promise<void> {
    try {
      const response = await fetch(
        "http://localhost:1323/bookmarks?user_id=songpon&archived=false",
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      bookmarks = data;
    } catch (error) {
      console.error("Failed to fetch bookmarks:", error);
      // You might want to show an error message to the user here
    }
  }

  // Fetch bookmarks when the component mounts
  fetchBookmarks();

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
      const response = await fetch("http://localhost:1323/bookmarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newBookmark),
      });

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
      const response = await fetch(
        `http://localhost:1323/bookmarks/${id}/archive`,
        {
          method: "POST",
        },
      );

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

  function formatDate(date: Date): string {
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
      <div class="flex items-center gap-2 mb-1">
        <div class="bg-blue-600 p-2 rounded-lg">
          <Bookmark class="w-5 h-5 text-white" />
        </div>
        <h1
          class="text-balance text-2xl font-bold tracking-tight text-slate-900"
        >
          Bookmark Manager
        </h1>
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
          {bookmarks.length}
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
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2 group transition-colors"
                >
                  <ExternalLink
                    class="w-3.5 h-3.5 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                  />
                  <span class="truncate">{bookmark.url}</span>
                </a>
                <div class="flex items-center gap-2 mt-1">
                  <span
                    class="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded"
                  >
                    {formatDate(bookmark.createdAt)}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onclick={() => archiveBookmark(bookmark.id)}
                class="flex-shrink-0 h-8 w-8 rounded-full text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <Archive class="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>
