# reservation-app-local

Supabase 없이 로컬 JSON 파일로 동작하는 신청/관리 페이지 예제입니다.

## 실행
1. 압축 해제
2. `.env.local.example`를 `.env.local`로 복사
3. `npm install`
4. `npm run dev`
5. 브라우저에서 `http://localhost:3000` 접속

## 관리자 페이지
- 주소: `http://localhost:3000/admin`
- 비밀번호: `.env.local`의 `ADMIN_PASSWORD`

## 데이터 저장
- `data/db.json` 파일에 저장됩니다.
- 신청/수정/삭제 후 파일 내용이 바뀝니다.

## 제한사항
- 서버 재시작 없이 로컬 파일을 직접 수정하면 상태가 꼬일 수 있습니다.
- 단일 서버 테스트용입니다.
