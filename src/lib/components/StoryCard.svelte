<script lang="ts">
  import type { Snippet } from "svelte";
  import imageUnavailable from "$lib/assets/image-unavailable.jpg";
  import unreadIndicator from "$lib/assets/unread-indicator.svg";
  import openInNewTabIcon from "$lib/assets/open-in-new-tab.svg";
  import { getProxiedImageUrl } from "$lib/utils/story";

  /**
   * Story card shared by the news feed and bookmarks pages.
   * `isRead` undefined means the item has no read state (no dot / badge).
   */
  let {
    href,
    title,
    imageUrl,
    source,
    description,
    meta,
    isRead,
    onOpen,
    action,
  }: {
    href: string;
    title: string;
    imageUrl: string;
    source: string;
    description: string;
    meta: string;
    isRead?: boolean;
    onOpen?: () => void;
    action?: Snippet;
  } = $props();

  let imageFailed = $state(false);
  const showImage = $derived(Boolean(imageUrl) && !imageFailed);
</script>

<article class="flex flex-col">
  <!-- Main picture -->
  <a
    {href}
    target="_blank"
    rel="noopener noreferrer"
    onclick={onOpen}
    class="group relative block aspect-[408/230] overflow-hidden rounded-[10px]"
    aria-label="Open article in a new tab"
  >
    {#if showImage}
      <img
        src={getProxiedImageUrl(imageUrl)}
        alt={title || "Story image"}
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        onerror={() => (imageFailed = true)}
      />
    {:else}
      <img src={imageUnavailable} alt="" class="h-full w-full object-cover" />
      <span
        class="absolute top-[66.5%] left-1/2 -translate-x-1/2 text-[12px] leading-[1.5] whitespace-nowrap text-[#63715f]"
      >
        Image unavailable
      </span>
    {/if}
    {#if isRead}
      <span
        class="absolute right-3 bottom-3 rounded-[5px] bg-[#fcfbf7] px-[14px] py-[6px] text-[9px] font-medium text-[#54705a]"
      >
        Read
      </span>
    {/if}
  </a>

  <!-- Source -->
  <div class="mt-4 flex items-center gap-[9px]">
    {#if isRead === false}
      <img src={unreadIndicator} alt="" class="h-[5px] w-[5px] shrink-0" />
    {/if}
    <p
      class="truncate text-[10px] font-semibold tracking-[0.6px] text-[#54705a] uppercase"
    >
      {source}
    </p>
  </div>

  <!-- Headline + open original -->
  <div class="mt-[11px] flex items-start justify-between gap-3">
    <h3
      class="line-clamp-2 min-w-0 flex-1 text-[18px] leading-[1.5] text-[#17362b] {isRead
        ? 'font-medium'
        : 'font-semibold'}"
    >
      <a
        {href}
        target="_blank"
        rel="noopener noreferrer"
        onclick={onOpen}
        class="transition-colors hover:text-[#315d43]"
      >
        {title || "Untitled story"}
      </a>
    </h3>
    <a
      {href}
      target="_blank"
      rel="noopener noreferrer"
      onclick={onOpen}
      class="-mr-0.5 mt-px shrink-0 rounded p-1"
      aria-label="Open in new tab"
    >
      <img src={openInNewTabIcon} alt="" class="h-[17px] w-[17px]" />
    </a>
  </div>

  <!-- Preview -->
  <p class="mt-[10px] line-clamp-2 text-[12px] leading-[1.5] text-[#63715f]">
    {description}
  </p>

  <!-- Metadata + bookmark action -->
  <div class="mt-[5px] flex min-h-[30px] items-center justify-between gap-3">
    <p class="min-w-0 truncate text-[10px] leading-[1.5] text-[#63715f]">
      {meta}
    </p>
    {@render action?.()}
  </div>
</article>
