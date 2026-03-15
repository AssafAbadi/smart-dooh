/**
 * Notification types for push payloads. Extend for future features (messages, mini-games, promotions).
 */
export type NotificationType = 'EMERGENCY_ALERT' | 'MESSAGE' | 'MINI_GAME' | 'PROMOTION';

/**
 * Payload for a single push notification. Data.type discriminates handling on the client.
 */
export interface PushNotificationPayload {
  title: string;
  body: string;
  data: { type: NotificationType; [key: string]: unknown };
  priority?: 'default' | 'normal' | 'high';
  sound?: 'default' | null;
  channelId?: string;
  ttl?: number;
  badge?: number;
}

export interface PushNotificationItem {
  token: string;
  payload: PushNotificationPayload;
}
