/**
 * RSS Feed Subscription Types
 */

export interface RSSSubscription {
  id: string;
  title: string;
  url: string;
  feed_url: string;
  image?: string;
  description?: string;
  latest_update?: string;
  created_at: string;
  // Legacy fields that might be deprecated
  user_id?: string;
  is_active?: boolean;
  fetch_frequency_minutes?: number;
}

export interface SubscriptionResponse {
  data: RSSSubscription[];
  next_cursor: string | null;
  has_more: boolean;
}
