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
  class="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 z-40 {isMobileMenuOpen
    ? 'translate-x-0'
    : '-translate-x-full lg:translate-x-0'}"
>
  <!-- Logo/Brand Section -->
  <div class="px-4 py-3 border-b-2 border-[#FF6600]">
    <button
      onclick={() => {
        if ($page.url.pathname === "/") {
          window.location.reload();
        } else {
          goto("/");
        }
      }}
      class="flex items-center w-full hover:opacity-80 transition-opacity"
      aria-label="Reload feed"
    >
      <img src={logo} alt="feedit.live" class="h-8" />
    </button>
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
              ? 'bg-[#FF6600] text-white font-semibold'
              : 'text-gray-700 hover:bg-[#FFE6D5]'}"
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
          class="px-4 text-xs font-bold text-[#FF6600] uppercase tracking-wider mb-2"
        >
          Subscriptions
        </h3>
        <ul class="space-y-1">
          {#each $subscriptionsStore as subscription}
            <li>
              <button
                onclick={() => navigateToSubscriptionFeed(subscription.id)}
                class="w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors {isSubscriptionActive(
                  subscription.id,
                )
                  ? 'bg-[#FF6600] text-white font-semibold'
                  : 'text-gray-700 hover:bg-[#FFE6D5]'}"
                title={subscription.title}
              >
                <Rss class="h-3 w-3 flex-shrink-0" />
                <span class="truncate text-xs">{subscription.title}</span>
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </nav>

  <!-- User Profile Section -->
  <div class="p-4 border-t-2 border-[#FF6600]">
    {#if user}
      <div class="mb-3 px-2">
        <div class="flex items-center gap-3 mb-2">
          <div
            class="w-10 h-10 bg-[#FF6600] rounded-full flex items-center justify-center"
          >
            <User class="h-5 w-5 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">
              {user.name || "User"}
            </p>
            <p class="text-xs text-gray-500 truncate">{user.email || ""}</p>
          </div>
        </div>
      </div>
      <Button
        onclick={handleLogout}
        variant="ghost"
        class="w-full justify-start gap-2 hover:bg-[#FFE6D5] hover:text-[#FF6600] font-medium"
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
