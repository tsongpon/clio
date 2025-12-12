<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { Home, Rss, LogOut, User, Menu, X, Bookmark } from "lucide-svelte";
  import { getUser, removeToken } from "$lib/utils/auth";
  import Button from "./ui/button/Button.svelte";
  import { subscriptionsStore } from "$lib/stores/subscriptions";
  import { onMount } from "svelte";
  import logo from "$lib/assets/logo.svg";

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
  class="fixed bottom-6 right-6 z-50 lg:hidden rounded-full bg-[#FF6600] p-4 shadow-lg hover:bg-[#FF8533] transition-colors"
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
  class="fixed left-0 top-0 h-full w-60 bg-white flex flex-col transition-transform duration-300 z-40 overflow-y-auto {isMobileMenuOpen
    ? 'translate-x-0'
    : '-translate-x-full lg:translate-x-0'}"
>
  <!-- Logo/Brand Section -->
  <div class="px-6 py-6 flex items-center justify-center">
    <button
      onclick={() => {
        if ($page.url.pathname === "/") {
          window.location.reload();
        } else {
          goto("/");
        }
      }}
      class="flex items-center hover:opacity-80 transition-opacity"
      aria-label="Reload feed"
    >
      <img src={logo} alt="feedit.live" class="h-10" />
    </button>
  </div>

  <!-- Navigation Links -->
  <nav class="flex-1 px-3">
    <ul class="space-y-0.5">
      {#each navItems as item}
        {@const Icon = item.icon}
        <li>
          <button
            onclick={() => navigateTo(item.path)}
            class="w-full flex items-center gap-6 px-3 py-2.5 rounded-lg transition-colors text-sm {isActive(
              item.path,
            )
              ? 'bg-gray-100 font-medium'
              : 'hover:bg-gray-100'}"
          >
            <Icon class="h-5 w-5 flex-shrink-0" />
            <span>{item.label}</span>
          </button>
        </li>
      {/each}
    </ul>

    <!-- Divider -->
    <div class="border-b border-gray-200 my-3"></div>

    <!-- Subscriptions Section -->
    <div>
      <h3 class="px-3 py-2 text-sm font-medium text-gray-700">Subscriptions</h3>
      {#if $subscriptionsStore.length > 0}
        <ul class="space-y-0.5">
          {#each $subscriptionsStore as subscription}
            <li>
              <button
                onclick={() => navigateToSubscriptionFeed(subscription.id)}
                class="w-full flex items-center gap-4 px-3 py-2 rounded-lg transition-colors text-sm {isSubscriptionActive(
                  subscription.id,
                )
                  ? 'bg-gray-100 font-medium'
                  : 'hover:bg-gray-100'}"
                title={subscription.title}
              >
                <div
                  class="w-6 h-6 bg-[#FF6600] rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <Rss class="h-3 w-3 text-white" />
                </div>
                <span class="truncate text-sm">{subscription.title}</span>
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="px-3 py-2 text-xs text-gray-500">No subscriptions yet</p>
      {/if}
    </div>
  </nav>

  <!-- User Profile Section -->
  <div class="border-t border-gray-200 p-3 mt-auto">
    {#if user}
      <button
        onclick={handleLogout}
        class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div
          class="w-8 h-8 bg-[#FF6600] rounded-full flex items-center justify-center flex-shrink-0"
        >
          <User class="h-4 w-4 text-white" />
        </div>
        <div class="flex-1 min-w-0 text-left">
          <p class="text-sm font-medium text-gray-900 truncate">
            {user.name || "User"}
          </p>
          <p class="text-xs text-gray-500 truncate">Logout</p>
        </div>
      </button>
    {/if}
  </div>
</aside>

<!-- Overlay for mobile -->
{#if isMobileMenuOpen}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
    onclick={() => (isMobileMenuOpen = false)}
    role="button"
    aria-label="Close menu"
    tabindex="-1"
  ></div>
{/if}
