import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const display = Geist({ subsets: ["latin"], weight: ["200", "300", "500"], variable: "--font-display" });
const body = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Pointage",
  description: "Pointage et rattrapage des heures",
  appleWebApp: { capable: true, title: "Pointage", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
