<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Card } from "$lib/components/ui/card";
  import {
    Rss,
    User,
    LogOut,
    Trash2,
    ExternalLink,
    Plus,
    RefreshCw,
    Home,
    AlertCircle,
  } from "lucide-svelte";
  import {
    authenticatedFetch,
    isAuthenticated,
    removeToken,
    getUser,
  } from "$lib/utils/auth";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { API_BASE_URL } from "$lib/config";
  import type { RSSSubscription } from "$lib/types/subscription";

  let subscriptions = $state<RSSSubscription[]>([]);
  let showDropdown = $state<boolean>(false);
  let user = $state<any>(null);
  let isLoading = $state<boolean>(false);
  let newFeedUrl = $state<string>("");
  let isAddingFeed = $state<boolean>(false);
  let notification = $state<{ message: string; type: "success" | "error" } | null>(
    null
  );
  let notificationTimeout: number | null = null;

  function handleAuthError(): void {
    removeToken();
    goto("/login");
  }

  function handleLogout(): void {
    removeToken();
    goto("/login");
  }

  function toggleDropdown(): void {
    showDropdown = !showDropdown;
  }

  function closeDropdown(): void {
    showDropdown = false;
  }

  function handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest(".user-dropdown")) {
      closeDropdown();
    }
  }

  onMount(() => {
    if (!isAuthenticated()) {
      goto("/login");
      return;
    }

    user = getUser();
    fetchSubscriptions();

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  });

  async function fetchSubscriptions(): Promise<void> {
    if (isLoading) return;

    isLoading = true;
    try {
      // Mock API endpoint - will be replaced with actual backend
      const response = await authenticatedFetch(
        `${API_BASE_URL}/subscriptions`
      );

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      subscriptions = data.subscriptions || [];
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
      // Mock data for development
      subscriptions = generateMockSubscriptions();
    } finally {
      isLoading = false;
    }
  }

  function generateMockSubscriptions(): RSSSubscription[] {
    return [
      {
        id: "1",
        feed_url: "https://example.com/feed.xml",
        title: "Tech News Daily",
        description: "Latest technology news and updates",
        site_url: "https://example.com",
        user_id: "user123",
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        last_fetched_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        fetch_frequency_minutes: 60,
      },
      {
        id: "2",
        feed_url: "https://blog.example.com/rss",
        title: "Developer Blog",
        description: "Programming tutorials and best practices",
        site_url: "https://blog.example.com",
        user_id: "user123",
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        last_fetched_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        is_active: true,
        fetch_frequency_minutes: 30,
      },
      {
        id: "3",
        feed_url: "https://news.example.org/feed",
        title: "World News",
        description: "Global news coverage",
        site_url: "https://news.example.org",
        user_id: "user123",
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_fetched_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        fetch_frequency_minutes: 120,
      },
    ];
  }

  async function addSubscription(): Promise<void> {
    if (!newFeedUrl.trim() || isAddingFeed) return;

    let formattedUrl = newFeedUrl.trim();
    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = "https://" + formattedUrl;
    }

    isAddingFeed = true;

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feed_url: formattedUrl }),
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      newFeedUrl = "";
      showNotification("Subscription added successfully!", "success");
      await fetchSubscriptions();
    } catch (error) {
      console.error("Failed to add subscription:", error);
      // Mock behavior - add locally
      const newSub: RSSSubscription = {
        id: Date.now().toString(),
        feed_url: formattedUrl,
        title: extractDomainName(formattedUrl),
        description: "New RSS feed subscription",
        site_url: formattedUrl,
        user_id: user?.id || "user123",
        created_at: new Date().toISOString(),
        is_active: true,
        fetch_frequency_minutes: 60,
      };
      subscriptions = [newSub, ...subscriptions];
      newFeedUrl = "";
      showNotification("Subscription added (mock)", "success");
    } finally {
      isAddingFeed = false;
    }
  }

  async function removeSubscription(id: string): Promise<void> {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/subscriptions/${id}`,
        {
          method: "DELETE",
        }
      );

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      showNotification("Subscription removed successfully!", "success");
      await fetchSubscriptions();
    } catch (error) {
      console.error("Failed to remove subscription:", error);
      // Mock behavior - remove locally
      subscriptions = subscriptions.filter((s) => s.id !== id);
      showNotification("Subscription removed (mock)", "success");
    }
  }

  async function refreshSubscription(id: string): Promise<void> {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/subscriptions/${id}/refresh`,
        {
          method: "POST",
        }
      );

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      showNotification("Feed refreshed successfully!", "success");
      await fetchSubscriptions();
    } catch (error) {
      console.error("Failed to refresh subscription:", error);
      // Mock behavior - update last_fetched_at
      subscriptions = subscriptions.map((s) =>
        s.id === id ? { ...s, last_fetched_at: new Date().toISOString() } : s
      );
      showNotification("Feed refreshed (mock)", "success");
    }
  }

  function showNotification(
    message: string,
    type: "success" | "error" = "success"
  ): void {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }

    notification = { message, type };

    notificationTimeout = setTimeout(() => {
      notification = null;
      notificationTimeout = null;
    }, 3000);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function extractDomainName(url: string): string {
    try {
      const urlObject = new URL(url);
      return urlObject.hostname.replace("www.", "");
    } catch {
      return url;
    }
  }

  function openUrl(url: string): void {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function goHome(): void {
    goto("/");
  }
</script>

<div
  class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 md:p-4"
>
  <!-- Notification Toast -->
  {#if notification}
    <div
      class={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-slide-in ${
        notification.type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {#if notification.type === "success"}
        <Rss class="w-5 h-5" />
      {:else}
        <AlertCircle class="w-5 h-5" />
      {/if}
      <span class="font-medium">{notification.message}</span>
    </div>
  {/if}

  <div class="mx-auto max-w-7xl">
    <!-- Header -->
    <div class="mb-4 bg-white rounded-lg shadow p-4">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <Button
            onclick={goHome}
            variant="ghost"
            size="sm"
            class="p-2 hover:bg-slate-100 rounded-lg"
            aria-label="Go to home"
          >
            <Home class="w-5 h-5 text-slate-600" />
          </Button>
          <div class="bg-orange-600 p-2 rounded-lg">
            <Rss class="w-5 h-5 text-white" />
          </div>
          <h1
            class="text-balance text-2xl font-bold tracking-tight text-slate-900"
          >
            RSS Subscriptions
          </h1>
        </div>

        <!-- User Profile Dropdown -->
        <div class="relative user-dropdown">
          <button
            onclick={toggleDropdown}
            class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="User menu"
          >
            <div class="bg-blue-600 p-2 rounded-full">
              <User class="w-4 h-4 text-white" />
            </div>
            {#if user?.name}
              <span class="text-sm font-medium text-slate-700 hidden sm:block">
                {user.name}
              </span>
            {/if}
          </button>

          {#if showDropdown}
            <div
              class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10"
            >
              {#if user?.email}
                <div class="px-4 py-2 border-b border-slate-200">
                  <p class="text-xs text-slate-500">Signed in as</p>
                  <p class="text-sm font-medium text-slate-900 truncate">
                    {user.email}
                  </p>
                </div>
              {/if}

              <button
                onclick={handleLogout}
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <LogOut class="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          {/if}
        </div>
      </div>
      <p class="text-slate-600 text-sm ml-[44px]">
        Manage your RSS feed subscriptions
      </p>
    </div>

    <!-- Add Subscription Form -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex gap-2">
        <Input
          id="subscription-input"
          type="text"
          placeholder="Enter RSS feed URL (e.g., https://example.com/feed.xml)"
          bind:value={newFeedUrl}
          onkeypress={(e) => {
            if (e.key === "Enter") {
              addSubscription();
            }
          }}
          class="flex-1 h-10 rounded-lg"
          disabled={isAddingFeed}
        />
        <Button
          onclick={addSubscription}
          disabled={isAddingFeed || !newFeedUrl.trim()}
          class="h-10 px-4 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isAddingFeed}
            <div class="flex items-center gap-2">
              <div
                class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"
              ></div>
              <span>Adding...</span>
            </div>
          {:else}
            <Plus class="w-4 h-4 mr-1" />
            <span>Add Subscription</span>
          {/if}
        </Button>
      </div>
    </div>

    <!-- Subscriptions List -->
    <div class="space-y-2">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-lg font-semibold text-slate-900">
          Your Subscriptions ({subscriptions.length})
        </h2>
      </div>

      {#if isLoading}
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-center gap-3">
            <div
              class="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"
            ></div>
            <span class="text-sm text-slate-600">Loading subscriptions...</span>
          </div>
        </div>
      {:else if subscriptions.length === 0}
        <div class="bg-white rounded-lg shadow p-8 text-center">
          <div
            class="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <Rss class="w-6 h-6 text-slate-400" />
          </div>
          <p class="text-slate-600 font-medium text-sm">No subscriptions yet</p>
          <p class="text-slate-400 text-xs mt-1">
            Add your first RSS feed above!
          </p>
        </div>
      {:else}
        <!-- Subscription Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each subscriptions as subscription (subscription.id)}
            <div
              class="bg-white rounded-lg shadow hover:shadow-lg transition-all p-4"
            >
              <!-- Header -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1 min-w-0">
                  <h3
                    class="text-lg font-semibold text-slate-900 mb-1 truncate"
                  >
                    {subscription.title}
                  </h3>
                  {#if subscription.description}
                    <p class="text-sm text-slate-600 mb-2 line-clamp-2">
                      {subscription.description}
                    </p>
                  {/if}
                </div>
                <div
                  class={`ml-2 px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                    subscription.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {subscription.is_active ? "Active" : "Inactive"}
                </div>
              </div>

              <!-- Feed URL -->
              <div class="mb-3">
                <button
                  onclick={() => openUrl(subscription.feed_url)}
                  class="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 truncate max-w-full"
                >
                  <ExternalLink class="w-3 h-3 flex-shrink-0" />
                  <span class="truncate">{subscription.feed_url}</span>
                </button>
              </div>

              <!-- Metadata -->
              <div class="space-y-1 mb-4 text-xs text-slate-500">
                <div class="flex items-center gap-2">
                  <span class="font-medium">Added:</span>
                  <span>{formatDate(subscription.created_at)}</span>
                </div>
                {#if subscription.last_fetched_at}
                  <div class="flex items-center gap-2">
                    <span class="font-medium">Last fetched:</span>
                    <span>{formatDate(subscription.last_fetched_at)}</span>
                  </div>
                {/if}
                {#if subscription.fetch_frequency_minutes}
                  <div class="flex items-center gap-2">
                    <span class="font-medium">Update frequency:</span>
                    <span>Every {subscription.fetch_frequency_minutes} minutes</span>
                  </div>
                {/if}
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2 pt-3 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={(e) => {
                    e.stopPropagation();
                    refreshSubscription(subscription.id);
                  }}
                  class="flex-1 h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all"
                  aria-label="Refresh feed"
                >
                  <RefreshCw class="w-4 h-4 mr-1" />
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={(e) => {
                    e.stopPropagation();
                    removeSubscription(subscription.id);
                  }}
                  class="flex-1 h-9 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all"
                  aria-label="Delete subscription"
                >
                  <Trash2 class="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
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

  :global(.animate-slide-in) {
    animation: slide-in 0.3s ease-out;
  }
</style>
