-- 선불권 사용 중지 (null이면 활성, 값 있으면 중지된 시각)
alter table passes add column disabled_at timestamptz;
