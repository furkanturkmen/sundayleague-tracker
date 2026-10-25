import type { Metadata } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const display = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: "Sunday League Tracker", template: "%s" },
  description: "Results, player stats, records, analysis and the halls of fame and shame for Sunday league clubs.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
