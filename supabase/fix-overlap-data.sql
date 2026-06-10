-- 기존 겹침 데이터 정리: 완료/노쇼 예약의 ends_at을 다음 예약 starts_at까지로 축소
-- 실행 전 SELECT로 확인 후 UPDATE 실행 권장

-- 확인용 (어떤 예약이 수정되는지 미리 보기)
SELECT
  r1.id,
  r1.status,
  r1.starts_at,
  r1.ends_at AS current_ends_at,
  r2.starts_at AS next_starts_at,
  r2.status AS next_status
FROM reservations r1
JOIN reservations r2
  ON r1.shop_id = r2.shop_id
  AND r1.id != r2.id
  AND r2.status != 'cancelled'
  AND r1.starts_at < r2.starts_at
  AND r1.ends_at > r2.starts_at  -- 겹침
WHERE r1.status IN ('completed', 'no_show')
ORDER BY r1.starts_at;

-- 실제 수정 (위 SELECT 결과를 확인한 후 실행)
UPDATE reservations r1
SET ends_at = (
  SELECT MIN(r2.starts_at)
  FROM reservations r2
  WHERE r2.shop_id = r1.shop_id
    AND r2.id != r1.id
    AND r2.status != 'cancelled'
    AND r2.starts_at > r1.starts_at
    AND r2.starts_at < r1.ends_at
)
WHERE r1.status IN ('completed', 'no_show')
  AND EXISTS (
    SELECT 1 FROM reservations r2
    WHERE r2.shop_id = r1.shop_id
      AND r2.id != r1.id
      AND r2.status != 'cancelled'
      AND r2.starts_at > r1.starts_at
      AND r2.starts_at < r1.ends_at
  );
