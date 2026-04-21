'use client';

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
  const remainingCount = Math.max(0, requiredCount - selectedSlotCount);
  const isReady =
    !loading &&
    selectedStudentCount > 0 &&
    selectedSlotCount === requiredCount;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
          <span>
            {selectedSlotCount === requiredCount
              ? '선택 완료'
              : `일정 ${remainingCount}개 더 선택해 주세요`}
          </span>
          <span>
            {selectedStudentCount}명 / {selectedSlotCount}개
          </span>
        </div>

        <button
          type="button"
          disabled={!isReady}
          onClick={onSubmit}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          {loading ? '신청 중...' : '선택한 일정 신청하기'}
        </button>
      </div>
    </div>
  );
}