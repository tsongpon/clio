<script lang="ts">
  import { page } from "$app/stores";
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
</script>

<svelte:head>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"
  />
  <link rel="icon" href={favicon} />
</svelte:head>

{#if showSidebar}
  <div class="flex h-screen overflow-hidden bg-white">
    <Sidebar bind:isMobileMenuOpen />

    <!-- Main Content Area -->
    <main
      class="flex-1 overflow-y-auto lg:ml-60 bg-gray-50"
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
