'use client';

import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Reservation, ReservationSlot } from '@/lib/types';
import { formatKoreanDate, getSlotLabel, getSlotTimeText } from '@/lib/utils';
import { getSlotTone } from '@/lib/slotTone';

type BulkOpenMode = 'keep' | 'immediate' | 'datetime';

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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);
  const [deletingReservationId, setDeletingReservationId] = useState<string | null>(null);

  const slotsById = useMemo(() => new Map(slots.map((slot) => [slot.id, slot])), [slots]);
  const allChecked = slots.length > 0 && checkedSlotIds.length === slots.length;
  const isBusy =
    submitting ||
    uploading ||
    bulkUpdating ||
    bulkDeleting ||
    deletingSlotId !== null ||
    deletingReservationId !== null;

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
    setCheckedSlotIds((prev) =>
      prev.filter((id) => nextSlots.some((slot: ReservationSlot) => slot.id === id))
    );
    setExpandedSlotId((prev) =>
      prev && nextSlots.some((slot: ReservationSlot) => slot.id === prev) ? prev : null
    );
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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setUploadFile(e.target.files?.[0] ?? null);
  }

  function toggleSlotChecked(id: string) {
    if (isBusy) return;
    setCheckedSlotIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAllChecked() {
    if (isBusy) return;
    setCheckedSlotIds((prev) => (prev.length === slots.length ? [] : slots.map((slot) => slot.id)));
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
    <div className="grid gap-8 lg:grid-cols-[440px_1fr]">
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{editingId ? '일정 수정' : '일정 등록'}</h2>
            {submitting && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                저장 중...
              </span>
            )}
          </div>

          {editingId && (
            <p className="mt-2 text-sm text-amber-700">
              현재 수정 모드입니다. 새 일정을 추가하려면 취소를 누르세요.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <fieldset disabled={submitting || bulkUpdating || bulkDeleting || uploading} className="space-y-4 disabled:opacity-60">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-3"
              />
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                placeholder="반 이름"
                className="w-full rounded-xl border border-slate-300 px-3 py-3"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                />
              </div>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-3"
              />
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={openImmediately}
                    onChange={(e) => setOpenImmediately(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  즉시 신청 가능
                </label>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">신청 시작 일시</label>
                  <input
                    type="datetime-local"
                    value={openAt}
                    onChange={(e) => setOpenAt(e.target.value)}
                    disabled={openImmediately}
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>
            </fieldset>

            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                disabled={submitting || bulkUpdating || bulkDeleting || uploading}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {submitting ? (editingId ? '수정 중...' : '등록 중...') : editingId ? '일정 수정' : '일정 등록'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting || bulkUpdating || bulkDeleting || uploading}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                >
                  취소
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">xlsx 일괄 업로드</h2>
            {uploading && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                업로드 중...
              </span>
            )}
          </div>

          <form onSubmit={handleUpload} className="mt-4 space-y-4">
            <fieldset disabled={uploading || submitting || bulkUpdating || bulkDeleting} className="space-y-4 disabled:opacity-60">
              <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="block w-full text-sm" />
              <button
                disabled={uploading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:bg-slate-100"
              >
                {uploading ? '업로드 중...' : '엑셀로 일정 일괄 등록'}
              </button>
            </fieldset>
          </form>
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">등록된 일정</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-500">선택 {checkedSlotIds.length}개</span>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={checkedSlotIds.length === 0 || isBusy}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {bulkDeleting ? '삭제 중...' : '선택 일정 삭제'}
              </button>
            </div>
          </div>

          {(bulkUpdating || bulkDeleting) && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              {bulkUpdating
                ? `선택한 일정 ${checkedSlotIds.length}개를 수정하는 중입니다...`
                : `선택한 일정 ${checkedSlotIds.length}개를 삭제하는 중입니다...`}
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">선택 일정 일괄 수정</h3>

            <fieldset disabled={bulkUpdating || bulkDeleting || submitting || uploading} className="mt-4 space-y-4 disabled:opacity-60">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                />
                <input
                  value={bulkLabel}
                  onChange={(e) => setBulkLabel(e.target.value)}
                  placeholder="새 반 이름"
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                />
                <input
                  type="time"
                  value={bulkStartTime}
                  onChange={(e) => setBulkStartTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                />
                <input
                  type="time"
                  value={bulkEndTime}
                  onChange={(e) => setBulkEndTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-700">신청 시작 설정</p>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="bulk-open-mode"
                    checked={bulkOpenMode === 'keep'}
                    onChange={() => setBulkOpenMode('keep')}
                    className="h-4 w-4"
                  />
                  현재 설정 유지
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="bulk-open-mode"
                    checked={bulkOpenMode === 'immediate'}
                    onChange={() => setBulkOpenMode('immediate')}
                    className="h-4 w-4"
                  />
                  선택 일정 모두 즉시 신청 가능으로 변경
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="bulk-open-mode"
                    checked={bulkOpenMode === 'datetime'}
                    onChange={() => setBulkOpenMode('datetime')}
                    className="h-4 w-4"
                  />
                  특정 신청 시작 일시로 변경
                </label>
                <input
                  type="datetime-local"
                  value={bulkOpenAt}
                  onChange={(e) => setBulkOpenAt(e.target.value)}
                  disabled={bulkOpenMode !== 'datetime'}
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleBulkUpdate}
                  disabled={checkedSlotIds.length === 0 || isBusy}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {bulkUpdating ? '일괄 수정 중...' : '선택 일정 일괄 수정'}
                </button>
                <button
                  type="button"
                  onClick={resetBulkForm}
                  disabled={isBusy}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  일괄 수정 입력 초기화
                </button>
              </div>
            </fieldset>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAllChecked}
                      aria-label="전체 선택"
                      disabled={isBusy}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="px-3 py-3">날짜</th>
                  <th className="px-3 py-3">반 / 시간</th>
                  <th className="px-3 py-3">정원</th>
                  <th className="px-3 py-3">현황</th>
                  <th className="px-3 py-3">신청 시작</th>
                  <th className="px-3 py-3">상태</th>
                  <th className="px-3 py-3">관리</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => {
                  const isClosed = slot.is_closed || slot.reserved_count >= slot.capacity;
                  const isChecked = checkedSlotIds.includes(slot.id);
                  const slotReservations = reservations.filter((reservation) => reservation.slot_id === slot.id);
                  const expanded = expandedSlotId === slot.id;
                  const tone = getSlotTone(slot);

                  return (
                    <React.Fragment key={slot.id}>
                      <tr className={`border-b border-slate-100 ${tone.row}`}>
                        <td className="px-3 py-3 align-middle">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSlotChecked(slot.id)}
                            disabled={isBusy}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-medium text-slate-800">
                            {formatKoreanDate(slot.date, slot.day_of_week)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className={`inline-flex flex-col rounded-2xl px-3 py-2 text-xs font-semibold ${tone.badge}`}>
                            <span className="break-keep">{getSlotLabel(slot)}</span>
                            <span className="mt-0.5 whitespace-nowrap text-[11px] font-medium">{getSlotTimeText(slot)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">{slot.capacity}명</td>
                        <td className="px-3 py-3">
                          {slot.reserved_count}/{slot.capacity}
                        </td>
                        <td className="px-3 py-3">{slot.open_at ? formatDateTime(slot.open_at) : '즉시'}</td>
                        <td className="px-3 py-3">{isClosed ? '마감' : '진행중'}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(slot)}
                              disabled={isBusy}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(slot.id)}
                              disabled={isBusy}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {deletingSlotId === slot.id ? '삭제 중...' : '삭제'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedSlotId(expanded ? null : slot.id)}
                              disabled={isBusy}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {expanded ? '닫기' : '신청자 보기'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expanded && (
                        <tr className={`border-b border-slate-100 ${tone.row}`}>
                          <td colSpan={8} className="px-4 py-4">
                            <div className={`rounded-xl border bg-white p-4 ${tone.border}`}>
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900">해당 일정 신청자 목록</p>
                                <span className="text-xs text-slate-500">{slotReservations.length}명</span>
                              </div>

                              {slotReservations.length === 0 ? (
                                <p className="text-sm text-slate-500">신청자가 없습니다.</p>
                              ) : (
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
                                      {slotReservations.map((reservation) => (
                                        <tr key={reservation.id} className="border-b border-slate-100">
                                          <td className="px-3 py-2">{reservation.school_name}</td>
                                          <td className="px-3 py-2">{reservation.student_name}</td>
                                          <td className="px-3 py-2">{reservation.phone_number}</td>
                                          <td className="px-3 py-2">{formatDateTime(reservation.created_at)}</td>
                                          <td className="px-3 py-2">
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteReservation(reservation.id)}
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
                              )}
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
      </section>
    </div>
  );
}