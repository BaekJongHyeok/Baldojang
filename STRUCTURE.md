# 폴더 구조 (App Router)

```
src/
├── middleware.ts                  # 세션 갱신 + 보호 라우트
├── app/
│   ├── (auth)/                    # 비로그인 영역
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/                     # 로그인 영역 — 공용 레이아웃(사이드바/하단탭)
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx     # 오늘 예약 + 오늘 매출 요약
│   │   ├── calendar/page.tsx      # 예약 캘린더 (4~5주차 핵심)
│   │   ├── pets/
│   │   │   ├── page.tsx           # 펫 검색/리스트 (이름 검색 기본)
│   │   │   ├── new/page.tsx
│   │   │   └── [petId]/page.tsx   # 펫 차트 (이력 타임라인)
│   │   ├── customers/[customerId]/page.tsx
│   │   ├── settings/
│   │   │   ├── shop/page.tsx      # 영업시간, 슬롯 설정
│   │   │   ├── services/page.tsx  # 시술 메뉴 CRUD
│   │   │   └── notifications/page.tsx  # 알림톡 설정 (6주차)
│   │   └── reports/page.tsx       # 매출 대시보드 (Phase 2)
│   └── api/
│       └── cron/
│           └── reminders/route.ts # 전날 리마인드 발송 (Vercel Cron, 6주차)
├── lib/
│   ├── supabase/{client,server}.ts
│   ├── auth-actions.ts
│   └── solapi.ts                  # 6주차
├── components/
│   ├── ui/                        # shadcn
│   ├── calendar/                  # 캘린더 전용 컴포넌트
│   └── pets/
└── types/database.ts              # supabase gen types 산출물
```

## 레이아웃 원칙 (반응형 단일 코드베이스)

- 데스크톱(≥1024px): 좌측 사이드바 + 메인 패널, 캘린더는 주간 멀티컬럼
- 모바일: 하단 탭바 (오늘 / 캘린더 / 펫 / 설정), 캘린더는 일간 리스트
- 분기점은 Tailwind `lg:` 하나로 통일 — 중간 브레이크포인트 늘리지 말 것

## PWA는 7주차에

next-pwa 대신 Next.js 15 기본 manifest + 최소 서비스워커 권장.
초기부터 서비스워커 캐시 잡으면 개발 중 캐시 무효화로 고생함 — 마지막에 추가.
