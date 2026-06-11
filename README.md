# 발도장

애견미용실 운영 SaaS — 예약 캘린더, 펫 차트, 매출 리포트, 선불권, 미용 완료 카드, 재방문 추천을 하나의 앱으로.

## 타깃과 차별점

- **1인 애견미용샵** 원장을 위한 올인원 운영 도구
- **펫이 1급 엔티티**: 경쟁 서비스(공비서 등 범용 CRM)는 보호자 중심이라 "강아지를 못 찾는" 문제가 있음. 발도장은 모든 화면에서 강아지 이름이 주인공이고 보호자는 보조 정보
- 모바일 우선 설계: 원장이 시술 중에도 한 손으로 조작 가능

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, src 디렉토리, Turbopack) |
| 스타일 | Tailwind CSS v4 |
| 백엔드/DB | Supabase (Auth, PostgreSQL, Storage) |
| 인증 | @supabase/ssr 쿠키 기반 세션 |
| 멀티테넌시 | shop_id 기반 RLS 전면 적용 |
| 배포 | Vercel |
| 주요 라이브러리 | date-fns, date-fns-tz, sonner, html-to-image |

## 주요 기능 (라우트 기준)

### `/dashboard` — 홈
오늘 날짜 + 요약 카드(예약/완료/매출/재방문 대상), 다음 예약 하이라이트, 오늘의 예약 리스트.

### `/calendar` — 예약 캘린더
일간/주간 뷰 전환, 3주 데이터 프리로드 + 클라이언트 필터링으로 즉시 전환. 빈 슬롯 클릭 → 예약 생성, 상태 변경(완료/노쇼/취소) 낙관적 업데이트. 완료 시 결제 기록 + 선불권 차감 + visit 생성 통합.

### `/pets` — 펫 관리
클라이언트 검색(이름/보호자/전화), 펫 등록(보호자 전화번호 매칭), 펫 차트(주의사항 빨간 배지, 방문 이력 타임라인, 완료 카드 링크).

### `/retention` — 재방문 추천
마지막 visit 기준 services.recommend_cycle_weeks(또는 shops.default_cycle_weeks) 경과 판정. 상태 3그룹(지남/권장/다가옴), 미래 예약·최근 연락 제외. 전화/예약 잡기/연락함 액션.

### `/reports` — 매출 리포트 + 월 마감
12개월 데이터 일괄 로드 + 클라이언트 기간 전환. 시술 매출/시술별/수단별/일별 추이. 월 마감: 수단별 내역, 선불권(선수금/차감/미사용 잔액), 운영 지표(노쇼율). CSV 내보내기(UTF-8 BOM).

### `/settings` — 설정
샵 정보(영업시간/슬롯 단위/기본 재방문 주기), 시술 메뉴 CRUD(단일가/체급별 가격, 정렬, 비활성화).

### `/visits/[visitId]/card` — 미용 완료 카드
템플릿 2종(미니멀/포토) × 비율 2종(4:5/9:16). Before/After 모드(의도 먼저 플로우). html-to-image로 2x PNG 생성.

### `/customers/[customerId]` — 보호자 상세
보호자 정보, 소속 펫 목록, 선불권 관리(판매/잔액 조회/소진·만료 상태 구분).

## DB 구조

### 핵심 테이블 (12개)

| 테이블 | 역할 |
|---|---|
| shops | 샵 (영업시간, 슬롯 단위, 브랜드 컬러, 기본 재방문 주기) |
| staff | 직원 (id = auth.uid(), shop_id 연결) |
| customers | 보호자 (전화번호 unique per shop) |
| pets | 펫 (1급 엔티티, 주의사항 태그, trigram 검색 인덱스) |
| services | 시술 메뉴 (체급별 가격 jsonb, 재방문 주기) |
| reservations | 예약 (exclude 제약으로 시간 겹침 방지) |
| visits | 시술 이력 (전후 사진, 스타일/행동 메모) |
| passes | 선불권/횟수권 (금액권 balance, 횟수권 remaining) |
| pass_logs | 선불권 충전/차감 이력 |
| payments | 결제 (visit_id nullable — 선불권 판매는 visit 없음) |
| notifications | 알림톡 로그 (Phase 4 예정) |
| retention_contacts | 재방문 연락 기록 |

### 설계 포인트

- **펫 중심 구조**: pets가 customers의 하위가 아니라 독립 엔티티. 검색/예약/차트 모두 펫 기준
- **exclude 제약 겹침 방지**: `tstzrange(starts_at, ends_at)` GiST 인덱스, cancelled 제외 모든 상태가 슬롯 점유
- **선불권 원자적 차감**: `deduct_pass_amount` / `deduct_pass_count` security definer RPC (FOR UPDATE 잠금, shop 소유권 검증)
- **shop_id RLS**: `my_shop_id()` 함수로 모든 테이블에 행 수준 보안
- **security definer**: `create_shop_with_owner` (가입 시 RLS 우회), 선불권 차감 RPC

## 로컬 개발

```bash
git clone <repo-url>
cd project_baldojang
npm install
```

### 환경 변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Supabase 대시보드 → Settings → API에서 Project URL과 anon key를 복사.

### DB 마이그레이션

Supabase 대시보드 SQL Editor에서 순서대로 실행:

| 파일 | 내용 |
|---|---|
| `0001_initial_schema.sql` | 전체 테이블, RLS, RPC 함수 |
| `0002_storage_policies.sql` | pet-photos, visit-photos 버킷 RLS |
| `0003_overlap_all_statuses.sql` | 예약 겹침 제약 강화 (cancelled 외 전체 차단) |
| `0004_passes_support.sql` | payments.visit_id nullable, 선불권 차감 RPC |
| `0005_retention.sql` | shops.default_cycle_weeks, retention_contacts 테이블 |

Storage 버킷 생성 (대시보드 → Storage): `pet-photos`, `visit-photos` (둘 다 private).

### 개발 서버

```bash
npm run dev
```

### DB 타입 생성

```bash
npx supabase login
npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts
```

스키마 변경 후 매번 재실행.

## 로드맵

- [ ] 알림톡 연동 (Solapi, 카카오 비즈메시지 템플릿 심사 대기)
  - 예약 전날 리마인드, 완료 후 후기 요청, 재방문 권유
  - Vercel Cron으로 전날 리마인드 배치 실행
- [ ] 베타 운영 (실제 미용실 2~3곳 파일럿)
- [ ] 과금 (Toss 빌링 연동, 월 구독 모델)
- [ ] PWA (서비스워커 + 오프라인 캐시, 마지막에 추가)
