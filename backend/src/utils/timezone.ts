/**
 * Timezone utilities for handling Almaty (UTC+6) timezone
 */

/**
 * Get current date in Almaty timezone (YYYY-MM-DD)
 */
export function getAlmatyDate(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Almaty' });
}

/**
 * Check if Almaty date is different from UTC date
 * (Happens around midnight UTC when Almaty is already next day)
 */
export function isAlmatyDateDifferentFromUTC(): boolean {
  const almatyDate = getAlmatyDate();
  const utcDate = new Date().toISOString().split('T')[0];
  return almatyDate !== utcDate;
}

/**
 * Get yesterday's date in Almaty timezone
 */
export function getYesterdayAlmaty(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getAlmatyDate(yesterday);
}

/**
 * Get last week range in Almaty timezone
 */
export function getLastWeekRangeAlmaty() {
  const today = new Date();
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - today.getDay() - 6);
  
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  
  return {
    startDate: getAlmatyDate(lastMonday),
    endDate: getAlmatyDate(lastSunday)
  };
}

/**
 * Convert UTC timestamp to Almaty timezone string
 */
export function formatAlmatyTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleString('ru-RU', { 
    timeZone: 'Asia/Almaty',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
