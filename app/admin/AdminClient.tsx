'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Reservation, ReservationSlot } from '@/lib/types';
import { formatKoreanDate } from '@/lib/utils';

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

export default function AdminClient({ initialSlots, initialReservations }: { initialSlots: ReservationSlot[]; initialReservations: Reservation[] }) {
  const [slots, setSlots] = useState(initialSlots);
  const [reservations, setReservations] = useState(initialReservations);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(initialSlots[0]?.id ?? null);
  const [checkedSlotIds, setCheckedSlotIds] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [timeLabel, setTimeLabel] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [openAt, setOpenAt] = useState('');
  const [openImmediately, setOpenImmediately] = useState(true);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkTimeLabel, setBulkTimeLabel] = useState('');
  const [bulkOpenAt, setBulkOpenAt] = useState('');
  const [bulkOpenImmediately, setBulkOpenImmediately] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const selectedReservations = useMemo(() => reservations.filter((item) => item.slot_id === selectedSlotId), [reservations, selectedSlotId]);
  const allChecked = slots.length > 0 && checkedSlotIds.length === slots.length;

  useEffect(() => {
    if (openImmediately && openAt) {
      setOpenAt('');
    }
  }, [openImmediately, openAt]);

  useEffect(() => {
    if (bulkOpenImmediately && bulkOpenAt) {
      setBulkOpenAt('');
    }
  }, [bulkOpenImmediately, bulkOpenAt]);

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
    setSelectedSlotId((prev) => {
      if (prev && nextSlots.some((slot: ReservationSlot) => slot.id === prev)) return prev;
      return nextSlots[0]?.id ?? null;
    });
  }

  function clearFeedback() {
    setMessage(null);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearFeedback();

    const method = editingId ? 'PUT' : 'POST';
    const normalizedOpenAt = openImmediately ? null : openAt;
    const payload = editingId
      ? { id: editingId, date, timeLabel, capacity, openAt: normalizedOpenAt }
      : { date, timeLabel, capacity, openAt: normalizedOpenAt };

    const res = await fetch('/api/admin/slots', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      if (editingId && json.error === '존재하지 않는 일정입니다.') {
        setEditingId(null);
        setError('수정 대상 일정이 더 이상 없어 등록 모드로 전환했습니다. 다시 등록해주세요.');
        return;
      }
      setError(json.error || '처리 중 오류가 발생했습니다.');
      return;
    }

    setMessage(editingId ? '일정을 수정했습니다.' : '일정을 등록했습니다.');
    resetForm();
    await refreshData();
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 이 일정을 삭제하시겠습니까?')) return;
    clearFeedback();
    const res = await fetch('/api/admin/slots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || '삭제 실패');
      return;
    }
    await refreshData();
    setMessage('일정을 삭제했습니다.');
  }

  async function handleBulkDelete() {
    if (checkedSlotIds.length === 0) {
      setError('삭제할 일정을 먼저 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${checkedSlotIds.length}개의 일정을 삭제하시겠습니까?`)) return;

    clearFeedback();

    const res = await fetch('/api/admin/slots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: checkedSlotIds }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error || '일괄 삭제 실패');
      return;
    }

    const count = checkedSlotIds.length;
    setCheckedSlotIds([]);
    setMessage(`${count}개의 일정을 삭제했습니다.`);
    await refreshData();
  }

  async function handleBulkUpdate() {
    if (checkedSlotIds.length === 0) {
      setError('수정할 일정을 먼저 선택해주세요.');
      return;
    }

    if (!bulkDate && !bulkTimeLabel && !bulkOpenImmediately && !bulkOpenAt) {
      setError('일괄 수정할 날짜, 제목 또는 신청 시작 설정을 입력해주세요.');
      return;
    }

    clearFeedback();

    const payload: Record<string, unknown> = { ids: checkedSlotIds };
    if (bulkDate) payload.date = bulkDate;
    if (bulkTimeLabel) payload.timeLabel = bulkTimeLabel;
    if (bulkOpenImmediately) {
      payload.openAt = null;
    } else if (bulkOpenAt) {
      payload.openAt = bulkOpenAt;
    }

    const res = await fetch('/api/admin/slots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error || '일괄 수정 실패');
      return;
    }

    setMessage(`${checkedSlotIds.length}개의 일정을 수정했습니다.`);
    resetBulkForm();
    await refreshData();
  }

  function startEdit(slot: ReservationSlot) {
    setEditingId(slot.id);
    setDate(slot.date);
    setTimeLabel(slot.time_label);
    setCapacity(slot.capacity);
    setOpenAt(toDateTimeLocalValue(slot.open_at));
    setOpenImmediately(!slot.open_at);
  }

  function resetForm() {
    setEditingId(null);
    setDate('');
    setTimeLabel('');
    setCapacity(4);
    setOpenAt('');
    setOpenImmediately(true);
  }

  function resetBulkForm() {
    setBulkDate('');
    setBulkTimeLabel('');
    setBulkOpenAt('');
    setBulkOpenImmediately(false);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setUploadFile(e.target.files?.[0] ?? null);
  }

  function toggleSlotChecked(id: string) {
    setCheckedSlotIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAllChecked() {
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
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await fetch('/api/admin/slots/import', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '일괄 업로드 실패');
      setMessage(`${json.count}개의 일정을 일괄 등록했습니다.`);
      setUploadFile(null);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 업로드 실패');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[440px_1fr]">
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">{editingId ? '일정 수정' : '일정 등록'}</h2>
          {editingId && <p className="mt-2 text-sm text-amber-700">현재 수정 모드입니다. 새 일정을 추가하려면 취소를 누르세요.</p>}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full rounded-xl border border-slate-300 px-3 py-3" />
            <input value={timeLabel} onChange={(e) => setTimeLabel(e.target.value)} required placeholder="예: 오전 08시" className="w-full rounded-xl border border-slate-300 px-3 py-3" />
            <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required className="w-full rounded-xl border border-slate-300 px-3 py-3" />
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={openImmediately} onChange={(e) => setOpenImmediately(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                즉시 신청 가능
              </label>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">신청 시작 일시</label>
                <input type="datetime-local" value={openAt} onChange={(e) => setOpenAt(e.target.value)} disabled={openImmediately} className="w-full rounded-xl border border-slate-300 px-3 py-3 disabled:bg-slate-100 disabled:text-slate-400" />
                <p className="mt-1 text-xs text-slate-500">즉시 신청 가능에 체크하면 시작 일시 없이 바로 신청 가능합니다.</p>
              </div>
            </div>
            {message && <p className="text-sm text-emerald-600">{message}</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <button className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">{editingId ? '일정 수정' : '일정 등록'}</button>
              {editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">취소</button>}
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">xlsx 일괄 업로드</h2>
          <p className="mt-2 text-sm text-slate-600">컬럼명은 <strong>date</strong>, <strong>time_label</strong>, <strong>capacity</strong>, <strong>open_at</strong> 를 사용해주세요.</p>
          <div className="mt-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">예시: 2026-05-01 / 오전 10시 / 6 / 2026-04-25T10:00</div>
          <form onSubmit={handleUpload} className="mt-4 space-y-4">
            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="block w-full text-sm" />
            <button disabled={uploading} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:bg-slate-100">
              {uploading ? '업로드 중...' : '엑셀로 일정 일괄 등록'}
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">등록된 일정</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-500">선택 {checkedSlotIds.length}개</span>
              <button type="button" onClick={handleBulkDelete} disabled={checkedSlotIds.length === 0} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400">
                선택 일정 삭제
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">선택 일정 일괄 수정</h3>
            <p className="mt-1 text-xs text-slate-500">비워둔 항목은 유지됩니다. 날짜, 제목, 신청 시작 설정만 한 번에 바꿀 수 있습니다.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3" />
              <input value={bulkTimeLabel} onChange={(e) => setBulkTimeLabel(e.target.value)} placeholder="새 일정 제목" className="w-full rounded-xl border border-slate-300 px-3 py-3" />
            </div>
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={bulkOpenImmediately} onChange={(e) => setBulkOpenImmediately(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                선택 일정 모두 즉시 신청 가능으로 변경
              </label>
              <input type="datetime-local" value={bulkOpenAt} onChange={(e) => setBulkOpenAt(e.target.value)} disabled={bulkOpenImmediately} className="w-full rounded-xl border border-slate-300 px-3 py-3 disabled:bg-slate-100 disabled:text-slate-400" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={handleBulkUpdate} disabled={checkedSlotIds.length === 0} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                선택 일정 일괄 수정
              </button>
              <button type="button" onClick={resetBulkForm} className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700">일괄 수정 입력 초기화</button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-3"><input type="checkbox" checked={allChecked} onChange={toggleAllChecked} aria-label="전체 선택" className="h-4 w-4 rounded border-slate-300" /></th>
                  <th className="px-3 py-3">날짜</th>
                  <th className="px-3 py-3">시간대</th>
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
                  return (
                    <tr key={slot.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 align-middle">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleSlotChecked(slot.id)} aria-label={`${slot.date} ${slot.time_label} 선택`} className="h-4 w-4 rounded border-slate-300" />
                      </td>
                      <td className="px-3 py-3">{formatKoreanDate(slot.date, slot.day_of_week)}</td>
                      <td className="px-3 py-3">{slot.time_label}</td>
                      <td className="px-3 py-3">{slot.capacity}명</td>
                      <td className="px-3 py-3">{slot.reserved_count}/{slot.capacity}</td>
                      <td className="px-3 py-3">{slot.open_at ? formatDateTime(slot.open_at) : '즉시'}</td>
                      <td className="px-3 py-3">{isClosed ? '마감' : '진행중'}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => startEdit(slot)} className="rounded-lg border border-slate-300 px-3 py-1.5">수정</button>
                          <button type="button" onClick={() => handleDelete(slot.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700">삭제</button>
                          <button type="button" onClick={() => setSelectedSlotId(slot.id)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700">신청자 보기</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">신청자 목록</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-3">학교</th>
                  <th className="px-3 py-3">학생명</th>
                  <th className="px-3 py-3">전화번호</th>
                  <th className="px-3 py-3">신청일시</th>
                </tr>
              </thead>
              <tbody>
                {selectedReservations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-500">선택된 일정의 신청자가 없습니다.</td>
                  </tr>
                ) : (
                  selectedReservations.map((reservation) => (
                    <tr key={reservation.id} className="border-b border-slate-100">
                      <td className="px-3 py-3">{reservation.school_name}</td>
                      <td className="px-3 py-3">{reservation.student_name}</td>
                      <td className="px-3 py-3">{reservation.phone_number}</td>
                      <td className="px-3 py-3">{formatDateTime(reservation.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
