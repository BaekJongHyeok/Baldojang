-- 샵 기본 재방문 주기
alter table shops add column default_cycle_weeks int not null default 5;

-- 재방문 연락 기록
create table retention_contacts (
  id         uuid primary key default gen_random_uuid(),
  pet_id     uuid not null references pets(id) on delete cascade,
  contacted_at timestamptz not null default now(),
  staff_id   uuid references staff(id),
  created_at timestamptz not null default now()
);
create index idx_retention_contacts_pet on retention_contacts(pet_id, contacted_at desc);

-- RLS
alter table retention_contacts enable row level security;
create policy by_shop on retention_contacts for all
  using (exists (select 1 from pets p where p.id = pet_id and p.shop_id = my_shop_id()));
