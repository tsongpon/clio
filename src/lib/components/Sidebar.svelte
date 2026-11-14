<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { Bookmark, Menu, X } from "lucide-svelte";
  import { getUser, removeToken } from "$lib/utils/auth";
  import {
    subscriptionsStore,
    subscriptionsLoadingStore,
  } from "$lib/stores/subscriptions";
  import { feedStatsStore } from "$lib/stores/feedStats";
  import rssMark from "$lib/assets/rss-mark.svg";
  import plusIcon from "$lib/assets/plus-icon.svg";
  import gridIcon from "$lib/assets/grid-icon.svg";
  import rssIcon from "$lib/assets/rss-icon.svg";
  import chevronIcon from "$lib/assets/chevron-icon.svg";

  let { isMobileMenuOpen = $bindable(false) } = $props();

  const user = $derived(getUser());
  let showAllSubscriptions = $state(false);

  const displayedSubscriptions = $derived(
    showAllSubscriptions
      ? $subscriptionsStore
      : $subscriptionsStore.slice(0, 10),
  );

  const hasMoreSubscriptions = $derived($subscriptionsStore.length > 10);

  // Don't load subscriptions on mount - let the main page trigger it after feeds load

  function handleLogout() {
    removeToken();
    goto("/login");
  }

  function navigateTo(path: string) {
    goto(path);
    isMobileMenuOpen = false;
  }

  function navigateToSubscriptionFeed(subscriptionId: string) {
    goto(`/?subscription_id=${subscriptionId}`);
    isMobileMenuOpen = false;
  }

  function isActive(path: string): boolean {
    return $page.url.pathname === path;
  }

  function isSubscriptionActive(subscriptionId: string): boolean {
    return (
      $page.url.pathname === "/" &&
      $page.url.searchParams.get("subscription_id") === subscriptionId
    );
  }

  function isAllFeedsActive(): boolean {
    return (
      $page.url.pathname === "/" &&
      !$page.url.searchParams.get("subscription_id")
    );
  }
</script>

<!-- Mobile Menu Toggle Button -->
<button
  class="fixed right-6 bottom-6 z-50 rounded-full bg-[#315d43] p-4 shadow-lg transition-colors hover:bg-[#2a4d39] lg:hidden"
  onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
  aria-label="Toggle menu"
>
  {#if isMobileMenuOpen}
    <X class="h-6 w-6 text-white" />
  {:else}
    <Menu class="h-6 w-6 text-white" />
  {/if}
</button>

<!-- Sidebar -->
<aside
  class="fixed top-0 left-0 z-40 flex h-full w-[248px] flex-col overflow-y-auto bg-[#eef1e6] px-6 pt-[33px] pb-6 transition-transform duration-300 {isMobileMenuOpen
    ? 'translate-x-0'
    : '-translate-x-full lg:translate-x-0'}"
