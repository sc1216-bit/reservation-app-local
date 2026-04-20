import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { isAdminAuthenticated } from '@/lib/admin';
import { createSlotsBulk } from '@/lib/store';
import { normalizeClockTime } from '@/lib/utils';

function excelDateToYmd(value: number) {
  const parsed = XLSX.SSF.parse_date_code(value);
  if (!parsed) {
    throw new Error('엑셀 날짜 값을 해석할 수 없습니다.');
  }

  const yyyy = String(parsed.y).padStart(4, '0');
  const mm = String(parsed.m).padStart(2, '0');
  const dd = String(parsed.d).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeDate(value: unknown, rowNumber: number) {
  if (typeof value === 'number') {
    return excelDateToYmd(value);
  }

  const raw = String(value ?? '').trim();
  if (!raw) {
    throw new Error(`${rowNumber}행: date 값을 입력해주세요.`);
  }

  const slashMatch = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (slashMatch) {
    const [, y, m, d] = slashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  throw new Error(`${rowNumber}행: date 형식이 올바르지 않습니다. YYYY-MM-DD 형식 또는 엑셀 날짜 셀을 사용해주세요.`);
}

function normalizeOpenAt(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      throw new Error('신청 시작 시간을 해석할 수 없습니다.');
    }

    const yyyy = String(parsed.y).padStart(4, '0');
    const mm = String(parsed.m).padStart(2, '0');
    const dd = String(parsed.d).padStart(2, '0');
    const hh = String(parsed.H ?? 0).padStart(2, '0');
    const min = String(parsed.M ?? 0).padStart(2, '0');
    const ss = String(parsed.S ?? 0).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
  }

  const raw = String(value).trim();
  return raw || null;
}

function normalizeTime(value: unknown, rowNumber: number, fieldName: 'start_time' | 'end_time') {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      throw new Error(`${rowNumber}행: ${fieldName} 값을 해석할 수 없습니다.`);
    }
    return normalizeClockTime(`${String(parsed.H ?? 0).padStart(2, '0')}:${String(parsed.M ?? 0).padStart(2, '0')}`);
  }

  const raw = String(value ?? '').trim();
  if (!raw) {
    throw new Error(`${rowNumber}행: ${fieldName} 값을 입력해주세요.`);
  }

  return normalizeClockTime(raw);
}

function normalizeRow(row: Record<string, unknown>, index: number) {
  const rowNumber = index + 2;
  const date = normalizeDate(row.date, rowNumber);
  const label = String(row.label ?? '').trim();
  const startTime = normalizeTime(row.start_time, rowNumber, 'start_time');
  const endTime = normalizeTime(row.end_time, rowNumber, 'end_time');
  const capacityRaw = row.capacity;
  const openAt = normalizeOpenAt(row.open_at);
  const capacity = Number(capacityRaw);

  if (!label || capacityRaw === '' || capacityRaw === null || capacityRaw === undefined) {
    throw new Error(`${rowNumber}행: date, label, start_time, end_time, capacity 값을 모두 입력해주세요.`);
  }

  if (startTime >= endTime) {
    throw new Error(`${rowNumber}행: end_time은 start_time보다 늦어야 합니다.`);
  }

  if (!Number.isFinite(capacity) || capacity < 1) {
    throw new Error(`${rowNumber}행: capacity는 1 이상의 숫자여야 합니다.`);
  }

  return {
    date,
    label,
    startTime,
    endTime,
    capacity,
    openAt,
  };
}

export async function POST(request: NextRequest) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'xlsx 파일을 업로드해주세요.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: false,
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: '엑셀 시트를 찾을 수 없습니다.' }, { status: 400 });
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      defval: '',
      raw: true,
    });

    if (!rows.length) {
      return NextResponse.json({ error: '업로드할 일정 데이터가 없습니다.' }, { status: 400 });
    }

    const inputs = rows.map((row, index) => normalizeRow(row, index));
    const created = await createSlotsBulk(inputs);

    return NextResponse.json({
      success: true,
      count: created.length,
      slots: created,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '일괄 업로드 실패' },
      { status: 400 }
    );
  }
}
