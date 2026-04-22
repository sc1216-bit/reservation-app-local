'use client';

import SelectionProgressPanel from './reservation/SelectionProgressPanel';

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

export default function SelectionSummaryBar(props: Props) {
  return (
    <div className="sticky top-3 z-20">
      <SelectionProgressPanel {...props} tone="blue" />
    </div>
  );
}
