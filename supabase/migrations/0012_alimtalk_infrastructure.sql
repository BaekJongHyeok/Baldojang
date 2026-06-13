-- 알림톡 발송 인프라: notifications 테이블 확장 + shops 알림 설정

-- 1) notification_status enum에 'skipped' 추가 (테스트 모드용)
alter type notification_status add value if not exists 'skipped';

-- 2) notifications 테이블 확장
alter table notifications
  add column if not exists type text not null default 'confirm',
  add column if not exists recipient_phone text,
  add column if not exists payload jsonb;

-- 기존 template_code를 nullable로 (테스트 모드에선 미지정)
alter table notifications alter column template_code drop not null;

-- 멱등성: 같은 예약+타입 조합 중복 방지
create unique index if not exists idx_notifications_reservation_type
  on notifications (reservation_id, type)
  where reservation_id is not null;

-- 3) shops 테이블에 알림 설정 컬럼 추가
alter table shops
  add column if not exists notification_enabled boolean not null default false,
  add column if not exists reminder_hour int not null default 18;
