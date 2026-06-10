import { toZonedTime, formatInTimeZone } from "date-fns-tz";

const KST = "Asia/Seoul";

/** ISO timestamptz → KST 시·분 (타임라인 좌표 계산용) */
export function kstHourMin(iso: string): { hours: number; minutes: number } {
  const zoned = toZonedTime(new Date(iso), KST);
  return { hours: zoned.getHours(), minutes: zoned.getMinutes() };
}

/** ISO timestamptz → KST 날짜 문자열 (YYYY-MM-DD) */
export function kstDateStr(iso: string): string {
  return formatInTimeZone(new Date(iso), KST, "yyyy-MM-dd");
}

/** YYYY-MM-DD → 요일 키 (mon~sun), 시간대 무관 */
export function dateToDayKey(dateStr: string): string {
  const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const d = new Date(dateStr + "T00:00:00Z");
  return keys[d.getUTCDay()];
}

/** 현재 KST 날짜 문자열 */
export function todayKST(): string {
  return formatInTimeZone(new Date(), KST, "yyyy-MM-dd");
}

/** YYYY-MM-DD → KST 포맷 문자열 */
export function formatDateKST(dateStr: string, fmt: string): string {
  return formatInTimeZone(new Date(dateStr + "T00:00:00Z"), KST, fmt);
}

/** ISO timestamptz → KST 포맷 문자열 */
export function formatTimestampKST(iso: string, fmt: string): string {
  return formatInTimeZone(new Date(iso), KST, fmt);
}

/** 현재 KST 시·분 (현재 시각 라인용) */
export function nowKSTMinutes(): number {
  const zoned = toZonedTime(new Date(), KST);
  return zoned.getHours() * 60 + zoned.getMinutes();
}
