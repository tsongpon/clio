<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Card } from "$lib/components/ui/card";
  import {
    Rss,
    UserMinus,
    ExternalLink,
    Plus,
    AlertCircle,
  } from "lucide-svelte";
  import {
    authenticatedFetch,
    isAuthenticated,
    removeToken,
  } from "$lib/utils/auth";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { API_BASE_URL } from "$lib/config";
  import type { RSSSubscription } from "$lib/types/subscription";
  import { subscriptionsStore } from "$lib/stores/subscriptions";

  let subscriptions = $state<RSSSubscription[]>([]);
  let nextCursor = $state<string | null>(null);
  let hasMore = $state<boolean>(false);
  let isLoading = $state<boolean>(false);
  let newFeedUrl = $state<string>("");
  let isAddingFeed = $state<boolean>(false);
  let notification = $state<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  let notificationTimeout: number | null = null;

  function handleAuthError(): void {
    removeToken();
    goto("/login");
  }

  onMount(() => {
    if (!isAuthenticated()) {
      goto("/login");
      return;
    }

    fetchSubscriptions();
  });

  async function fetchSubscriptions(): Promise<void> {
    if (isLoading) return;

    isLoading = true;
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/subscriptions`,
      );

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        showNotification(
          `Failed to fetch subscriptions: ${response.status}`,
          "error",
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      subscriptions = data.data || [];
      nextCursor = data.next_cursor;
      hasMore = data.has_more;
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
    } finally {
      isLoading = false;
    }
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
      const response = await authenticatedFetch(
        `${API_BASE_URL}/subscriptions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ feed_url: formattedUrl }),
        },
      );

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        showNotification(
          `Failed to add subscription: ${response.status}`,
          "error",
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      newFeedUrl = "";
      showNotification("Subscription added successfully!", "success");
      await fetchSubscriptions();
      // Update the global subscriptions store so sidebar updates
      subscriptionsStore.refresh();
    } catch (error) {
      console.error("Failed to add subscription:", error);
      showNotification("Failed to add subscription", "error");
    } finally {
      isAddingFeed = false;
    }
  }

  async function removeSubscription(id: string): Promise<void> {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/subscriptions`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ subscription_id: id }),
        },
      );

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        showNotification(
          `Failed to remove subscription: ${response.status}`,
          "error",
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      showNotification("Subscription removed successfully!", "success");
      await fetchSubscriptions();
      // Update the global subscriptions store so sidebar updates
      subscriptionsStore.refresh();
    } catch (error) {
      console.error("Failed to remove subscription:", error);
      // Mock behavior - remove locally
      subscriptions = subscriptions.filter((s) => s.id !== id);
    }
  }

  function showNotification(
    message: string,
    type: "success" | "error" = "success",
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
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
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
    <!-- Page Header -->
    <div class="mb-6">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center gap-4">
          <div class="text-4xl">📡</div>
          <div>
            <h1 class="text-3xl font-bold text-gray-900">RSS Subscriptions</h1>
            <p class="text-sm text-gray-600 mt-1">
              Manage your RSS feed subscriptions and stay updated
            </p>
          </div>
        </div>
      </div>
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
                {#if subscription.latest_update}
                  <div class="flex items-center gap-2">
                    <span class="font-medium">Last fetched:</span>
                    <span>{formatDate(subscription.latest_update)}</span>
                  </div>
                {/if}
                {#if subscription.fetch_frequency_minutes}
                  <div class="flex items-center gap-2">
                    <span class="font-medium">Update frequency:</span>
                    <span
                      >Every {subscription.fetch_frequency_minutes} minutes</span
                    >
                  </div>
                {/if}
              </div>

              <!-- Actions -->
              <div
                class="flex items-center gap-2 pt-3 border-t border-slate-100"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={(e) => {
                    e.stopPropagation();
                    removeSubscription(subscription.id);
                  }}
                  class="flex-1 h-9 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all"
                  aria-label="Unsubscribe"
                >
                  <UserMinus class="w-4 h-4 mr-1" />
                  Unsubscribe
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
