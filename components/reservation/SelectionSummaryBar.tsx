'use client';

type SelectedSlot = {
  id: string;
  label: string;
};

type Props = {
  selectedCount: number;
  requiredCount: number;
  selectedSlots: SelectedSlot[];
  message?: string | null;
  error?: string | null;
};

export default function SelectionSummaryBar({
  selectedCount,
  requiredCount,
  selectedSlots,
  message,
  error,
}: Props) {
  return (
    <div className="sticky top-3 z-20 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">선택한 일정</p>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{selectedCount}/{requiredCount}</span>
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

      {selectedSlots.length > 0 ? (
        <ul className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-700">
          {selectedSlots.map((slot, index) => (
            <li key={slot.id} className="flex gap-2 leading-5">
              <span className="shrink-0 font-semibold text-slate-900">{index + 1}.</span>
              <span>{slot.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3">
          <p className="text-xs leading-5 text-slate-600">아직 선택한 일정이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
