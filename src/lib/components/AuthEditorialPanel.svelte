<script lang="ts">
  // Left-hand editorial panel shared by the login and signup pages.
  import rssMark from "$lib/assets/rss-mark.svg";
  import quietReadingIndicator from "$lib/assets/quiet-reading-indicator.svg";

  /** Big serif headline, one entry per line. */
  let { headline }: { headline: string[] } = $props();

  // Static editorial content for the left panel reading preview.
  const previewArticles = [
    {
      topic: "DESIGN",
      title: "Designing a slower internet",
      source: "A List Apart · 5 min read",
    },
    {
      topic: "CULTURE",
      title: "The joy of paying attention",
      source: "The Marginalian · 8 min read",
    },
    {
      topic: "TECHNOLOGY",
      title: "A more thoughtful kind of tech",
      source: "MIT Technology Review · 6 min read",
    },
  ];
</script>

<!-- Left · Editorial panel -->
<div
  class="hidden flex-col justify-between bg-[#17362b] px-14 pt-[54px] pb-[46px] lg:flex lg:w-[45%]"
>
  <div class="max-w-[550px]">
    <!-- Brand -->
    <div class="flex items-center gap-3">
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#dce9b9] p-1.5"
      >
        <img src={rssMark} alt="feedit.live" class="h-6 w-6" />
      </div>
      <p class="text-[29px] leading-[1.45] font-semibold text-[#fcfbf7]">
        feedit.live
      </p>
    </div>

    <!-- Brand descriptor -->
    <p class="mt-16 text-[10px] font-medium tracking-[1.5px] text-[#dce9b9]">
      A LITTLE LESS NOISE. A LOT MORE YOU.
    </p>

    <!-- Welcome headline -->
    <p class="mt-7 font-serif text-[57px] leading-[1.45] text-[#fcfbf7]">
      {#each headline as line, i (i)}{#if i > 0}<br />{/if}{line}{/each}
    </p>

    <!-- Welcome description -->
    <p class="mt-[22px] text-base leading-[1.45] text-[#c1cec4]">
      All your favorite blogs, news, and ideas.<br />
      One quiet place to keep up with what matters.
    </p>

    <!-- Your daily reading preview -->
    <div class="mt-[66px] w-full max-w-[538px] rounded-[14px] bg-[#fcfbf7] p-6">
      <p class="text-[9px] font-semibold tracking-[1.2px] text-[#627368]">
        A FRESH PERSPECTIVE, EVERY DAY
      </p>
      <div class="mt-[11px] flex items-center justify-between gap-4">
        <p class="font-serif text-[25px] leading-[1.45] text-[#17362b]">
          Your daily collection
        </p>
        <span
          class="flex h-7 shrink-0 items-center justify-center rounded-[14px] bg-[#e8edde] px-[15px] text-[10px] font-medium text-[#315442]"
        >
          3 unread
        </span>
      </div>

      {#each previewArticles as article, i}
        <div
          class="flex items-start border-t border-[#e4e6de] pt-[10px] {i === 0
            ? 'mt-[16px]'
            : 'mt-[22px]'}"
        >
          <p
            class="w-[91px] shrink-0 pt-[3px] text-[8px] font-semibold tracking-[0.8px] text-[#5c735c]"
          >
            {article.topic}
          </p>
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-medium text-[#253b31]">
              {article.title}
            </p>
            <p class="mt-[4px] text-[10px] text-[#687268]">
              {article.source}
            </p>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Bottom -->
  <div>
    <div class="flex items-center gap-2.5">
      <img src={quietReadingIndicator} alt="" class="h-1.5 w-1.5 shrink-0" />
      <p class="text-xs leading-[1.45] text-[#c1cec4]">
        No algorithms. No noise. Just your interests.
      </p>
    </div>
    <p class="mt-[70px] text-[9px] font-medium tracking-[1px] text-[#afc1b4]">
      CURATED BY YOU. ENJOYED AT YOUR PACE.
    </p>
  </div>
</div>
