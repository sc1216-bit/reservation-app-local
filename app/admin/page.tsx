import type { Metadata } from 'next';
import { isAdminAuthenticated } from '@/lib/admin';
import { listReservations, listSlots } from '@/lib/store';
import AdminClient from './AdminClient';

export const metadata: Metadata = {
  title: '관리자 페이지',
};

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-md items-center">
          <div className="w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-7 text-white">
              <p className="text-sm font-medium text-slate-200">Reservation Admin</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">관리자 로그인</h1>
              <p className="mt-2 text-sm text-slate-300">일정 등록, 일괄 수정, 신청자 관리를 진행하려면 관리자 인증이 필요합니다.</p>
            </div>

            <div className="p-6">
              <form action="/api/admin/login" method="post" className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">관리자 비밀번호</label>
                  <input
                    type="password"
                    name="password"
                    required
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-200"
                    placeholder="관리자 비밀번호"
                  />
                </div>
                <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800">
                  로그인
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const [slots, reservations] = await Promise.all([listSlots(), listReservations()]);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto w-full max-w-[1840px] px-4 py-4 sm:px-6 sm:py-6 xl:px-8 2xl:px-10">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_32%),linear-gradient(135deg,_#0f172a,_#1e293b)] px-5 py-6 text-white sm:px-8 sm:py-7 xl:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
                <h1 className="text-3xl font-bold tracking-tight">관리자 페이지</h1>
              </div>
              <form action="/api/admin/logout" method="post">
                <button className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15">
                  로그아웃
                </button>
              </form>
            </div>
          </div>

          <div className="p-4 sm:p-6 xl:p-8 2xl:p-10">
            <AdminClient initialSlots={slots} initialReservations={reservations} />
          </div>
        </div>
      </div>
    </main>
  );
}
