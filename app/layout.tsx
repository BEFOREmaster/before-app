import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BEFORE — 결제 전 후회 방지 통합 검색",
  description: "유튜브 실사용 · 네이버 후기 · 최저가 페이백 체감가를 월 0원 무료 스택으로 통합 검증",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#ECECEE] text-[#1D1D1F] antialiased">{children}</body>
    </html>
  );
}
