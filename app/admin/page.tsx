import { isAdminAuthenticated } from '@/lib/admin';
import { listReservations, listSlots } from '@/lib/store';
import AdminClient from './AdminClient';

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">관리자 페이지</h1>
          <p className="mt-2 text-sm text-slate-600">관리자 비밀번호를 입력하세요.</p>
          <form action="/api/admin/login" method="post" className="mt-6 space-y-4">
            <input type="password" name="password" required className="w-full rounded-xl border border-slate-300 px-3 py-3" placeholder="관리자 비밀번호" />
            <button className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">로그인</button>
          </form>
        </div>
      </main>
    );
  }

  const [slots, reservations] = await Promise.all([listSlots(), listReservations()]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">관리자 페이지</h1>
          <p className="mt-2 text-sm text-slate-600">일정 등록, 수정, 삭제와 신청자 확인이 가능합니다.</p>
        </div>
        <form action="/api/admin/logout" method="post">
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">로그아웃</button>
        </form>
      </div>
      <AdminClient initialSlots={slots} initialReservations={reservations} />
    </main>
  );
}
