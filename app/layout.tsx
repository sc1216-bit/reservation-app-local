import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '신청 페이지',
  description: '로컬 파일 기반 신청/관리 페이지',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
