import SlotList from '@/components/SlotList';
import { listSlots } from '@/lib/store';

export default async function HomePage() {
  const slots = await listSlots();

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">수업 신청</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          동의 확인 후 학생 정보를 입력하고, 희망 일정 5개를 선택해 주세요.
        </p>
      </div>

      <SlotList initialSlots={slots} />
    </main>
  );
}