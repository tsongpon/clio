<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { Bookmark, AlertCircle } from "lucide-svelte";
  import { isAuthenticated } from "$lib/utils/auth";
  import searchIcon from "$lib/assets/search-icon.svg";
  import externalReadingCue from "$lib/assets/external-reading-cue.svg";
  import StoryCard from "$lib/components/StoryCard.svelte";
  import BookmarkButton from "$lib/components/BookmarkButton.svelte";
  import { bookmarksStore, type BookmarkItem } from "$lib/stores/bookmarks";
  import {
    subscriptionsStore,
    subscriptionsLoadingStore,
  } from "$lib/stores/subscriptions";
  import {
    buildSourceTitles,
    formatStoryDate,
    sourceLabel,
    stripHtml,
    urlKey,
  } from "$lib/utils/story";

  const bookmarks = bookmarksStore.items;
  const bookmarksLoaded = bookmarksStore.loaded;
  const bookmarksLoading = bookmarksStore.loading;
  const pendingBookmarks = bookmarksStore.pending;

  // Cards are drawn in batches as the reader scrolls, so a large library
  // doesn't create every card (and start every image request) at once.
  const BATCH_SIZE = 30;

  let searchQuery = $state("");
  let sortMode = $state<"recent" | "oldest">("recent");
  let visibleCount = $state(BATCH_SIZE);
  let moreTrigger = $state<HTMLElement | null>(null);

  let notification = $state<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  let notificationTimeout: ReturnType<typeof setTimeout> | null = null;

  const sourceTitles = $derived(buildSourceTitles($subscriptionsStore));

  const displayedBookmarks = $derived.by(() => {
    let items = $bookmarks;

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      items = items.filter(
        (b) =>
          (b.title || "").toLowerCase().includes(query) ||
          (b.content_summary || "").toLowerCase().includes(query) ||
          b.url.toLowerCase().includes(query),
      );
    }

    const direction = sortMode === "recent" ? -1 : 1;
    return items
      .map((b) => ({ b, t: Date.parse(b.created_at) || 0 }))
      .sort((x, y) => (x.t - y.t) * direction)
      .map(({ b }) => b);
  });

  const visibleBookmarks = $derived(displayedBookmarks.slice(0, visibleCount));

  // Start from the first batch again whenever the search or sort changes.
  $effect(() => {
    void searchQuery;
    void sortMode;
    visibleCount = BATCH_SIZE;
  });

  // Reveal the next batch when the end of the list scrolls into view.
  // Re-observing after each batch re-checks the trigger, in case it is
  // still on screen (e.g. on a very tall window).
  $effect(() => {
    void visibleCount;
    if (!moreTrigger) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) visibleCount += BATCH_SIZE;
      },
      { rootMargin: "600px" },
    );
    observer.observe(moreTrigger);
    return () => observer.disconnect();
  });

  onMount(() => {
    if (!isAuthenticated()) {
      goto("/login");
      return;
    }

    bookmarksStore.reload();

    // Arriving here directly: the sidebar's subscription list (and the
    // cards' source names) still need the subscriptions.
    if ($subscriptionsLoadingStore) {
      subscriptionsStore
        .fetch()
        .finally(() => subscriptionsLoadingStore.setLoading(false));
    }
  });

  async function removeBookmark(bookmark: BookmarkItem): Promise<void> {
    const ok = await bookmarksStore.remove(bookmark);
    showNotification(
      ok ? "Removed from bookmarks." : "Couldn't remove the bookmark.",
      ok ? "success" : "error",
    );
  }

  function showNotification(
    message: string,
    type: "success" | "error" = "success",
  ): void {
    if (notificationTimeout) clearTimeout(notificationTimeout);
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
      class="animate-slide-in fixed top-4 right-4 z-50 flex items-center gap-2 rounded-[7px] px-4 py-2 text-white shadow-md {notification.type ===
      'success'
        ? 'bg-[#315d43]'
        : 'bg-red-500'}"
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
          YOUR READING SPACE
        </p>
        <h1
          class="mt-[13px] font-serif text-[34px] leading-[1.3] text-[#17362b]"
        >
          Your bookmarks
        </h1>
        <p class="mt-[10px] text-[13px] leading-[1.5] text-[#63715f]">
          Good stories, kept for later. All your saved articles in one place.
        </p>
      </div>

      <div class="relative w-full lg:mt-[25px] lg:w-[472px] lg:shrink-0">
        <img
          src={searchIcon}
          alt=""
          class="pointer-events-none absolute top-1/2 left-[15px] h-[18px] w-[18px] -translate-y-1/2"
        />
        <input
          type="search"
          bind:value={searchQuery}
          placeholder="Search bookmarks"
          aria-label="Search bookmarks"
          class="h-[46px] w-full rounded-[8px] border border-[#dce1d5] bg-[#f2f4ec] pr-4 pl-[46px] text-[13px] text-[#17362b] transition-colors placeholder:text-[#63715f] focus:border-[#315d43] focus:bg-white focus:outline-none"
        />
      </div>
    </div>

    <!-- Section heading + sorting -->
    <div class="mt-[35px] flex items-center justify-between gap-4">
      <h2 class="text-[16px] leading-[1.5] font-medium text-[#17362b]">
        Saved articles{$bookmarksLoaded ? ` · ${$bookmarks.length}` : ""}
      </h2>
      <button
        type="button"
        onclick={() => (sortMode = sortMode === "recent" ? "oldest" : "recent")}
        class="text-[11px] text-[#63715f] transition-colors hover:text-[#315d43]"
        title="Toggle sort order"
      >
        {sortMode === "recent" ? "Recently saved ↓" : "Oldest saved ↑"}
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
      {#if $bookmarksLoading && $bookmarks.length === 0}
        <!-- Initial Loading State - Skeleton Grid -->
        <div
          class="grid grid-cols-1 gap-x-6 gap-y-9 md:grid-cols-2 xl:grid-cols-3"
        >
          {#each Array(3) as _, i (i)}
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
              </div>
            </div>
          {/each}
        </div>
      {:else if $bookmarks.length === 0}
        <!-- Empty state -->
        <div class="rounded-[14px] border border-[#dce1d5] p-8 text-center">
          <div
            class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#dce6d3]"
          >
            <Bookmark class="h-5 w-5 text-[#315d43]" />
          </div>
          <p class="text-sm text-[#41553e]">No bookmarks yet</p>
          <p class="mt-1 text-xs text-[#63715f]">
            Use <span class="font-medium text-[#315d43]">Bookmark</span> on any
            story in
            <a href="/" class="text-[#315d43] underline">your feed</a> to keep it
            here.
          </p>
        </div>
      {:else if displayedBookmarks.length === 0}
        <p class="py-16 text-center text-sm text-[#63715f]">
          No bookmarks match your search.
        </p>
      {:else}
        <div
          class="grid grid-cols-1 gap-x-6 gap-y-9 md:grid-cols-2 xl:grid-cols-3"
        >
          {#each visibleBookmarks as bookmark (bookmark.id)}
            <StoryCard
              href={bookmark.url}
              title={bookmark.title}
              imageUrl={bookmark.main_image_url}
              source={sourceLabel(bookmark.url, sourceTitles)}
              description={stripHtml(bookmark.content_summary)}
              meta={formatStoryDate(bookmark.created_at)}
            >
              {#snippet action()}
                <BookmarkButton
                  variant="remove"
                  busy={$pendingBookmarks.has(urlKey(bookmark.url))}
                  onclick={() => removeBookmark(bookmark)}
                />
              {/snippet}
            </StoryCard>
          {/each}
        </div>

        {#if visibleCount < displayedBookmarks.length}
          <div bind:this={moreTrigger} class="h-px" aria-hidden="true"></div>
        {/if}

        <p class="mt-9 text-[11px] leading-[1.5] text-[#63715f]">
          Remove a bookmark anytime. The original article stays with its source.
        </p>
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
