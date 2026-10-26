import type { Metadata } from "next";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { Bebas_Neue, DM_Sans, Geist } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// The stylesheet is imported above; stop Font Awesome injecting it again at runtime.
config.autoAddCss = false;

const display = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
// The redesign's type: a modern grotesk for big names and numbers.
const grotesk = Geist({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: { default: "Sunday League Tracker", template: "%s" },
  description: "Results, player stats, records, analysis and the halls of fame and shame for Sunday league clubs.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${body.variable} ${grotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
