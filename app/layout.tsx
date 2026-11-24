import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";

const display = Unbounded({ subsets: ["latin"], weight: ["300", "500"], variable: "--font-display" });
const body = Manrope({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Pointage",
  description: "Pointage et rattrapage des heures",
  appleWebApp: { capable: true, title: "Pointage", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#05071a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
