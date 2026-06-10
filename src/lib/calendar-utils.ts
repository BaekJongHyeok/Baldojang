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

/**
 * 겹치는 예약에 col/totalCols을 할당해 나란히 분할 표시
 * 반환: { id, col, totalCols }[]
 */
export function layoutOverlaps(
  items: { id: string; startMin: number; endMin: number }[],
): Map<string, { col: number; totalCols: number }> {
  const result = new Map<string, { col: number; totalCols: number }>();
  if (items.length === 0) return result;

  // 시작 시간순 정렬
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  // 그룹: 연속으로 겹치는 블록들을 하나의 클러스터로 묶기
  const groups: (typeof sorted)[] = [];
  let current = [sorted[0]];
  let groupEnd = sorted[0].endMin;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startMin < groupEnd) {
      current.push(sorted[i]);
      groupEnd = Math.max(groupEnd, sorted[i].endMin);
    } else {
      groups.push(current);
      current = [sorted[i]];
      groupEnd = sorted[i].endMin;
    }
  }
  groups.push(current);

  // 각 그룹 내에서 컬럼 할당
  for (const group of groups) {
    const cols: number[] = []; // 각 컬럼의 끝 시간
    for (const item of group) {
      let placed = false;
      for (let c = 0; c < cols.length; c++) {
        if (item.startMin >= cols[c]) {
          cols[c] = item.endMin;
          result.set(item.id, { col: c, totalCols: 0 }); // totalCols 나중에 설정
          placed = true;
          break;
        }
      }
      if (!placed) {
        result.set(item.id, { col: cols.length, totalCols: 0 });
        cols.push(item.endMin);
      }
    }
    // totalCols = 그룹의 최대 컬럼 수
    const totalCols = cols.length;
    for (const item of group) {
      const layout = result.get(item.id)!;
      layout.totalCols = totalCols;
    }
  }

  return result;
}
