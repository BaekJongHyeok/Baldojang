-- notifications 외래키 ON DELETE 동작 설정
-- reservation_id: 예약 삭제 시 알림 레코드도 함께 삭제 (CASCADE)
-- customer_id: 고객 삭제 시 알림은 보존하되 참조만 해제 (SET NULL)

alter table notifications drop constraint notifications_reservation_id_fkey;
alter table notifications add constraint notifications_reservation_id_fkey
  foreign key (reservation_id) references reservations(id) on delete cascade;

alter table notifications drop constraint notifications_customer_id_fkey;
alter table notifications add constraint notifications_customer_id_fkey
  foreign key (customer_id) references customers(id) on delete set null;
