import { ReservationSlot } from './types';
import { getSlotStartTime } from './utils';

export type SlotTone = {
  card: string;
  badge: string;
  chip: string;
  row: string;
  border: string;
};

const colorMap: Record<string, SlotTone> = {
  '07:50': {
    card: 'border-cyan-200 bg-cyan-50',
    badge: 'bg-cyan-100 text-cyan-700',
    chip: 'bg-cyan-600 text-white',
    row: 'bg-cyan-50',
    border: 'border-cyan-200',
  },
  '08:50': {
    card: 'border-sky-200 bg-sky-50',
    badge: 'bg-sky-100 text-sky-700',
    chip: 'bg-sky-600 text-white',
    row: 'bg-sky-50',
    border: 'border-sky-200',
  },
  '09:50': {
    card: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    chip: 'bg-blue-600 text-white',
    row: 'bg-blue-50',
    border: 'border-blue-200',
  },
  '10:50': {
    card: 'border-indigo-200 bg-indigo-50',
    badge: 'bg-indigo-100 text-indigo-700',
    chip: 'bg-indigo-600 text-white',
    row: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  '12:50': {
    card: 'border-amber-200 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    chip: 'bg-amber-600 text-white',
    row: 'bg-amber-50',
    border: 'border-amber-200',
  },
  '13:50': {
    card: 'border-orange-200 bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
    chip: 'bg-orange-600 text-white',
    row: 'bg-orange-50',
    border: 'border-orange-200',
  },
  '14:50': {
    card: 'border-rose-200 bg-rose-50',
    badge: 'bg-rose-100 text-rose-700',
    chip: 'bg-rose-600 text-white',
    row: 'bg-rose-50',
    border: 'border-rose-200',
  },
  '15:50': {
    card: 'border-emerald-200 bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
    chip: 'bg-emerald-600 text-white',
    row: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  '16:50': {
    card: 'border-violet-200 bg-violet-50',
    badge: 'bg-violet-100 text-violet-700',
    chip: 'bg-violet-600 text-white',
    row: 'bg-violet-50',
    border: 'border-violet-200',
  },
};

const fallbackTone: SlotTone = {
  card: 'border-slate-200 bg-slate-50',
  badge: 'bg-slate-200 text-slate-700',
  chip: 'bg-slate-700 text-white',
  row: 'bg-slate-50',
  border: 'border-slate-200',
};

export function getSlotTone(slot: ReservationSlot) {
  const startTime = getSlotStartTime(slot);
  if (!startTime) return fallbackTone;
  return colorMap[startTime] ?? fallbackTone;
}
