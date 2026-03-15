import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import type { PushNotificationItem, PushNotificationPayload } from './interfaces/push-notification.interface';

const expoPushTokenSchema = z
  .string()
  .min(1)
  .refine(
    (s) => s.startsWith('ExponentPushToken[') && s.endsWith(']'),
    'Invalid Expo push token format',
  );

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private expo: import('expo-server-sdk').Expo | null = null;

  private getExpo(): import('expo-server-sdk').Expo {
    if (!this.expo) {
      const Expo = require('expo-server-sdk').Expo as new () => import('expo-server-sdk').Expo;
      this.expo = new Expo();
    }
    return this.expo as import('expo-server-sdk').Expo;
  }

  /**
   * Send a single push notification. Token is validated with Zod.
   */
  async send(token: string, payload: PushNotificationPayload): Promise<void> {
    const result = await this.sendBatch([{ token, payload }]);
    if (result.invalidCount > 0) {
      throw new Error(`Invalid push token: ${token}`);
    }
    if (result.failureCount > 0) {
      throw new Error(`Failed to send push to ${token}`);
    }
  }

  /**
   * Send push notifications in batch. Chunks into groups of 100 (Expo limit).
   * Uses Promise.allSettled per chunk and logs success/failure/invalid counts.
   */
  async sendBatch(items: PushNotificationItem[]): Promise<{ sent: number; failureCount: number; invalidCount: number }> {
    const valid: Array<{ token: string; payload: PushNotificationPayload }> = [];
    let invalidCount = 0;

    for (const { token, payload } of items) {
      const parsed = expoPushTokenSchema.safeParse(token);
      if (!parsed.success) {
        this.logger.warn({ tokenPreview: token.slice(0, 30), msg: 'Invalid push token skipped', errors: parsed.error.flatten() });
        invalidCount++;
        continue;
      }
      valid.push({ token: parsed.data, payload });
    }

    if (valid.length === 0) {
      this.logger.debug({ msg: 'No valid tokens to send', invalidCount });
      return { sent: 0, failureCount: 0, invalidCount };
    }

    const expo = this.getExpo();
    const messages = valid.map(({ token, payload }) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: payload.sound ?? 'default',
      priority: payload.priority ?? 'high',
      channelId: payload.channelId,
      ttl: payload.ttl,
      badge: payload.badge,
    }));

    const chunks = expo.chunkPushNotifications(messages);
    let sent = 0;
    let failureCount = 0;

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        for (const ticket of tickets) {
          const t = ticket as { status?: string; message?: string; details?: unknown };
          if (t?.status === 'ok') {
            sent++;
          } else {
            failureCount++;
            this.logger.warn({
              msg: 'Expo push ticket error',
              message: t?.message,
              details: t?.details,
            });
          }
        }
      } catch (err) {
        failureCount += chunk.length;
        this.logger.error({ msg: 'Expo send chunk failed', error: err instanceof Error ? err.message : String(err) });
      }
    }

    this.logger.log({
      msg: 'Push batch completed',
      sent,
      failureCount,
      invalidCount,
      totalRequested: items.length,
    });
    return { sent, failureCount, invalidCount };
  }
}
