import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareerCurve",
  description: "AI-driven resume analysis platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
