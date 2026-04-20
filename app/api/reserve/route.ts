import { NextRequest, NextResponse } from 'next/server';
import { createReservations } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slotIds, phoneNumber, students } = body as {
      slotIds?: string[];
      phoneNumber?: string;
      students?: Array<{ schoolName?: string; studentName?: string }>;
    };

    if (!slotIds?.length || !phoneNumber || !students?.length) {
      return NextResponse.json({ error: '전화번호, 학생 정보, 선택 일정 5개를 모두 입력해주세요.' }, { status: 400 });
    }

    const data = await createReservations({
      slotIds,
      phoneNumber,
      students: students.map((item) => ({
        schoolName: item.schoolName ?? '',
        studentName: item.studentName ?? '',
      })),
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '신청 처리 중 오류가 발생했습니다.' }, { status: 400 });
  }
}
