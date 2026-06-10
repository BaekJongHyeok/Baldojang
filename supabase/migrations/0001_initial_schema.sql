-- ============================================================
-- 발도장 초기 스키마 v1
-- Supabase SQL Editor 또는 supabase db push로 실행
-- 설계 원칙:
--   1. pets가 1급 엔티티 (보호자 customers는 연락 창구)
--   2. shop_id 기반 멀티테넌시 + RLS 전면 적용
--   3. Phase 2~3 테이블(passes, payments)도 미리 정의하되
--      코드는 Phase별로 붙임 — 스키마 변경 비용 최소화
-- ============================================================

-- ---------- ENUM 타입 ----------
create type reservation_status as enum ('confirmed', 'completed', 'no_show', 'cancelled');
create type pet_size as enum ('small', 'medium', 'large');           -- 체급별 가격 분기
create type payment_method as enum ('cash', 'card', 'transfer', 'pass');
create type pass_type as enum ('amount', 'count');                   -- 금액권 / 횟수권
create type notification_status as enum ('pending', 'sent', 'failed');
create type staff_role as enum ('owner', 'staff');

-- ---------- 샵 / 직원 ----------
create table shops (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  address     text,
  -- 영업시간: {"mon": {"open":"10:00","close":"20:00"}, ...} null이면 휴무
  open_hours  jsonb not null default '{}',
  slot_minutes int not null default 30,        -- 캘린더 기본 슬롯 단위
  logo_url    text,                            -- Phase 3 완료카드 브랜딩용
  brand_color text,
  created_at  timestamptz not null default now()
);

create table staff (
  id         uuid primary key references auth.users(id) on delete cascade,
  shop_id    uuid not null references shops(id) on delete cascade,
  name       text not null,
  role       staff_role not null default 'owner',
  created_at timestamptz not null default now()
);
create index idx_staff_shop on staff(shop_id);

-- ---------- 보호자 / 펫 ----------
create table customers (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops(id) on delete cascade,
  name       text not null,
  phone      text not null,                    -- 알림톡 수신 번호
  memo       text,
  source     text,                             -- 유입 경로 (인스타/네이버/지인 등)
  created_at timestamptz not null default now(),
  unique (shop_id, phone)
);
create index idx_customers_shop on customers(shop_id);

create table pets (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references shops(id) on delete cascade,
  customer_id  uuid not null references customers(id) on delete cascade,
  name         text not null,
  breed        text,
  size         pet_size,
  birth_date   date,
  weight_kg    numeric(4,1),
  photo_url    text,
  -- 주의사항 태그: ["입질", "심장질환", "슬개골", "노령견"]
  caution_tags text[] not null default '{}',
  caution_memo text,                           -- 자유 서술 주의사항
  vaccinated   boolean,
  neutered     boolean,
  is_active    boolean not null default true,  -- 사망/이탈 시 soft delete
  created_at   timestamptz not null default now()
);
create index idx_pets_shop on pets(shop_id);
create index idx_pets_customer on pets(customer_id);
-- 강아지 이름 검색이 기본 동선 — trigram 인덱스
create extension if not exists pg_trgm;
create index idx_pets_name_trgm on pets using gin (name gin_trgm_ops);

-- ---------- 시술 메뉴 ----------
create table services (
  id               uuid primary key default gen_random_uuid(),
  shop_id          uuid not null references shops(id) on delete cascade,
  name             text not null,              -- 위생미용, 부분미용, 전체미용, 스포팅 등
  duration_minutes int not null default 60,
  -- 체급별 가격: {"small": 35000, "medium": 45000, "large": 60000}
  -- 단일가는 {"all": 40000}
  price            jsonb not null default '{}',
  recommend_cycle_weeks int,                   -- Phase 3 재방문 추천 주기 (4~6주)
  sort_order       int not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);
create index idx_services_shop on services(shop_id);

-- ---------- 예약 ----------
create table reservations (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references shops(id) on delete cascade,
  pet_id      uuid not null references pets(id) on delete cascade,
  service_id  uuid not null references services(id),
  staff_id    uuid references staff(id),        -- 담당 (1인샵이면 null 허용)
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  status      reservation_status not null default 'confirmed',
  price_quoted int,                             -- 예약 시점 견적가 (메뉴 가격 변경 대비 스냅샷)
  memo        text,
  created_at  timestamptz not null default now(),
  constraint valid_time check (ends_at > starts_at)
);
create index idx_reservations_shop_time on reservations(shop_id, starts_at);
create index idx_reservations_pet on reservations(pet_id);

