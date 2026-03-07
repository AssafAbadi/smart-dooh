import { Injectable } from '@nestjs/common';

const ISRAEL_TZ = 'Asia/Jerusalem';
const WEEKDAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface IsraelTime {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday (Israeli week)
  hour: number; // 0-23
  minute: number; // 0-59
}

/**
 * Single source of truth for server-side "time of day" in Israel.
 * All business logic that depends on Israeli time bands (e.g. morning rush 07:30–09:30)
 * should use this service so behavior is correct regardless of server TZ.
 */
@Injectable()
export class TimeService {
  /**
   * Returns current date/time components in Asia/Jerusalem.
   * Uses Intl (no extra dependency).
   */
  getIsraelNow(): IsraelTime {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ISRAEL_TZ,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'short',
    });
    const parts = formatter.formatToParts(now);
    let dayOfWeek = 0;
    let hour = 0;
    let minute = 0;
    for (const p of parts) {
      if (p.type === 'weekday') {
        const idx = WEEKDAY_ORDER.indexOf(p.value as (typeof WEEKDAY_ORDER)[number]);
        dayOfWeek = idx >= 0 ? idx : 0;
      }
      if (p.type === 'hour') hour = parseInt(p.value, 10);
      if (p.type === 'minute') minute = parseInt(p.value, 10);
    }
    return { dayOfWeek, hour, minute };
  }
}
