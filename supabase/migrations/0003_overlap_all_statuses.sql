-- 겹침 제약 변경: cancelled 제외 모든 상태가 시간 슬롯 점유
-- 기존: confirmed만 차단 → 변경: confirmed + completed + no_show 차단

alter table reservations drop constraint no_overlap;

alter table reservations add constraint no_overlap
  exclude using gist (
    shop_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status != 'cancelled');
