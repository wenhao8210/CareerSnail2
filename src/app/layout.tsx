import "./globals.css";
import type { Metadata } from "next";
import AuthHeader from "./components/AuthHeader";
import NewFeaturePopup from "./components/NewFeaturePopup";

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
      <body>
        <AuthHeader />
        {children}
        <NewFeaturePopup />
      </body>
    </html>
  );
}
