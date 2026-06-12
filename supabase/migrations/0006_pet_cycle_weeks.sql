-- 펫별 재방문 주기 (null이면 시술별/샵 기본값 폴백)
alter table pets add column cycle_weeks int;
