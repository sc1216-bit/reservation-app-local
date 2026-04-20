# Supabase 전환 적용 순서

## 1. Supabase 프로젝트 생성
- Supabase에서 새 프로젝트를 만듭니다.
- Project Settings > API에서 아래 값을 확인합니다.
  - `Project URL`
  - `service_role` key

## 2. SQL 실행
- Supabase SQL Editor를 열고 `supabase/schema.sql` 파일 내용을 그대로 실행합니다.
- 이 SQL은 아래를 만듭니다.
  - `slots` 테이블
  - `reservations` 테이블
  - 예약 생성용 `create_reservations_batch()` 함수

## 3. 환경변수 설정
프로젝트의 `.env.local`에 아래 값을 넣습니다.

```env
ADMIN_PASSWORD=원하는관리자비밀번호
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Vercel 배포 시에도 같은 값을 Project Settings > Environment Variables에 넣어야 합니다.

## 4. 패치 파일 덮어쓰기
이 ZIP 안의 파일들을 프로젝트 같은 경로에 덮어씁니다.

## 5. 의존성 설치
```bash
npm install
```

## 6. 개발 서버 재시작
```bash
npm run dev
```

## 주의사항
- 기존 `data/db.json` 데이터는 자동 이전되지 않습니다.
- 기존 예약/일정을 쓰려면 수동으로 Supabase 테이블에 옮겨야 합니다.
- 이번 패치는 서버 저장소를 `db.json`에서 Supabase로 바꾸는 것입니다.
- 관리자 날짜 표시 hydration 오류와 엑셀 날짜 파싱 수정도 함께 포함했습니다.

## 포함된 주요 변경 파일
- `lib/supabase.ts`
- `lib/store.ts`
- `app/admin/AdminClient.tsx`
- `app/api/admin/slots/import/route.ts`
- `.env.local.example`
- `package.json`
- `supabase/schema.sql`
