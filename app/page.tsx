import SlotList from '@/components/SlotList';
import { listSlots } from '@/lib/store';

export default async function HomePage() {
  const slots = await listSlots();
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">수업 신청 페이지</h1>
        <p className="mt-2 text-sm text-slate-600">동의사항 확인 → 신청자 정보 입력 → 5개 일정 선택 순서로 신청이 진행됩니다.</p>
      </div>
      <SlotList initialSlots={slots} />
    </main>
  );
}
