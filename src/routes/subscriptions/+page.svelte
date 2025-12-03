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

<div class="min-h-screen bg-white p-4 lg:p-6">
  <!-- Notification Toast -->
  {#if notification}
    <div
      class={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-md z-50 flex items-center gap-2 animate-slide-in ${
        notification.type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {#if notification.type === "success"}
        <Rss class="w-4 h-4" />
      {:else}
        <AlertCircle class="w-4 h-4" />
      {/if}
      <span class="text-sm">{notification.message}</span>
    </div>
  {/if}

  <div class="mx-auto max-w-7xl">
    <!-- Page Header -->
    <div class="mb-4">
      <h1 class="text-2xl font-semibold text-gray-900">Subscriptions</h1>
    </div>

    <!-- Add Subscription Form -->
    <div class="border border-gray-200 rounded-lg p-4 mb-4">
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
          class="flex-1 h-9 rounded-md"
          disabled={isAddingFeed}
        />
        <Button
          onclick={addSubscription}
          disabled={isAddingFeed || !newFeedUrl.trim()}
          class="h-9 px-3 bg-gray-900 hover:bg-gray-800 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
            <span>Add</span>
          {/if}
        </Button>
      </div>
    </div>

    <!-- Subscriptions List -->
    <div class="space-y-2">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-base font-medium text-gray-900">
          Your Subscriptions ({subscriptions.length})
        </h2>
      </div>

      {#if isLoading}
        <div class="border border-gray-200 rounded-lg p-6">
          <div class="flex items-center justify-center gap-2">
            <div
              class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"
            ></div>
            <span class="text-sm text-gray-600">Loading subscriptions...</span>
          </div>
        </div>
      {:else if subscriptions.length === 0}
        <div class="border border-gray-200 rounded-lg p-8 text-center">
          <div
            class="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
          >
            <Rss class="w-5 h-5 text-gray-400" />
          </div>
          <p class="text-gray-600 text-sm">No subscriptions yet</p>
          <p class="text-gray-400 text-xs mt-1">
            Add your first RSS feed above!
          </p>
        </div>
      {:else}
        <!-- Subscription Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          {#each subscriptions as subscription (subscription.id)}
            <div
              class="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors p-3"
            >
              <!-- Header -->
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1 min-w-0">
                  <h3 class="text-base font-medium text-gray-900 mb-1 truncate">
                    {subscription.title}
                  </h3>
                  {#if subscription.description}
                    <p class="text-xs text-gray-600 mb-2 line-clamp-2">
                      {subscription.description}
                    </p>
                  {/if}
                </div>
              </div>

              <!-- Feed URL -->
              <div class="mb-2">
                <button
                  onclick={() => openUrl(subscription.feed_url)}
                  class="text-xs text-gray-600 hover:text-gray-900 hover:underline flex items-center gap-1 truncate max-w-full"
                >
                  <ExternalLink class="w-3 h-3 flex-shrink-0" />
                  <span class="truncate">{subscription.feed_url}</span>
                </button>
              </div>

              <!-- Metadata -->
              <div class="space-y-1 mb-3 text-xs text-gray-500">
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
                class="flex items-center gap-2 pt-2 border-t border-gray-100"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={(e) => {
                    e.stopPropagation();
                    removeSubscription(subscription.id);
                  }}
                  class="flex-1 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors text-xs"
                  aria-label="Unsubscribe"
                >
                  <UserMinus class="w-3 h-3 mr-1" />
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
