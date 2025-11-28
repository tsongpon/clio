<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { Home, Rss, LogOut, User, Menu, X, Bookmark } from "lucide-svelte";
  import { getUser, removeToken } from "$lib/utils/auth";
  import Button from "./ui/button/Button.svelte";
  import { subscriptionsStore } from "$lib/stores/subscriptions";
  import { onMount } from "svelte";

  let { isMobileMenuOpen = $bindable(false) } = $props();

  const user = $derived(getUser());

  const navItems = [
    { path: "/", icon: Home, label: "Feed" },
    { path: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
    { path: "/subscriptions", icon: Rss, label: "Subscriptions" },
  ];

  onMount(() => {
    subscriptionsStore.fetch();
  });

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
</script>

<!-- Mobile Menu Toggle Button -->
<button
  class="fixed top-4 left-4 z-50 lg:hidden rounded-lg bg-white p-2 shadow-md border border-gray-200"
  onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
  aria-label="Toggle menu"
>
  {#if isMobileMenuOpen}
    <X class="h-6 w-6 text-gray-700" />
  {:else}
    <Menu class="h-6 w-6 text-gray-700" />
  {/if}
</button>

<!-- Sidebar -->
<aside
  class="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 z-40 {isMobileMenuOpen
    ? 'translate-x-0'
    : '-translate-x-full lg:translate-x-0'}"
>
  <!-- Logo/Brand Section -->
  <div class="p-6 border-b border-gray-200">
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center"
      >
        <Rss class="h-6 w-6 text-white" />
      </div>
      <div>
        <h1 class="text-xl font-bold text-gray-900">Clio</h1>
        <p class="text-xs text-gray-500">RSS Feed Reader</p>
      </div>
    </div>
  </div>

  <!-- Navigation Links -->
  <nav class="flex-1 p-4 overflow-y-auto">
    <ul class="space-y-1">
      {#each navItems as item}
        {@const Icon = item.icon}
        <li>
          <button
            onclick={() => navigateTo(item.path)}
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {isActive(
              item.path,
            )
              ? 'bg-blue-50 text-blue-600 font-medium'
              : 'text-gray-700 hover:bg-gray-50'}"
          >
            <Icon class="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        </li>
      {/each}
    </ul>

    <!-- Subscriptions Section -->
    {#if $subscriptionsStore.length > 0}
      <div class="mt-6">
        <h3
          class="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
        >
          Subscriptions
        </h3>
        <ul class="space-y-1">
          {#each $subscriptionsStore as subscription}
            <li>
              <button
                onclick={() => navigateToSubscriptionFeed(subscription.id)}
                class="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors {isSubscriptionActive(
                  subscription.id,
                )
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'}"
                title={subscription.title}
              >
                <Rss class="h-4 w-4 flex-shrink-0" />
                <span class="truncate text-sm">{subscription.title}</span>
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </nav>

  <!-- User Profile Section -->
  <div class="p-4 border-t border-gray-200">
    {#if user}
      <div class="mb-3 px-2">
        <div class="flex items-center gap-3 mb-2">
          <div
            class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"
          >
            <User class="h-5 w-5 text-gray-600" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">
              {user.name || "User"}
            </p>
            <p class="text-xs text-gray-500 truncate">{user.email || ""}</p>
          </div>
        </div>
      </div>
      <Button
        onclick={handleLogout}
        variant="ghost"
        class="w-full justify-start gap-2"
      >
        <LogOut class="h-4 w-4" />
        Logout
      </Button>
    {/if}
  </div>
</aside>

<!-- Overlay for mobile -->
{#if isMobileMenuOpen}
  <button
    class="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden cursor-default"
    onclick={() => (isMobileMenuOpen = false)}
    aria-label="Close menu"
    tabindex="-1"
  ></button>
{/if}
