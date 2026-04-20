import { ReservationSlot } from './types';

export function formatKoreanDate(dateString: string, dayOfWeek: string) {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}(${dayOfWeek})`;
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function dayOfWeekKo(dateString: string) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(dateString).getDay()];
}

export function nowIso() {
  return new Date().toISOString();
}

export function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function normalizeClockTime(value: string) {
  const raw = value.trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error('시간은 HH:MM 형식으로 입력해주세요.');
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('시간은 00:00부터 23:59 사이여야 합니다.');
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function timeToMinutes(value: string) {
  const normalized = normalizeClockTime(value);
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatKoreanClockTime(value: string) {
  const normalized = normalizeClockTime(value);
  const [hoursText, minutesText] = normalized.split(':');
  const hours = Number(hoursText);
  const period = hours < 12 ? '오전' : '오후';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${period}${displayHour}시${minutesText}`;
}

export function formatTimeRange(startTime: string, endTime: string) {
  return `${formatKoreanClockTime(startTime)}-${formatKoreanClockTime(endTime)}`;
}

export function getSlotLabel(slot: ReservationSlot) {
  return slot.label.trim();
}

export function getSlotStartTime(slot: ReservationSlot) {
  return normalizeClockTime(slot.start_time);
}

export function getSlotEndTime(slot: ReservationSlot) {
  return normalizeClockTime(slot.end_time);
}

export function getSlotTimeText(slot: ReservationSlot) {
  return formatTimeRange(slot.start_time, slot.end_time);
}

export function getSlotDisplayText(slot: ReservationSlot) {
  return [getSlotLabel(slot), getSlotTimeText(slot)].filter(Boolean).join(' ');
}

export function compareSlots(a: ReservationSlot, b: ReservationSlot) {
  const byDate = a.date.localeCompare(b.date);
  if (byDate !== 0) return byDate;

  const byStart = timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
  if (byStart !== 0) return byStart;

  const byEnd = timeToMinutes(a.end_time) - timeToMinutes(b.end_time);
  if (byEnd !== 0) return byEnd;

  return getSlotDisplayText(a).localeCompare(getSlotDisplayText(b), 'ko');
}
