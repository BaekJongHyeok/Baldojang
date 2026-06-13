-- 매출 귀속일을 완료 처리 시각이 아닌 시술 제공일(예약일)로 기록
-- 1) 기존 결제·차감 로그의 날짜를 예약일(visited_at)로 소급 보정
-- 2) deduct 함수에 p_service_date 파라미터 추가

-- === 기존 데이터 보정 ===
-- payments: visit_id가 있는 결제의 paid_at을 해당 visit의 visited_at으로
update payments p
set paid_at = v.visited_at
from visits v
where p.visit_id = v.id
  and p.paid_at <> v.visited_at;

-- pass_logs: visit_id가 있는 차감 로그의 created_at을 해당 visit의 visited_at으로
update pass_logs pl
set created_at = v.visited_at
from visits v
where pl.visit_id = v.id
  and pl.created_at <> v.visited_at;

-- === deduct_pass_amount 재생성 ===
drop function if exists deduct_pass_amount(uuid, int, uuid);
create or replace function deduct_pass_amount(
  p_pass_id uuid,
  p_amount int,
  p_visit_id uuid,
  p_service_date timestamptz default now()
)
returns void language plpgsql security definer as $$
declare
  v_balance int;
  v_expires date;
  v_shop_id uuid;
begin
  select balance, expires_at, shop_id into v_balance, v_expires, v_shop_id
  from passes where id = p_pass_id for update;

  if v_balance is null then
    raise exception 'pass not found';
  end if;
  if v_shop_id != (select shop_id from staff where id = auth.uid()) then
    raise exception 'not your shop';
  end if;
  if v_expires is not null and v_expires < current_date then
    raise exception 'pass expired';
  end if;
  if v_balance < p_amount then
    raise exception 'insufficient balance: % < %', v_balance, p_amount;
  end if;

  update passes set balance = balance - p_amount where id = p_pass_id;

  insert into pass_logs (pass_id, visit_id, delta, memo, created_by, created_at)
  values (p_pass_id, p_visit_id, -p_amount, '시술 차감', auth.uid(), p_service_date);
end $$;

-- === deduct_pass_count 재생성 ===
drop function if exists deduct_pass_count(uuid, uuid);
create or replace function deduct_pass_count(
  p_pass_id uuid,
  p_visit_id uuid,
  p_service_date timestamptz default now()
)
returns int language plpgsql security definer as $$
declare
  v_remaining int;
  v_total_count int;
  v_total_amount int;
  v_balance int;
  v_unit_price int;
  v_expires date;
  v_shop_id uuid;
begin
  select remaining, total_count, total_amount, balance, expires_at, shop_id
  into v_remaining, v_total_count, v_total_amount, v_balance, v_expires, v_shop_id
  from passes where id = p_pass_id for update;

  if v_remaining is null then
    raise exception 'pass not found';
  end if;
  if v_shop_id != (select shop_id from staff where id = auth.uid()) then
    raise exception 'not your shop';
  end if;
  if v_expires is not null and v_expires < current_date then
    raise exception 'pass expired';
  end if;
  if v_remaining < 1 then
    raise exception 'no remaining uses';
  end if;

  -- 마지막 사용: 잔여 balance 전액 차감 (반올림 잔액 정리)
  -- 그 외: 회당 단가 (정수 나눗셈)
  if v_remaining = 1 then
    v_unit_price := coalesce(v_balance, 0);
  else
    v_unit_price := coalesce(v_total_amount, 0) / greatest(v_total_count, 1);
  end if;

  update passes set
    remaining = remaining - 1,
    balance = coalesce(balance, 0) - v_unit_price
  where id = p_pass_id;

  insert into pass_logs (pass_id, visit_id, delta, memo, created_by, created_at)
  values (p_pass_id, p_visit_id, -v_unit_price, '횟수 차감', auth.uid(), p_service_date);

  return v_unit_price;
end $$;
