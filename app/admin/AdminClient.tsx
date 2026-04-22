'use client';

import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Reservation, ReservationSlot } from '@/lib/types';
import { compareSlots, formatKoreanDate, getSlotLabel, getSlotTimeText } from '@/lib/utils';
import { getSlotTone } from '@/lib/slotTone';

type BulkOpenMode = 'keep' | 'immediate' | 'datetime';
type StatusFilter = 'all' | 'open' | 'closed' | 'scheduled';
type DateFilter = 'all' | 'today' | 'upcoming' | 'past';
type SortOption = 'dateAsc' | 'dateDesc' | 'availabilityLow' | 'availabilityHigh' | 'createdDesc';
type SeatFilter = 'all' | 'available' | 'tight' | 'full';
type ApplicantFilter = 'all' | 'none' | 'has' | 'multi';
type AdminSection = 'schedules' | 'applicants';

type ReservationWithSlot = Reservation & {
  slotDate: string;
  slotLabel: string;
  slotTime: string;
};

function toDateTimeLocalValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours < 12 ? '오전' : '오후';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${yyyy}-${mm}-${dd} ${period} ${displayHour}:${minutes}`;
}

function formatDateOnlyKorean(dateString: string) {
  const date = new Date(dateString);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = Number.isNaN(date.getTime()) ? '' : dayNames[date.getDay()];
  return dayName ? formatKoreanDate(dateString, dayName) : dateString;
}

function inputClassName() {
  return 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200';
}

function statTone(type: 'default' | 'success' | 'warning' | 'danger' = 'default') {
  if (type === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-950';
  if (type === 'warning') return 'border-amber-200 bg-amber-50 text-amber-950';
  if (type === 'danger') return 'border-rose-200 bg-rose-50 text-rose-950';
  return 'border-slate-200 bg-white text-slate-950';
}

function isSlotClosed(slot: ReservationSlot) {
  return slot.is_closed || slot.reserved_count >= slot.capacity;
}

function getRemainingSeats(slot: ReservationSlot) {
  return Math.max(slot.capacity - slot.reserved_count, 0);
}

function getOccupancy(slot: ReservationSlot) {
  if (!slot.capacity) return 0;
  return Math.min(Math.round((slot.reserved_count / slot.capacity) * 100), 100);
}

function toDateOnlyValue(dateString: string) {
  return new Date(dateString).toISOString().slice(0, 10);
}

function compareVisibleSlots(a: ReservationSlot, b: ReservationSlot, sortOption: SortOption) {
  if (sortOption === 'dateDesc') return compareSlots(b, a);
  if (sortOption === 'availabilityLow') return getRemainingSeats(a) - getRemainingSeats(b) || compareSlots(a, b);
  if (sortOption === 'availabilityHigh') return getRemainingSeats(b) - getRemainingSeats(a) || compareSlots(a, b);
  if (sortOption === 'createdDesc') return b.created_at.localeCompare(a.created_at) || compareSlots(a, b);
  return compareSlots(a, b);
}

function SectionChip({ active, onClick, title }: { active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {title}
    </button>
  );
}

function StatusPill({ slot }: { slot: ReservationSlot }) {
  if (isSlotClosed(slot)) {
    return <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">마감</span>;
  }

  if (slot.open_at) {
    return <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">오픈 예정</span>;
  }

  return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">접수 중</span>;
}

function MetricCard({
  title,
  value,
  description,
  type = 'default',
}: {
  title: string;
  value: string | number;
  description: string;
  type?: 'default' | 'success' | 'warning' | 'danger';
}) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${statTone(type)}`}>
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function ReservationList({
  reservations,
  isBusy,
  deletingReservationId,
  onDelete,
}: {
  reservations: Reservation[];
  isBusy: boolean;
  deletingReservationId: string | null;
  onDelete: (id: string) => void;
}) {
  if (reservations.length === 0) {
    return <p className="text-sm text-slate-500">신청자가 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="px-3 py-2">학교</th>
            <th className="px-3 py-2">학생명</th>
            <th className="px-3 py-2">전화번호</th>
            <th className="px-3 py-2">신청일시</th>
            <th className="px-3 py-2">관리</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((reservation) => (
            <tr key={reservation.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-3 py-2">{reservation.school_name}</td>
              <td className="px-3 py-2 font-medium text-slate-900">{reservation.student_name}</td>
              <td className="px-3 py-2">{reservation.phone_number}</td>
              <td className="px-3 py-2">{formatDateTime(reservation.created_at)}</td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => onDelete(reservation.id)}
                  disabled={isBusy}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {deletingReservationId === reservation.id ? '삭제 중...' : '삭제'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminClient({
  initialSlots,
  initialReservations,
}: {
  initialSlots: ReservationSlot[];
  initialReservations: Reservation[];
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [reservations, setReservations] = useState(initialReservations);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [checkedSlotIds, setCheckedSlotIds] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<AdminSection>('schedules');
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [openAt, setOpenAt] = useState('');
  const [openImmediately, setOpenImmediately] = useState(true);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkLabel, setBulkLabel] = useState('');
  const [bulkStartTime, setBulkStartTime] = useState('');
  const [bulkEndTime, setBulkEndTime] = useState('');
  const [bulkOpenAt, setBulkOpenAt] = useState('');
  const [bulkOpenMode, setBulkOpenMode] = useState<BulkOpenMode>('keep');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [reservationSearchTerm, setReservationSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('dateAsc');
  const [seatFilter, setSeatFilter] = useState<SeatFilter>('all');
  const [applicantFilter, setApplicantFilter] = useState<ApplicantFilter>('all');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);
  const [deletingReservationId, setDeletingReservationId] = useState<string | null>(null);

  const isBusy =
    submitting ||
    uploading ||
    bulkUpdating ||
    bulkDeleting ||
    deletingSlotId !== null ||
    deletingReservationId !== null;

  const reservationCountBySlotId = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    reservations.forEach((reservation) => {
      if (!map.has(reservation.slot_id)) map.set(reservation.slot_id, []);
      map.get(reservation.slot_id)!.push(reservation);
    });
    return map;
  }, [reservations]);

  const slotById = useMemo(() => {
    return new Map(slots.map((slot) => [slot.id, slot]));
  }, [slots]);

  const today = useMemo(() => toDateOnlyValue(new Date().toISOString()), []);

  const visibleSlots = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return [...slots]
      .filter((slot) => {
        const closed = isSlotClosed(slot);
        const scheduled = !!slot.open_at && !closed;
        const remainingSeats = getRemainingSeats(slot);
        const applicantCount = reservationCountBySlotId.get(slot.id)?.length ?? 0;

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'open' && !closed && !scheduled) ||
          (statusFilter === 'closed' && closed) ||
          (statusFilter === 'scheduled' && scheduled);

        if (!matchesStatus) return false;

        const slotDate = slot.date;
        const matchesDate =
          dateFilter === 'all' ||
          (dateFilter === 'today' && slotDate === today) ||
          (dateFilter === 'upcoming' && slotDate >= today) ||
          (dateFilter === 'past' && slotDate < today);

        if (!matchesDate) return false;

        const matchesSeat =
          seatFilter === 'all' ||
          (seatFilter === 'available' && remainingSeats >= 2) ||
          (seatFilter === 'tight' && remainingSeats === 1) ||
          (seatFilter === 'full' && remainingSeats === 0);

        if (!matchesSeat) return false;

        const matchesApplicant =
          applicantFilter === 'all' ||
          (applicantFilter === 'none' && applicantCount === 0) ||
          (applicantFilter === 'has' && applicantCount >= 1) ||
          (applicantFilter === 'multi' && applicantCount >= 2);

        if (!matchesApplicant) return false;

        if (!keyword) return true;

        const searchSource = [
          slot.date,
          getSlotLabel(slot),
          getSlotTimeText(slot),
          String(slot.capacity),
          String(slot.reserved_count),
          slot.open_at ? formatDateTime(slot.open_at) : '즉시',
        ]
          .join(' ')
          .toLowerCase();

        return searchSource.includes(keyword);
      })
      .sort((a, b) => compareVisibleSlots(a, b, sortOption));
  }, [applicantFilter, dateFilter, reservationCountBySlotId, searchTerm, seatFilter, slots, sortOption, statusFilter, today]);

  const enrichedReservations = useMemo<ReservationWithSlot[]>(() => {
    return [...reservations]
      .map((reservation) => {
        const slot = slotById.get(reservation.slot_id);
        return {
          ...reservation,
          slotDate: slot?.date ?? '',
          slotLabel: slot ? getSlotLabel(slot) : '삭제된 일정',
          slotTime: slot ? getSlotTimeText(slot) : '-',
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [reservations, slotById]);

  const visibleReservations = useMemo(() => {
    const keyword = reservationSearchTerm.trim().toLowerCase();
    if (!keyword) return enrichedReservations;

    return enrichedReservations.filter((reservation) =>
      [
        reservation.school_name,
        reservation.student_name,
        reservation.phone_number,
        reservation.slotDate,
        reservation.slotLabel,
        reservation.slotTime,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [enrichedReservations, reservationSearchTerm]);

  const upcomingSlots = useMemo(() => visibleSlots.filter((slot) => slot.date >= today), [today, visibleSlots]);
  const recentReservations = useMemo(() => enrichedReservations.slice(0, 6), [enrichedReservations]);

  const allChecked = visibleSlots.length > 0 && visibleSlots.every((slot) => checkedSlotIds.includes(slot.id));

  const stats = useMemo(() => {
    const totalCapacity = slots.reduce((sum, slot) => sum + slot.capacity, 0);
    const totalReserved = slots.reduce((sum, slot) => sum + slot.reserved_count, 0);
    const closedSlots = slots.filter((slot) => isSlotClosed(slot)).length;
    const scheduledOpenSlots = slots.filter((slot) => !!slot.open_at && !isSlotClosed(slot)).length;
    const activeSlots = slots.filter((slot) => !isSlotClosed(slot) && !slot.open_at).length;
    const totalRemainingSeats = slots.reduce((sum, slot) => sum + getRemainingSeats(slot), 0);

    return {
      totalSlots: slots.length,
      totalCapacity,
      totalReserved,
      totalRemainingSeats,
      closedSlots,
      scheduledOpenSlots,
      activeSlots,
      reservationRate: totalCapacity ? Math.round((totalReserved / totalCapacity) * 100) : 0,
    };
  }, [slots]);

  const visibleStats = useMemo(() => {
    const visibleCapacity = visibleSlots.reduce((sum, slot) => sum + slot.capacity, 0);
    const visibleReserved = visibleSlots.reduce((sum, slot) => sum + slot.reserved_count, 0);
    return {
      count: visibleSlots.length,
      capacity: visibleCapacity,
      reserved: visibleReserved,
      remaining: Math.max(visibleCapacity - visibleReserved, 0),
    };
  }, [visibleSlots]);

  useEffect(() => {
    if (openImmediately && openAt) setOpenAt('');
  }, [openImmediately, openAt]);

  useEffect(() => {
    if (bulkOpenMode !== 'datetime' && bulkOpenAt) setBulkOpenAt('');
  }, [bulkOpenMode, bulkOpenAt]);

  useEffect(() => {
    if (!message && !error) return;

    const timer = setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [message, error]);

  async function refreshData() {
    const [slotsRes, reservationsRes] = await Promise.all([
      fetch('/api/admin/slots', { cache: 'no-store' }),
      fetch('/api/admin/slots?scope=reservations', { cache: 'no-store' }),
    ]);
    const slotsJson = await slotsRes.json();
    const reservationsJson = await reservationsRes.json();
    const nextSlots = slotsJson.slots ?? [];
    const nextReservations = reservationsJson.reservations ?? [];
    setSlots(nextSlots);
    setReservations(nextReservations);
    setCheckedSlotIds((prev) => prev.filter((id) => nextSlots.some((slot: ReservationSlot) => slot.id === id)));
    setExpandedSlotId((prev) => (prev && nextSlots.some((slot: ReservationSlot) => slot.id === prev) ? prev : null));
  }

  function clearFeedback() {
    setMessage(null);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearFeedback();
    setSubmitting(true);

    try {
      const method = editingId ? 'PUT' : 'POST';
      const normalizedOpenAt = openImmediately ? null : openAt;
      const payload = editingId
        ? { id: editingId, date, label, startTime, endTime, capacity, openAt: normalizedOpenAt }
        : { date, label, startTime, endTime, capacity, openAt: normalizedOpenAt };

      const res = await fetch('/api/admin/slots', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || '처리 중 오류가 발생했습니다.');
      }

      setMessage(editingId ? '일정을 수정했습니다.' : '일정을 등록했습니다.');
      resetForm();
      await refreshData();
      setActiveSection('schedules');
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 이 일정을 삭제하시겠습니까?')) return;
    clearFeedback();
    setDeletingSlotId(id);

    try {
      const res = await fetch('/api/admin/slots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '삭제 실패');

      await refreshData();
      setMessage('일정을 삭제했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setDeletingSlotId(null);
    }
  }

  async function handleBulkDelete() {
    if (checkedSlotIds.length === 0) {
      setError('삭제할 일정을 먼저 선택해주세요.');
      return;
    }
    if (!confirm(`선택한 ${checkedSlotIds.length}개의 일정을 삭제하시겠습니까?`)) return;

    clearFeedback();
    setBulkDeleting(true);
    const count = checkedSlotIds.length;

    try {
      setMessage(`선택한 일정 ${count}개를 삭제하는 중입니다...`);

      const res = await fetch('/api/admin/slots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: checkedSlotIds }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || '일괄 삭제 실패');

      setCheckedSlotIds([]);
      await refreshData();
      setMessage(`${count}개의 일정을 삭제했습니다.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 삭제 실패');
      setMessage(null);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleBulkUpdate() {
    if (checkedSlotIds.length === 0) {
      setError('수정할 일정을 먼저 선택해주세요.');
      return;
    }
    if (!bulkDate && !bulkLabel && !bulkStartTime && !bulkEndTime && bulkOpenMode === 'keep') {
      setError('일괄 수정할 날짜, 반 이름, 시작/종료 시간 또는 신청 시작 설정을 입력해주세요.');
      return;
    }
    if (bulkOpenMode === 'datetime' && !bulkOpenAt) {
      setError('변경할 신청 시작 일시를 입력해주세요.');
      return;
    }

    clearFeedback();
    setBulkUpdating(true);
    const count = checkedSlotIds.length;

    try {
      setMessage(`선택한 일정 ${count}개를 수정하는 중입니다...`);

      const payload: Record<string, unknown> = { ids: checkedSlotIds };
      if (bulkDate) payload.date = bulkDate;
      if (bulkLabel) payload.label = bulkLabel;
      if (bulkStartTime) payload.startTime = bulkStartTime;
      if (bulkEndTime) payload.endTime = bulkEndTime;
      if (bulkOpenMode === 'immediate') payload.openAt = null;
      else if (bulkOpenMode === 'datetime') payload.openAt = bulkOpenAt;

      const res = await fetch('/api/admin/slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '일괄 수정 실패');

      resetBulkForm();
      await refreshData();
      setMessage(`${count}개의 일정을 수정했습니다.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 수정 실패');
      setMessage(null);
    } finally {
      setBulkUpdating(false);
    }
  }

  function startEdit(slot: ReservationSlot) {
    if (isBusy) return;

    setEditingId(slot.id);
    setDate(slot.date);
    setLabel(getSlotLabel(slot));
    setStartTime(slot.start_time);
    setEndTime(slot.end_time);
    setCapacity(slot.capacity);
    setOpenAt(toDateTimeLocalValue(slot.open_at));
    setOpenImmediately(!slot.open_at);
    setActiveSection('schedules');
  }

  function resetForm() {
    setEditingId(null);
    setDate('');
    setLabel('');
    setStartTime('');
    setEndTime('');
    setCapacity(4);
    setOpenAt('');
    setOpenImmediately(true);
  }

  function resetBulkForm() {
    setBulkDate('');
    setBulkLabel('');
    setBulkStartTime('');
    setBulkEndTime('');
    setBulkOpenAt('');
    setBulkOpenMode('keep');
  }

  function resetFilters() {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
    setSortOption('dateAsc');
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setUploadFile(e.target.files?.[0] ?? null);
  }

  function toggleSlotChecked(id: string) {
    if (isBusy) return;
    setCheckedSlotIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAllChecked() {
    if (isBusy) return;
    setCheckedSlotIds((prev) => {
      const visibleIds = visibleSlots.map((slot) => slot.id);
      const allVisibleChecked = visibleIds.every((id) => prev.includes(id));
      if (allVisibleChecked) {
        return prev.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!uploadFile) {
      setError('업로드할 xlsx 파일을 선택해주세요.');
      return;
    }

    setUploading(true);
    clearFeedback();

    try {
      setMessage('엑셀 파일을 업로드하는 중입니다...');

      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await fetch('/api/admin/slots/import', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '일괄 업로드 실패');

      setUploadFile(null);
      await refreshData();
      setMessage(`${json.count}개의 일정을 일괄 등록했습니다.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 업로드 실패');
      setMessage(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteReservation(id: string) {
    if (!confirm('정말 이 신청자를 삭제하시겠습니까?')) return;
    clearFeedback();
    setDeletingReservationId(id);

    try {
      const res = await fetch('/api/admin/reservations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '신청자 삭제 실패');

      await refreshData();
      setMessage('신청자를 삭제했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '신청자 삭제 실패');
    } finally {
      setDeletingReservationId(null);
    }
  }

  return (
    <div className="space-y-6">

      {(message || error) && (
        <div
          className={`rounded-3xl border px-4 py-3 text-sm shadow-sm ${
            error
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error ?? message}
        </div>
      )}

      <div className="space-y-6">
        <section className="space-y-6">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <SectionChip active={activeSection === 'schedules'} onClick={() => setActiveSection('schedules')} title="일정관리" />
              <SectionChip active={activeSection === 'applicants'} onClick={() => setActiveSection('applicants')} title="신청자관리" />
            </div>
            {activeSection === 'applicants' && (
              <button type="button" onClick={() => setActiveSection('schedules')} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">일정관리로 돌아가기</button>
            )}
          </div>

          {activeSection === 'schedules' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">신규 일정</button>
                  <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                    엑셀 업로드
                    <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
                  </label>
                  <button type="button" onClick={handleUpload} disabled={!uploadFile || uploading} className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 disabled:bg-slate-100 disabled:text-slate-400">{uploading ? '업로드 중...' : '업로드 실행'}</button>
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClassName()} />
                  <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="반 이름" className={inputClassName()} />
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClassName()} />
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClassName()} />
                  <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className={inputClassName()} />
                  <button type="button" onClick={() => { void handleSubmit({ preventDefault() {} } as React.FormEvent<HTMLFormElement>); }} disabled={submitting || bulkUpdating || bulkDeleting || uploading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">{submitting ? (editingId ? '수정 중...' : '등록 중...') : editingId ? '일정 수정' : '일정 등록'}</button>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">선택 일정 작업</h3>
                    
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleBulkUpdate}
                      disabled={checkedSlotIds.length === 0 || isBusy}
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
                    >
                      {bulkUpdating ? '일괄 수정 중...' : '선택 일정 일괄 수정'}
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={checkedSlotIds.length === 0 || isBusy}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {bulkDeleting ? '삭제 중...' : '선택 일정 삭제'}
                    </button>
                    <button
                      type="button"
                      onClick={resetBulkForm}
                      disabled={isBusy}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      입력 초기화
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
                  <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} className={inputClassName()} />
                  <input value={bulkLabel} onChange={(e) => setBulkLabel(e.target.value)} placeholder="반 이름 변경" className={inputClassName()} />
                  <input type="time" value={bulkStartTime} onChange={(e) => setBulkStartTime(e.target.value)} className={inputClassName()} />
                  <input type="time" value={bulkEndTime} onChange={(e) => setBulkEndTime(e.target.value)} className={inputClassName()} />
                  <select value={bulkOpenMode} onChange={(e) => setBulkOpenMode(e.target.value as BulkOpenMode)} className={inputClassName()}>
                    <option value="keep">신청 시작 유지</option>
                    <option value="immediate">즉시 오픈</option>
                    <option value="datetime">특정 시점으로 변경</option>
                  </select>
                </div>
                {bulkOpenMode === 'datetime' && (
                  <div className="mt-3 max-w-sm">
                    <input type="datetime-local" value={bulkOpenAt} onChange={(e) => setBulkOpenAt(e.target.value)} className={inputClassName()} />
                  </div>
                )}
              </div>

              <div className="space-y-3 lg:hidden">
                {visibleSlots.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    현재 조건에 맞는 일정이 없습니다. 검색어나 상태 필터를 조정해 주세요.
                  </div>
                )}
                {visibleSlots.map((slot) => {
                  const isChecked = checkedSlotIds.includes(slot.id);
                  const slotReservations = reservationCountBySlotId.get(slot.id) ?? [];
                  const expanded = expandedSlotId === slot.id;
                  const occupancy = getOccupancy(slot);

                  return (
                    <div key={slot.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                      <div className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{formatKoreanDate(slot.date, slot.day_of_week)}</p>
                            <p className="mt-1 text-sm text-slate-500">{getSlotLabel(slot)} · {getSlotTimeText(slot)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={isChecked} onChange={() => toggleSlotChecked(slot.id)} disabled={isBusy} className="h-4 w-4 rounded border-slate-300" />
                            <StatusPill slot={slot} />
                          </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="flex items-center justify-between text-xs text-slate-500"><span>신청 {slot.reserved_count}/{slot.capacity}</span><span>잔여 {getRemainingSeats(slot)}석</span></div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-slate-900" style={{ width: `${occupancy}%` }} /></div>
                          <p className="mt-3 text-xs text-slate-500">신청 시작: {slot.open_at ? formatDateTime(slot.open_at) : '즉시'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => startEdit(slot)} disabled={isBusy} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400">수정</button>
                          <button type="button" onClick={() => handleDelete(slot.id)} disabled={isBusy} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 disabled:bg-slate-100 disabled:text-slate-400">{deletingSlotId === slot.id ? '삭제 중...' : '삭제'}</button>
                          <button type="button" onClick={() => setExpandedSlotId(expanded ? null : slot.id)} disabled={isBusy} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-700 disabled:bg-slate-100 disabled:text-slate-400">{expanded ? '신청자 닫기' : `신청자 ${slotReservations.length}명`}</button>
                        </div>
                      </div>
                      {expanded && (
                        <div className="border-t border-slate-200 bg-white px-4 py-4">
                          <div className="mb-3 flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">해당 일정 신청자 목록</p><span className="text-xs text-slate-500">{slotReservations.length}명</span></div>
                          <ReservationList reservations={slotReservations} isBusy={isBusy} deletingReservationId={deletingReservationId} onDelete={handleDeleteReservation} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden lg:block">
                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                  <div className="max-h-[920px] overflow-auto 2xl:max-h-[1080px]">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-50 shadow-[inset_0_-1px_0_0_rgba(226,232,240,1)]">
                        <tr className="text-left text-slate-500">
                          <th className="px-4 py-3"><input type="checkbox" checked={allChecked} onChange={toggleAllChecked} aria-label="전체 선택" disabled={isBusy} className="h-4 w-4 rounded border-slate-300" /></th>
                          <th className="px-4 py-3">일정</th>
                          <th className="px-4 py-3">상태 / 신청 시작</th>
                          <th className="px-4 py-3">좌석</th>
                          <th className="px-4 py-3">신청자</th>
                          <th className="px-4 py-3">관리</th>
                        </tr>
                        <tr className="border-t border-slate-200 bg-white align-top text-left text-xs text-slate-500">
                          <th className="px-4 py-3"></th>
                          <th className="px-4 py-3">
                            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="날짜·반·시간 검색" className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-slate-500" />
                          </th>
                          <th className="px-4 py-3">
                            <div className="grid gap-2">
                              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-slate-500">
                                <option value="all">전체 상태</option>
                                <option value="open">접수 중</option>
                                <option value="closed">마감</option>
                                <option value="scheduled">오픈 예정</option>
                              </select>
                              <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-slate-500">
                                <option value="dateAsc">신청 시작 빠른순</option>
                                <option value="dateDesc">신청 시작 늦은순</option>
                                <option value="createdDesc">최근 생성순</option>
                              </select>
                            </div>
                          </th>
                          <th className="px-4 py-3">
                            <select value={seatFilter} onChange={(e) => setSeatFilter(e.target.value as SeatFilter)} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-slate-500">
                              <option value="all">전체 좌석</option>
                              <option value="available">여유 있음</option>
                              <option value="tight">1석 남음</option>
                              <option value="full">마감</option>
                            </select>
                          </th>
                          <th className="px-4 py-3">
                            <select value={applicantFilter} onChange={(e) => setApplicantFilter(e.target.value as ApplicantFilter)} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-slate-500">
                              <option value="all">전체 신청자</option>
                              <option value="none">0명</option>
                              <option value="has">1명 이상</option>
                              <option value="multi">2명 이상</option>
                            </select>
                          </th>
                          <th className="px-4 py-3">
                            <button type="button" onClick={resetFilters} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700">초기화</button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleSlots.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">현재 조건에 맞는 일정이 없습니다. 검색어나 상태 필터를 조정해 주세요.</td></tr>
                        )}
                        {visibleSlots.map((slot) => {
                          const isChecked = checkedSlotIds.includes(slot.id);
                          const slotReservations = reservationCountBySlotId.get(slot.id) ?? [];
                          const expanded = expandedSlotId === slot.id;
                          const occupancy = getOccupancy(slot);
                          return (
                            <React.Fragment key={slot.id}>
                              <tr className="border-b border-slate-100 align-top hover:bg-slate-50">
                                <td className="px-4 py-4 align-middle"><input type="checkbox" checked={isChecked} onChange={() => toggleSlotChecked(slot.id)} disabled={isBusy} className="h-4 w-4 rounded border-slate-300" /></td>
                                <td className="px-4 py-4">
                                  <p className="font-semibold text-slate-900">{formatKoreanDate(slot.date, slot.day_of_week)}</p>
                                  <p className="mt-1 text-sm text-slate-600">{getSlotLabel(slot)} · {getSlotTimeText(slot)}</p>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="space-y-2"><StatusPill slot={slot} /><p className="text-xs text-slate-500">{slot.open_at ? formatDateTime(slot.open_at) : '즉시 오픈'}</p></div>
                                </td>
                                <td className="px-4 py-4 min-w-[180px]">
                                  <div className="flex items-center justify-between text-xs text-slate-500"><span>{slot.reserved_count}/{slot.capacity}명</span><span>잔여 {getRemainingSeats(slot)}석</span></div>
                                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-slate-900" style={{ width: `${occupancy}%` }} /></div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-slate-700">{slotReservations.length}명</td>
                                <td className="px-4 py-4">
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => startEdit(slot)} disabled={isBusy} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:bg-slate-100 disabled:text-slate-400">수정</button>
                                    <button type="button" onClick={() => handleDelete(slot.id)} disabled={isBusy} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700 disabled:bg-slate-100 disabled:text-slate-400">{deletingSlotId === slot.id ? '삭제 중...' : '삭제'}</button>
                                    <button type="button" onClick={() => setExpandedSlotId(expanded ? null : slot.id)} disabled={isBusy} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700 disabled:bg-slate-100 disabled:text-slate-400">{expanded ? '닫기' : '신청자 보기'}</button>
                                  </div>
                                </td>
                              </tr>
                              {expanded && (
                                <tr className="border-b border-slate-100 bg-slate-50">
                                  <td colSpan={6} className="px-4 py-4">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                      <div className="mb-3 flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">해당 일정 신청자 목록</p><span className="text-xs text-slate-500">{slotReservations.length}명</span></div>
                                      <ReservationList reservations={slotReservations} isBusy={isBusy} deletingReservationId={deletingReservationId} onDelete={handleDeleteReservation} />
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'applicants' && (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">신청자관리</h2>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  전체 {reservations.length}건 · 검색 결과 {visibleReservations.length}건
                </div>
              </div>

              <div className="mt-5">
                <div className="space-y-4">
                  <input value={reservationSearchTerm} onChange={(e) => setReservationSearchTerm(e.target.value)} placeholder="학생명, 학교명, 전화번호, 반 이름으로 검색" className={inputClassName()} />

                  <div className="overflow-hidden rounded-[24px] border border-slate-200">
                    <div className="max-h-[920px] overflow-auto 2xl:max-h-[1080px]">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-[inset_0_-1px_0_0_rgba(226,232,240,1)]">
                          <tr className="text-left text-slate-500">
                            <th className="px-4 py-3">신청자</th>
                            <th className="px-4 py-3">학교 / 연락처</th>
                            <th className="px-4 py-3">신청 일정</th>
                            <th className="px-4 py-3">신청일시</th>
                            <th className="px-4 py-3">관리</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleReservations.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">검색 조건에 맞는 신청 내역이 없습니다.</td>
                            </tr>
                          )}
                          {visibleReservations.map((reservation) => (
                            <tr key={reservation.id} className="border-b border-slate-100 align-top">
                              <td className="px-4 py-4">
                                <p className="font-semibold text-slate-900">{reservation.student_name}</p>
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                <p>{reservation.school_name}</p>
                                <p className="mt-1 text-xs text-slate-500">{reservation.phone_number}</p>
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                <p>{reservation.slotDate ? formatDateOnlyKorean(reservation.slotDate) : '삭제된 일정'}</p>
                                <p className="mt-1 text-xs text-slate-500">{reservation.slotLabel} · {reservation.slotTime}</p>
                              </td>
                              <td className="px-4 py-4 text-slate-600">{formatDateTime(reservation.created_at)}</td>
                              <td className="px-4 py-4">
                                <button type="button" onClick={() => handleDeleteReservation(reservation.id)} disabled={isBusy} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700 disabled:bg-slate-100 disabled:text-slate-400">{deletingReservationId === reservation.id ? '삭제 중...' : '삭제'}</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
