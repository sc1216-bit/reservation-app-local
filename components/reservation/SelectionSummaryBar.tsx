'use client';

type SelectedSlotItem = {
  id: string;
  label: string;
};

type Props = {
  selectedCount: number;
  requiredCount: number;
  selectedStudentCount: number;
  selectedSlots: SelectedSlotItem[];
  message?: string | null;
  error?: string | null;
};

export default function SelectionSummaryBar({
  selectedCount,
  requiredCount,
  selectedStudentCount,
  selectedSlots,
  message,
  error,
}: Props) {
  const remainingCount = Math.max(0, requiredCount - selectedCount);
  const isComplete = selectedCount === requiredCount;
  const showSelectionList = selectedSlots.length > 0 && !isComplete;

  return (
    <div className="sticky top-3 z-20 rounded-3xl border border-blue-100 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {isComplete
              ? `일정 ${requiredCount}개 선택 완료`
              : `일정 ${selectedCount} / ${requiredCount} 선택됨`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            같은 날짜는 1타임만 선택할 수 있어요.
          </p>
        </div>

        <div className="text-right text-xs text-slate-500">
          <p>{selectedStudentCount}명 선택</p>
          <p>{remainingCount}개 남음</p>
        </div>
      </div>

      {message && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <p className="text-sm leading-6 text-emerald-700">{message}</p>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5">
          <p className="text-sm leading-6 text-rose-700">{error}</p>
        </div>
      )}

      {showSelectionList && (
        <div className="mt-3 rounded-2xl bg-blue-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-900">선택한 일정</p>
            <p className="text-[11px] text-blue-700">
              {selectedCount} / {requiredCount}
            </p>
          </div>

          <ul className="space-y-1.5 text-xs text-blue-900">
            {selectedSlots.map((slot) => (
              <li key={slot.id} className="flex gap-2 leading-5">
                <span className="shrink-0">•</span>
                <span>{slot.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!showSelectionList && !isComplete && (
        <div className="mt-3 rounded-2xl bg-blue-50 p-3">
          <p className="text-xs leading-5 text-blue-700">
            아직 선택한 일정이 없습니다. 희망 일정을 {requiredCount}개 선택해 주세요.
          </p>
        </div>
      )}
    </div>
  );
}