# 발도장 프로젝트 부트스트랩

## 1. 프로젝트 생성 (로컬에서 실행)

```bash
npx create-next-app@latest baldojang \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --turbopack

cd baldojang

# 핵심 의존성
npm i @supabase/supabase-js @supabase/ssr @tanstack/react-query zustand date-fns

# shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button input label card dialog calendar select badge tabs sonner
```

## 2. 이 스캐폴드 파일 적용

이 폴더의 `src/`, `.env.local.example`을 프로젝트 루트에 복사.
`.env.local.example` → `.env.local`로 이름 바꾸고 Supabase 대시보드 값 채우기
(Settings → API: Project URL, anon key).

## 3. DB 타입 자동 생성

```bash
npx supabase login
npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts
```

스키마 바뀔 때마다 다시 실행. package.json scripts에 추가 권장:
```json
"gen:types": "supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts"
```

## 4. Supabase 대시보드에서 설정할 것

- Authentication → Providers → Email 활성화 (개발 중엔 Confirm email 끄기)
- 카카오 로그인은 Phase 1 후반에 추가 (개발은 이메일로 진행)
- Storage → 버킷 3개 생성: `pet-photos`, `visit-photos`, `shop-assets` (전부 private)

## 5. Vercel 연결

```bash
# GitHub 리포 생성 후
git init && git add -A && git commit -m "init"
gh repo create baldojang --private --source=. --push
```
Vercel 대시보드에서 리포 import → 환경변수 2개 추가 → 끝.
main 푸시 = 자동 배포. **매주 금요일 배포 원칙은 1일차부터.**

## 6. 동작 확인 체크리스트

- [ ] `npm run dev` → localhost:3000 접속
- [ ] /signup → 가입 → 샵 생성 → /dashboard 리다이렉트
- [ ] 로그아웃 후 /dashboard 접근 → /login으로 튕김 (미들웨어 동작)
- [ ] Vercel 배포 URL에서 동일 플로우 재현

여기까지가 Phase 0 완료. 다음은 2주차 — 샵 온보딩 위저드 + 시술 메뉴 CRUD.
