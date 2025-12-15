import { writable } from "svelte/store";
import type { RSSSubscription } from "$lib/types/subscription";
import { authenticatedFetch } from "$lib/utils/auth";
import { API_BASE_URL } from "$lib/config";

function createSubscriptionsStore() {
  const { subscribe, set, update } = writable<RSSSubscription[]>([]);

  return {
    subscribe,
    set,
    update,
    async fetch() {
      try {
        const response = await authenticatedFetch(
          `${API_BASE_URL}/subscriptions`,
        );

        if (response.status === 401) {
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        set(data.data || []);
      } catch (error) {
        console.error("Failed to fetch subscriptions:", error);
      }
    },
    async refresh() {
      await this.fetch();
    },
  };
}

function createSubscriptionsLoadingStore() {
  const { subscribe, set } = writable<boolean>(true);

  return {
    subscribe,
    setLoading: (loading: boolean) => set(loading),
  };
}

export const subscriptionsStore = createSubscriptionsStore();
export const subscriptionsLoadingStore = createSubscriptionsLoadingStore();
