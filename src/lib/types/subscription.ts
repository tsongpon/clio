/**
 * RSS Feed Subscription Types
 */

export interface RSSSubscription {
  id: string;
  feed_url: string;
  title: string;
  description?: string;
  site_url?: string;
  user_id: string;
  created_at: string;
  last_fetched_at?: string;
  is_active: boolean;
  fetch_frequency_minutes?: number;
}

export interface SubscriptionResponse {
  subscriptions: RSSSubscription[];
  total: number;
}
