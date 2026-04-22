'use client';

import SelectionProgressPanel from './SelectionProgressPanel';

type Props = {
  loading?: boolean;
  selectedStudentCount: number;
  selectedSlotCount: number;
  requiredCount: number;
  onSubmit: () => void;
};

export default function MobileSubmitBar({
  loading = false,
  selectedStudentCount,
  selectedSlotCount,
  requiredCount,
  onSubmit,
}: Props) {
  const isReady = !loading && selectedStudentCount > 0 && selectedSlotCount === requiredCount;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
      <div className="space-y-3 rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <SelectionProgressPanel
          compact
          tone="slate"
          selectedCount={selectedSlotCount}
          requiredCount={requiredCount}
          selectedStudentCount={selectedStudentCount}
        />

        <button
          type="button"
          disabled={!isReady}
          onClick={onSubmit}
          className="w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          {loading ? '신청 중...' : '선택한 일정 신청하기'}
        </button>
      </div>
    </div>
  );
}
