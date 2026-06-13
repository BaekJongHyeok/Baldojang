-- 알림톡은 opt-out 모델: 기본 활성화
-- 기존 샵 백필 + 기본값 변경
update shops set notification_enabled = true where notification_enabled = false;
alter table shops alter column notification_enabled set default true;