-- 같은 샵 안에서 시간 겹침 방지 (취소/노쇼 제외)
create extension if not exists btree_gist;
alter table reservations add constraint no_overlap
  exclude using gist (
    shop_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed');

-- ---------- 시술 이력 (차트의 핵심) ----------
create table visits (
  id             uuid primary key default gen_random_uuid(),
  shop_id        uuid not null references shops(id) on delete cascade,
  pet_id         uuid not null references pets(id) on delete cascade,
  reservation_id uuid references reservations(id),  -- 워크인은 null
  service_id     uuid references services(id),
  visited_at     timestamptz not null default now(),
  before_photos  text[] not null default '{}',      -- Supabase Storage URL
  after_photos   text[] not null default '{}',
  style_memo     text,                              -- "얼굴 둥글게, 6mm, 발 알밤컷"
  behavior_memo  text,                              -- "드라이 싫어함, 입마개 필요"
  price_final    int,
  created_at     timestamptz not null default now()
);
create index idx_visits_pet_time on visits(pet_id, visited_at desc);
create index idx_visits_shop_time on visits(shop_id, visited_at desc);

-- ---------- 선불권/횟수권 (Phase 2) ----------
create table passes (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references shops(id) on delete cascade,
  customer_id   uuid not null references customers(id) on delete cascade,
  type          pass_type not null,
  name          text not null,                 -- "30만원권", "전체미용 10회권"
  total_amount  int,                           -- 금액권: 충전 총액
  balance       int,                           -- 금액권: 잔액
  total_count   int,                           -- 횟수권: 총 횟수
  remaining     int,                           -- 횟수권: 잔여
  expires_at    date,
  created_at    timestamptz not null default now(),
  constraint pass_shape check (
    (type = 'amount' and total_amount is not null and balance is not null)
    or (type = 'count' and total_count is not null and remaining is not null)
  )
);
create index idx_passes_customer on passes(customer_id);

create table pass_logs (
  id         uuid primary key default gen_random_uuid(),
  pass_id    uuid not null references passes(id) on delete cascade,
  visit_id   uuid references visits(id),
  delta      int not null,                     -- 차감 음수 / 충전 양수
  memo       text,
  created_by uuid references staff(id),
  created_at timestamptz not null default now()
);
create index idx_pass_logs_pass on pass_logs(pass_id);

-- ---------- 결제 (Phase 2) ----------
create table payments (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops(id) on delete cascade,
  visit_id   uuid not null references visits(id) on delete cascade,
  method     payment_method not null,
  amount     int not null,
  pass_id    uuid references passes(id),       -- method='pass'일 때
  paid_at    timestamptz not null default now()
);
create index idx_payments_shop_time on payments(shop_id, paid_at desc);

-- ---------- 알림톡 로그 ----------
create table notifications (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references shops(id) on delete cascade,
  customer_id  uuid references customers(id),
  reservation_id uuid references reservations(id),
  template_code text not null,                 -- Solapi 템플릿 코드
  status       notification_status not null default 'pending',
  cost_krw     numeric(6,2),                   -- 과금 설계용 원가 데이터
  sent_at      timestamptz,
  error_msg    text,
  created_at   timestamptz not null default now()
);
create index idx_notifications_shop on notifications(shop_id, created_at desc);

-- ============================================================
-- RLS — shop_id 기반 멀티테넌시
-- ============================================================
alter table shops enable row level security;
alter table staff enable row level security;
alter table customers enable row level security;
alter table pets enable row level security;
alter table services enable row level security;
alter table reservations enable row level security;
alter table visits enable row level security;
alter table passes enable row level security;
alter table pass_logs enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;

-- 현재 로그인한 staff의 shop_id 반환
create or replace function my_shop_id()
returns uuid language sql stable security definer as $$
  select shop_id from staff where id = auth.uid()
$$;

-- shops: 본인 샵만
create policy shop_member on shops for all
  using (id = my_shop_id());

-- staff: 같은 샵 직원만 조회, 본인 행만 수정
create policy staff_select on staff for select using (shop_id = my_shop_id());
create policy staff_self on staff for update using (id = auth.uid());
-- 가입 시 본인 staff 행 생성 허용
create policy staff_insert_self on staff for insert with check (id = auth.uid());

-- 나머지 테이블: shop_id 일치 시 전권 (1인샵 기준 단순화, 직원 권한 분리는 후순위)
create policy by_shop on customers     for all using (shop_id = my_shop_id());
create policy by_shop on pets          for all using (shop_id = my_shop_id());
create policy by_shop on services      for all using (shop_id = my_shop_id());
create policy by_shop on reservations  for all using (shop_id = my_shop_id());
create policy by_shop on visits        for all using (shop_id = my_shop_id());
create policy by_shop on passes        for all using (shop_id = my_shop_id());
create policy by_shop on payments      for all using (shop_id = my_shop_id());
create policy by_shop on notifications for all using (shop_id = my_shop_id());
-- pass_logs는 shop_id가 없으므로 pass 경유
create policy by_shop on pass_logs for all
  using (exists (select 1 from passes p where p.id = pass_id and p.shop_id = my_shop_id()));

-- 샵 최초 생성은 RLS 우회 필요 → 가입 플로우에서 security definer 함수 사용
create or replace function create_shop_with_owner(shop_name text, owner_name text)
returns uuid language plpgsql security definer as $$
declare new_shop_id uuid;
begin
  insert into shops (name) values (shop_name) returning id into new_shop_id;
  insert into staff (id, shop_id, name, role)
    values (auth.uid(), new_shop_id, owner_name, 'owner');
  return new_shop_id;
end $$;

-- ============================================================
-- Storage 버킷 (Supabase 대시보드 또는 별도 마이그레이션으로 생성)
--   pet-photos    : 펫 프로필 사진
--   visit-photos  : 시술 전후 사진
--   shop-assets   : 로고 등 (Phase 3)
-- ============================================================
