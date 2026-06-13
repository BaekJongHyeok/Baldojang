-- 횟수권 마지막 사용 시 반올림 잔액을 정리
-- 기존: unit_price = total_amount / total_count (정수 나눗셈, 나머지 유실)
--   예: 100,000 / 3 = 33,333 → 3회 사용 후 잔액 1원 유령 부채
-- 변경: 마지막 사용(remaining=1)일 때 잔여 balance 전액 차감
drop function if exists deduct_pass_count(uuid, uuid);
create or replace function deduct_pass_count(
  p_pass_id uuid,
  p_visit_id uuid
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

  insert into pass_logs (pass_id, visit_id, delta, memo, created_by)
  values (p_pass_id, p_visit_id, -v_unit_price, '횟수 차감', auth.uid());

  return v_unit_price;
end $$;
