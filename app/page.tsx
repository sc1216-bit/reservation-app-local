import SlotList from '@/components/SlotList';
import { listSlots } from '@/lib/store';

export default async function HomePage() {
  const slots = await listSlots();

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <section className="overflow-visible rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(135deg,_#eff6ff,_#ffffff)] px-5 py-4 sm:px-7 sm:py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Reservation</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">수업 신청</h1>
          </div>

          <div className="p-4 sm:p-5 lg:p-6">
            <SlotList initialSlots={slots} />
          </div>
        </section>
      </div>
    </main>
  );
}
