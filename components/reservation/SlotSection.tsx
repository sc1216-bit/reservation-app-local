'use client';

import { ReactNode } from 'react';
import SlotCard from '../SlotCard';
import { ReservationSlot } from '@/lib/types';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

type CardProps = {
  slot: ReservationSlot;
  selected: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  onToggle?: (slotId: string) => void;
};

function SlotSection({ title, subtitle, children }: Props) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="text-xs font-medium text-slate-500">· {subtitle}</p> : null}
        </div>
      </div>

      {children}
    </section>
  );
}

function SlotSectionCard({
  slot,
  selected,
  disabled = false,
  disabledReason = null,
  onToggle,
}: CardProps) {
  return (
    <SlotCard
      slot={slot}
      selected={selected}
      disabled={disabled}
      disabledReason={disabledReason}
      onToggle={onToggle}
    />
  );
}

SlotSection.Card = SlotSectionCard;

export default SlotSection as typeof SlotSection & {
  Card: typeof SlotSectionCard;
};