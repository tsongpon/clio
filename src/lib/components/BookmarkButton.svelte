<script lang="ts">
  import bookmarkOutlineIcon from "$lib/assets/bookmark-outline-icon.svg";
  import bookmarkFilledIcon from "$lib/assets/bookmark-filled-icon.svg";

  /**
   * The design's 100×30 bookmark action:
   * - "save":   outline icon, "Bookmark" (feed, not yet saved)
   * - "saved":  filled icon on a sage chip, "Saved" (feed, click to unsave)
   * - "remove": filled icon, "Remove" (bookmarks page)
   */
  let {
    variant,
    busy = false,
    onclick,
  }: {
    variant: "save" | "saved" | "remove";
    busy?: boolean;
    onclick: () => void;
  } = $props();

  const label = $derived(
    variant === "save" ? "Bookmark" : variant === "saved" ? "Saved" : "Remove",
  );
  const title = $derived(
    variant === "save"
      ? "Save to bookmarks"
      : variant === "saved"
        ? "Saved — click to remove from bookmarks"
        : "Remove from bookmarks",
  );
</script>

<button
  type="button"
  {onclick}
  disabled={busy}
  aria-pressed={variant === "remove" ? undefined : variant === "saved"}
  aria-label={title}
  {title}
  class="flex h-[30px] w-[100px] shrink-0 items-center gap-[7px] rounded-[5px] pl-[9px] text-left text-[11px] leading-[1.5] font-medium text-[#315d43] transition-colors disabled:cursor-wait disabled:opacity-60 {variant ===
  'saved'
    ? 'bg-[#e8eedf] hover:bg-[#dce6d3]'
    : 'hover:bg-[#eef1e6]'}"
>
  <img
    src={variant === "save" ? bookmarkOutlineIcon : bookmarkFilledIcon}
    alt=""
    width="18"
    height="18"
    class="shrink-0"
  />
  {label}
</button>
