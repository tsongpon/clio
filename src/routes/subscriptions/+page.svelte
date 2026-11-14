<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { Rss, AlertCircle } from "lucide-svelte";
  import {
    authenticatedFetch,
    isAuthenticated,
    removeToken,
  } from "$lib/utils/auth";
  import { API_BASE_URL } from "$lib/config";
  import type { RSSSubscription } from "$lib/types/subscription";
  import {
    subscriptionsStore,
    subscriptionsLoadingStore,
  } from "$lib/stores/subscriptions";
  import plusIcon from "$lib/assets/plus-icon.svg";
  import rssIcon from "$lib/assets/rss-icon.svg";
  import searchIcon from "$lib/assets/search-icon.svg";

  // Unread counts per subscription. The subscriptions API has no unread
  // field, so each feed's newest page is fetched and its unread stories
  // counted ("+" when the feed has more stories than that page).
  const UNREAD_PAGE_SIZE = 100;
  const UNREAD_CONCURRENCY = 4;
  type UnreadInfo = { count: number; more: boolean } | "error";

  let newFeedUrl = $state("");
  let isAddingFeed = $state(false);
  let removingIds = $state<Set<string>>(new Set());
  let searchQuery = $state("");
  let unread = $state<Record<string, UnreadInfo>>({});
  let notification = $state<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  let notificationTimeout: ReturnType<typeof setTimeout> | null = null;

  const subscriptionCount = $derived($subscriptionsStore.length);

  const displayedSubscriptions = $derived.by(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return $subscriptionsStore;
    return $subscriptionsStore.filter(
      (s) =>
        (s.title || "").toLowerCase().includes(query) ||
        (s.feed_url || "").toLowerCase().includes(query),
    );
  });

  function handleAuthError(): void {
    removeToken();
    goto("/login");
  }

  onMount(() => {
    if (!isAuthenticated()) {
      goto("/login");
      return;
    }
    loadSubscriptions();
  });

  async function loadSubscriptions(): Promise<void> {
    await subscriptionsStore.fetch();
    subscriptionsLoadingStore.setLoading(false);
    loadUnreadCounts($subscriptionsStore.filter((s) => !(s.id in unread)));
  }

  async function loadUnreadCounts(subs: RSSSubscription[]): Promise<void> {
    const queue = [...subs];
    const worker = async () => {
      for (let sub = queue.shift(); sub; sub = queue.shift()) {
        unread[sub.id] = await fetchUnread(sub.id);
      }
    };
    await Promise.all(Array.from({ length: UNREAD_CONCURRENCY }, worker));
  }

  async function fetchUnread(subscriptionId: string): Promise<UnreadInfo> {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/feeds?page_size=${UNREAD_PAGE_SIZE}&retrieve_feed=false&subscription_id=${subscriptionId}`,
      );
      if (!response.ok) return "error";
      const data: { data: { is_read: boolean }[]; has_more: boolean } =
        await response.json();
      return {
        count: (data.data ?? []).filter((item) => !item.is_read).length,
        more: data.has_more,
      };
    } catch {
      return "error";
    }
  }

  async function addSubscription(): Promise<void> {
    if (isAddingFeed) return;
    if (!newFeedUrl.trim()) {
      document.getElementById("feed-url")?.focus();
      return;
    }

    let formattedUrl = newFeedUrl.trim();
    if (!/^https?:\/\//.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }

    isAddingFeed = true;
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/subscriptions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feed_url: formattedUrl }),
        },
      );

      if (response.status === 401) {
        handleAuthError();
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      newFeedUrl = "";
      showNotification("Feed added to your subscriptions.", "success");
      await loadSubscriptions();
    } catch (error) {
      console.error("Failed to add subscription:", error);
      showNotification("Couldn't add that feed. Check the URL.", "error");
    } finally {
      isAddingFeed = false;
    }
  }

  async function removeSubscription(subscription: RSSSubscription) {
    if (removingIds.has(subscription.id)) return;
    removingIds = new Set(removingIds).add(subscription.id);

    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/subscriptions`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription_id: subscription.id }),
        },
      );

      if (response.status === 401) {
        handleAuthError();
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      showNotification(`Removed ${subscription.title}.`, "success");
      await loadSubscriptions();
    } catch (error) {
      console.error("Failed to remove subscription:", error);
      showNotification("Couldn't remove that feed.", "error");
    } finally {
      const next = new Set(removingIds);
      next.delete(subscription.id);
      removingIds = next;
    }
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
        <Rss class="h-4 w-4" />
      {:else}
        <AlertCircle class="h-4 w-4" />
      {/if}
      <span class="text-sm">{notification.message}</span>
    </div>
  {/if}

  <div class="mx-auto w-full max-w-[1312px]">
    <!-- Page heading -->
    <p class="text-[10px] font-semibold tracking-[1.2px] text-[#63715f]">
      YOUR READING SPACE
    </p>
    <h1 class="mt-[13px] font-serif text-[34px] leading-[1.3] text-[#17362b]">
      Manage subscriptions
    </h1>
    <p class="mt-[10px] text-[13px] leading-[1.5] text-[#63715f]">
      Make room for the voices you want to hear. Add and manage your RSS feeds.
    </p>

    <!-- Add a new feed -->
    <section
      class="mt-[42px] rounded-[10px] border border-[#dce1d5] bg-[#f2f4ec] px-[22px] pt-[18px] pb-[22px]"
    >
      <h2 class="text-[18px] leading-[1.5] font-medium text-[#17362b]">
        Add a new feed
      </h2>
      <p class="mt-1 text-[13px] leading-[1.5] text-[#63715f]">
        Found something worth following? Add its RSS feed below.
      </p>

      <form
        class="mt-[15px]"
        onsubmit={(e) => {
          e.preventDefault();
          addSubscription();
        }}
      >
        <label
          for="feed-url"
          class="block text-[12px] leading-[1.5] font-semibold text-[#17362b]"
        >
          RSS feed URL
        </label>
        <div class="mt-[7px] flex flex-col gap-3 sm:flex-row sm:gap-4">
          <input
            id="feed-url"
            type="text"
            inputmode="url"
            autocomplete="off"
            bind:value={newFeedUrl}
            placeholder="https://example.com/feed.xml"
            disabled={isAddingFeed}
            class="h-[46px] min-w-0 flex-1 rounded-[7px] border border-[#dce1d5] bg-white px-[15px] text-[13px] text-[#17362b] transition-colors placeholder:text-[#63715f] focus:border-[#315d43] focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isAddingFeed}
            class="flex h-[46px] w-full shrink-0 items-center gap-[13px] rounded-[7px] bg-[#315d43] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#2a4d39] disabled:cursor-not-allowed disabled:opacity-60 sm:mr-0.5 sm:w-[160px]"
          >
            <img src={plusIcon} alt="" class="h-[18px] w-[18px] shrink-0" />
            {isAddingFeed ? "Adding…" : "Add feed"}
          </button>
        </div>
      </form>

      <p class="mt-[15px] text-[11px] leading-[1.5] text-[#63715f]">
        Paste a full RSS or Atom feed URL to subscribe.
      </p>
    </section>

    <!-- Your subscriptions -->
    <section class="mt-12">
      <div
        class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
      >
        <div>
          <h2 class="text-[18px] leading-[1.5] font-medium text-[#17362b]">
            Your subscriptions
          </h2>
          <p class="mt-[5px] text-[12px] leading-[1.5] text-[#63715f]">
            {subscriptionCount}
            {subscriptionCount === 1 ? "feed" : "feeds"} in your reading collection
          </p>
        </div>
        <div class="relative w-full md:w-[368px]">
          <img
            src={searchIcon}
            alt=""
            class="pointer-events-none absolute top-1/2 left-[15px] h-[18px] w-[18px] -translate-y-1/2"
          />
          <input
            type="search"
            bind:value={searchQuery}
            placeholder="Search subscriptions"
            aria-label="Search subscriptions"
            class="h-[44px] w-full rounded-[8px] border border-[#dce1d5] bg-[#f2f4ec] pr-4 pl-[46px] text-[13px] text-[#17362b] transition-colors placeholder:text-[#63715f] focus:border-[#315d43] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <!-- Column headings -->
      <div
        class="mt-[30px] hidden h-8 grid-cols-[minmax(0,1fr)_360px_112px] items-center rounded-[5px] bg-[#f2f4ec] px-5 text-[9px] font-semibold tracking-[1.2px] text-[#63715f] md:grid"
      >
        <span>FEED</span>
        <span>UNREAD</span>
        <span class="pl-[18px]">ACTIONS</span>
      </div>

      {#if $subscriptionsLoadingStore}
        <ul class="mt-4 md:mt-0">
          {#each Array(4) as _, i (i)}
            <li
              class="mx-5 flex h-[82px] items-center gap-4 border-b border-[#dce1d5]"
            >
              <div
                class="animate-shimmer h-[42px] w-[42px] shrink-0 rounded-[9px] bg-gradient-to-r from-[#eef1e6] via-[#f6f7f1] to-[#eef1e6] bg-[length:200%_100%]"
              ></div>
              <div class="flex-1 space-y-2">
                <div
                  class="animate-shimmer h-3.5 w-48 rounded bg-gradient-to-r from-[#dce6d3] via-[#e8ecdf] to-[#dce6d3] bg-[length:200%_100%]"
                ></div>
                <div
                  class="animate-shimmer h-3 w-72 max-w-full rounded bg-gradient-to-r from-[#dce6d3] via-[#e8ecdf] to-[#dce6d3] bg-[length:200%_100%]"
                ></div>
              </div>
            </li>
          {/each}
        </ul>
      {:else if subscriptionCount === 0}
        <div
          class="mt-4 rounded-[10px] border border-[#dce1d5] p-8 text-center"
        >
          <div
            class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#dce6d3]"
          >
            <Rss class="h-5 w-5 text-[#315d43]" />
          </div>
          <p class="text-sm text-[#41553e]">No subscriptions yet</p>
          <p class="mt-1 text-xs text-[#63715f]">
            Add your first RSS feed above.
          </p>
        </div>
      {:else if displayedSubscriptions.length === 0}
        <p class="py-12 text-center text-sm text-[#63715f]">
          No subscriptions match your search.
        </p>
      {:else}
        <ul class="mt-4 md:mt-0">
          {#each displayedSubscriptions as subscription (subscription.id)}
            {@const info = unread[subscription.id]}
            <li
              class="mx-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#dce1d5] py-5 md:grid md:h-[82px] md:grid-cols-[minmax(0,1fr)_360px_112px] md:gap-0 md:py-0"
            >
              <!-- Feed -->
              <div class="flex min-w-0 flex-1 items-center gap-4">
                <span
                  class="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[9px] bg-[#eef1e6]"
                >
                  <img src={rssIcon} alt="" class="h-[18px] w-[18px]" />
                </span>
                <div class="min-w-0 pr-4 md:-mt-[5px]">
                  <a
                    href="/?subscription_id={subscription.id}"
                    class="block truncate text-[14px] leading-[1.5] font-semibold text-[#17362b] hover:text-[#315d43] hover:underline"
                    title="Read {subscription.title}"
                  >
                    {subscription.title}
                  </a>
                  <p
                    class="mt-[6px] truncate text-[12px] leading-[1.5] text-[#63715f]"
                    title={subscription.feed_url}
                  >
                    {subscription.feed_url}
                  </p>
                </div>
              </div>

              <!-- Unread -->
              <p
                class="text-[12px] leading-[1.5] md:-mt-1 {info &&
                info !== 'error' &&
                info.count > 0
                  ? 'text-[#315d43]'
                  : 'text-[#63715f]'}"
              >
                {#if info === undefined}
                  <span class="text-[#63715f]/70">Counting…</span>
                {:else if info === "error"}
                  —
                {:else if info.count === 0 && !info.more}
                  All caught up
                {:else}
                  {info.count}{info.more ? "+" : ""} unread
                {/if}
              </p>

              <!-- Actions -->
              <button
                type="button"
                onclick={() => removeSubscription(subscription)}
                disabled={removingIds.has(subscription.id)}
                class="h-9 w-[112px] rounded-[6px] md:-mt-0.5 border border-[#e1ccc5] text-[12px] text-[#884d40] transition-colors hover:bg-[#f7ece8] disabled:cursor-wait disabled:opacity-60"
              >
                {removingIds.has(subscription.id) ? "Removing…" : "Remove feed"}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- Guidance -->
    <div class="mt-[50px]">
      <p class="text-[15px] leading-[1.5] font-medium text-[#17362b]">
        A collection that changes with you.
      </p>
      <p class="mt-[6px] text-[12px] leading-[1.5] text-[#63715f]">
        Removing a feed stops new stories from appearing in your collection. You
        can add it again anytime.
      </p>
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