>
  <!-- Brand -->
  <button
    onclick={() => {
      if ($page.url.pathname === "/") {
        window.location.reload();
      } else {
        goto("/");
      }
    }}
    class="flex items-center gap-2.5 self-start transition-opacity hover:opacity-80"
    aria-label="Reload feed"
  >
    <span
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#dce9b9] p-1.5"
    >
      <img src={rssMark} alt="" class="h-6 w-6" />
    </span>
    <span class="text-[22px] leading-[1.5] font-semibold text-[#17362b]">
      feedit.live
    </span>
  </button>

  <!-- Add feed (the add form lives on the subscriptions page) -->
  <button
    onclick={() => navigateTo("/subscriptions")}
    class="mt-11 flex h-[46px] w-full items-center gap-[13px] rounded-[7px] bg-[#315d43] pr-4 pl-4 text-left transition-colors hover:bg-[#2a4d39] focus:ring-2 focus:ring-[#315d43]/50 focus:outline-none"
  >
    <img src={plusIcon} alt="" class="h-[18px] w-[18px] shrink-0" />
    <span class="text-[13px] font-semibold text-white">Add feed</span>
  </button>

  <!-- Library -->
  <p class="mt-9 text-[10px] font-semibold tracking-[1.1px] text-[#63715f]">
    YOUR LIBRARY
  </p>
  <button
    onclick={() => navigateTo("/")}
    class="-mx-2 mt-[15px] flex h-11 w-[calc(100%+16px)] items-center gap-3 rounded-[7px] pr-2 pl-[15px] text-left transition-colors {isAllFeedsActive()
      ? 'bg-[#dce6d3]'
      : 'hover:bg-[#dce6d3]/60'}"
  >
    <img src={gridIcon} alt="" class="h-[18px] w-[18px] shrink-0" />
    <span
      class="flex-1 text-[13px] font-semibold {isAllFeedsActive()
        ? 'text-[#315d43]'
        : 'text-[#41553e]'}"
    >
      All feeds
    </span>
    {#if $feedStatsStore.total > 0}
      <span class="text-[13px] font-semibold text-[#315d43]">
        {$feedStatsStore.unread}
      </span>
    {/if}
  </button>

  <!-- Subscriptions -->
  <div class="mt-12 flex items-baseline justify-between gap-2">
    <p class="text-[10px] font-semibold tracking-[1.1px] text-[#63715f]">
      SUBSCRIPTIONS
    </p>
    <button
      onclick={() => navigateTo("/subscriptions")}
      class="text-[10px] text-[#54705a] hover:underline {isActive(
        '/subscriptions',
      )
        ? 'underline'
        : ''}"
    >
      Manage
    </button>
  </div>

  <div class="mt-7">
    {#if $subscriptionsLoadingStore}
      <!-- Loading skeleton -->
      <ul>
        {#each Array(5) as _, i (i)}
          <li class="flex items-center gap-[11px] py-[15px]">
            <div
              class="animate-shimmer h-[18px] w-[18px] shrink-0 rounded-full bg-gradient-to-r from-[#dce6d3] via-[#eef1e6] to-[#dce6d3] bg-[length:200%_100%]"
            ></div>
            <div
              class="animate-shimmer h-3 flex-1 rounded bg-gradient-to-r from-[#dce6d3] via-[#eef1e6] to-[#dce6d3] bg-[length:200%_100%]"
            ></div>
          </li>
        {/each}
      </ul>
    {:else if $subscriptionsStore.length > 0}
      <ul>
        {#each displayedSubscriptions as subscription (subscription.id)}
          <li>
            <button
              onclick={() => navigateToSubscriptionFeed(subscription.id)}
              class="-mx-2 flex w-[calc(100%+16px)] items-center gap-[11px] rounded-[7px] px-[10px] py-[15px] text-left transition-colors {isSubscriptionActive(
                subscription.id,
              )
                ? 'bg-[#dce6d3]'
                : 'hover:bg-[#dce6d3]/60'}"
              title={subscription.title}
            >
              <img src={rssIcon} alt="" class="h-[18px] w-[18px] shrink-0" />
              <span class="flex-1 truncate text-[12px] text-[#41553e]">
                {subscription.title}
              </span>
            </button>
          </li>
        {/each}
      </ul>
      {#if hasMoreSubscriptions}
        <button
          onclick={() => (showAllSubscriptions = !showAllSubscriptions)}
          class="mt-2 py-2 text-[10px] text-[#54705a] hover:underline"
        >
          {showAllSubscriptions
            ? "Show less"
            : `Show more (${$subscriptionsStore.length - 10} more)`}
        </button>
      {/if}
    {:else}
      <p class="py-2 text-[11px] text-[#63715f]">No subscriptions yet</p>
    {/if}
  </div>

  <div class="mt-10 h-px bg-[#d6ddce]"></div>
  <p class="mt-5 text-[11px] leading-[1.5] text-[#63715f]">
    {$subscriptionsStore.length}
    {#if $subscriptionsStore.length === 1}source.{:else}sources.{/if}
    Endless possibilities.
  </p>

  <!-- Reading reminder -->
  <div class="mt-auto pt-10">
    <p class="text-[9px] font-semibold tracking-[1.1px] text-[#54705a]">
      YOUR READING SPACE
    </p>
    <p class="mt-[14px] font-serif text-2xl leading-[1.3] text-[#315d43]">
      Less scrolling.<br />More discovery.
    </p>
  </div>

  <!-- Bottom: bookmarks + account -->
  <div class="mt-auto pt-10">
    <!-- The design shows a "Settings" row here; no settings page exists,
         so this slot holds Bookmarks to keep the page reachable. -->
    <button
      onclick={() => navigateTo("/bookmarks")}
      class="-mx-2 flex w-[calc(100%+16px)] items-center gap-[11px] rounded-[7px] px-[10px] py-[15px] text-left transition-colors {isActive(
        '/bookmarks',
      )
        ? 'bg-[#dce6d3]'
        : 'hover:bg-[#dce6d3]/60'}"
    >
      <Bookmark
        class="h-[18px] w-[18px] shrink-0 text-[#54705A]"
        strokeWidth={1.6}
      />
      <span class="text-[12px] text-[#41553e]">Bookmarks</span>
    </button>

    <div class="mt-6 h-px bg-[#d6ddce]"></div>

    {#if user}
      <button
        onclick={handleLogout}
        class="mt-[22px] flex w-full items-center gap-2 rounded-[7px] py-2 text-left transition-colors hover:bg-[#dce6d3]/60"
        aria-label="Log out"
        title="Log out"
      >
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[13px] font-semibold text-[#17362b]">
            {user.name || "User"}
          </span>
          <span class="block truncate text-[10px] text-[#63715f]">
            {user.email || "Log out"}
          </span>
        </span>
        <img src={chevronIcon} alt="" class="h-[18px] w-[18px] shrink-0" />
      </button>
    {/if}
  </div>
</aside>

<!-- Overlay for mobile -->
{#if isMobileMenuOpen}
  <button
    type="button"
    class="fixed inset-0 z-30 bg-black/50 lg:hidden"
    onclick={() => (isMobileMenuOpen = false)}
    aria-label="Close menu"
  ></button>
{/if}

<style>
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  :global(.animate-shimmer) {
    animation: shimmer 2s infinite linear;
  }
</style>
