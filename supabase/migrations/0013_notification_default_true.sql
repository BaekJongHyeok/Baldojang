-- 알림톡은 opt-out 모델: 신규 샵은 기본 활성화
-- 기존 샵 백필은 하지 않음 (의도적으로 끈 설정을 덮어쓰면 안 됨)
-- 이미 false로 채워진 기존 샵은 설정 UI에서 수동 활성화
alter table shops alter column notification_enabled set default true;
