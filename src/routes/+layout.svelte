<script lang="ts">
  import { page } from "$app/stores";
  import { afterNavigate } from "$app/navigation";
  import { isAuthenticated } from "$lib/utils/auth";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";

  let { children } = $props();

  // Determine if current page requires authentication
  const isAuthPage = $derived(
    $page.url.pathname === "/login" || $page.url.pathname === "/signup",
  );
  const showSidebar = $derived(!isAuthPage && isAuthenticated());

  let isMobileMenuOpen = $state(false);
  let mainEl = $state<HTMLElement | null>(null);

  // Pages scroll inside <main>, not the window, so SvelteKit's built-in
  // scroll reset doesn't apply. Start every navigation (e.g. picking a
  // publisher or "All feeds" in the sidebar) at the top of the page.
  afterNavigate(() => {
    mainEl?.scrollTo({ top: 0 });
  });
</script>

<svelte:head>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"
  />
  <link rel="icon" href={favicon} />
</svelte:head>

{#if showSidebar}
  <div class="flex h-screen overflow-hidden bg-[#fcfbf7]">
    <Sidebar bind:isMobileMenuOpen />

    <!-- Main Content Area -->
    <main
      bind:this={mainEl}
      class="flex-1 overflow-y-auto bg-[#fcfbf7] lg:ml-[248px] lg:border-l lg:border-[#dce1d5]"
      style="touch-action: pan-y pinch-zoom;"
    >
      <div class="min-h-full">
        {@render children?.()}
      </div>
    </main>
  </div>
{:else}
  <!-- Auth pages without sidebar -->
  {@render children?.()}
{/if}
