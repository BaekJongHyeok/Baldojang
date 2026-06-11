-- payments.visit_id를 nullable로 변경 (선불권 판매는 visit 없음)
alter table payments alter column visit_id drop not null;

-- 선불권 금액 차감 (원자적 트랜잭션)
create or replace function deduct_pass_amount(
  p_pass_id uuid,
  p_amount int,
  p_visit_id uuid,
  p_staff_id uuid
)
returns void language plpgsql security definer as $$
declare
  v_balance int;
  v_expires date;
begin
  select balance, expires_at into v_balance, v_expires
  from passes where id = p_pass_id for update;

  if v_balance is null then
    raise exception 'pass not found';
  end if;

  if v_expires is not null and v_expires < current_date then
    raise exception 'pass expired';
  end if;

  if v_balance < p_amount then
    raise exception 'insufficient balance: % < %', v_balance, p_amount;
  end if;

  update passes set balance = balance - p_amount where id = p_pass_id;

  insert into pass_logs (pass_id, visit_id, delta, memo, created_by)
  values (p_pass_id, p_visit_id, -p_amount, '시술 차감', p_staff_id);
end $$;

-- 선불권 횟수 차감 (원자적 트랜잭션)
create or replace function deduct_pass_count(
  p_pass_id uuid,
  p_visit_id uuid,
  p_staff_id uuid
)
returns void language plpgsql security definer as $$
declare
  v_remaining int;
  v_expires date;
begin
  select remaining, expires_at into v_remaining, v_expires
  from passes where id = p_pass_id for update;

  if v_remaining is null then
    raise exception 'pass not found';
  end if;

  if v_expires is not null and v_expires < current_date then
    raise exception 'pass expired';
  end if;

  if v_remaining < 1 then
    raise exception 'no remaining uses';
  end if;

  update passes set remaining = remaining - 1 where id = p_pass_id;

  insert into pass_logs (pass_id, visit_id, delta, memo, created_by)
  values (p_pass_id, p_visit_id, -1, '횟수 차감', p_staff_id);
end $$;
