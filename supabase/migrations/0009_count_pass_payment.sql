-- 횟수권 차감 시 금액 잔액도 함께 차감하고, 회당 단가를 반환
-- 기존: remaining만 -1, delta=-1 (단위 없는 카운트)
-- 변경: remaining -1, balance -= unit_price, delta=-unit_price (원 단위), 반환값=unit_price
-- 반환 타입이 void → int로 변경되므로 drop 필수
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
  v_unit_price int;
  v_expires date;
  v_shop_id uuid;
begin
  select remaining, total_count, total_amount, expires_at, shop_id
  into v_remaining, v_total_count, v_total_amount, v_expires, v_shop_id
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

  -- 회당 단가: total_amount가 없는 레거시 패스는 0
  v_unit_price := coalesce(v_total_amount, 0) / greatest(v_total_count, 1);

  update passes set
    remaining = remaining - 1,
    balance = coalesce(balance, 0) - v_unit_price
  where id = p_pass_id;

  insert into pass_logs (pass_id, visit_id, delta, memo, created_by)
  values (p_pass_id, p_visit_id, -v_unit_price, '횟수 차감', auth.uid());

  return v_unit_price;
end $$;
