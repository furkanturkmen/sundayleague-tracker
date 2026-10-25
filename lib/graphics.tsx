import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CSSProperties, ReactNode } from "react";
import { brighten } from "@/lib/color";

// Shared pieces for the social graphics, drawn by next/og (Satori). Satori only does flexbox, so every box
// with more than one child says display: flex, and it can't read WebP, so images come in as PNG or JPEG.

export const POST = { width: 1080, height: 1350 };

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));
const fontFiles = Promise.all([font("BebasNeue-Regular.ttf"), font("DMSans-Medium.ttf"), font("DMSans-Bold.ttf")]);

export async function graphicFonts() {
  const [bebas, medium, bold] = await fontFiles;
  return [
    { name: "Bebas Neue", data: bebas, weight: 400 as const, style: "normal" as const },
    { name: "DM Sans", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "DM Sans", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

/** WebP logos from before PNG-only uploads can't be drawn; those clubs get no crest until they upload again. */
export const drawable = (url: string | null | undefined) => (url && /^data:image\/(png|jpeg);/.test(url) ? url : null);

export interface Palette {
  /** Club colour, lifted so it reads on the dark background: labels, the formation chip, the bench title. */
  bright: string;
  accent: string;
  trim: string;
  bg: string;
}

export function palette(accent: string, trim: string): Palette {
  return { bright: brighten(accent), accent, trim, bg: "#040915" };
}

export const display: CSSProperties = { fontFamily: "Bebas Neue", fontWeight: 400, lineHeight: 1 };

/** Dark backdrop: a glow of the club colour, faint shirt stripes and the crest as a watermark. */
export function Backdrop({ p, logo }: { p: Palette; logo: string | null }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", background: p.bg }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", backgroundImage: `radial-gradient(circle at 50% 46%, ${p.bright}66 0%, ${p.accent}33 38%, transparent 68%)` }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex" }}>
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i} style={{ width: 60, height: "100%", background: i % 2 ? "rgba(255,255,255,0.025)" : "transparent" }} />
        ))}
      </div>
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} width={640} height={640} style={{ position: "absolute", left: 220, top: 380, objectFit: "contain", opacity: 0.06 }} alt="" />
      )}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", backgroundImage: `linear-gradient(to bottom, ${p.bg} 0%, transparent 16%, transparent 80%, ${p.bg} 100%)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, display: "flex", gap: 14 }}>
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} style={{ flex: 1, background: p.bright }} />
        ))}
      </div>
    </div>
  );
}

/** A striped shirt in the club colours, for players without a photo. The number sits on top as text. */
function shirtSvg(p: Palette): string {
  const body = "M31 10 L42 5 Q50 12 58 5 L69 10 L95 25 L85 45 L74 39 L74 96 L26 96 L26 39 L15 45 L5 25 Z";
  const stripes = Array.from({ length: 9 }, (_, i) => `<rect x="${i * 12 - 4}" y="0" width="6" height="100" fill="${p.trim}"/>`).join("");
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><clipPath id="s"><path d="${body}"/></clipPath></defs>` +
      `<g clip-path="url(#s)"><rect width="100" height="100" fill="${p.accent}"/>${stripes}</g>` +
      `<path d="${body}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/></svg>`,
  ).toString("base64")}`;
}

/** A player's photo, or the shirt with their number when there's none. */
export function Portrait({ p, photo, number, size, round = false }: { p: Palette; photo: string | null; number: number | null; size: number; round?: boolean }) {
  const frame: CSSProperties = round
    ? { borderRadius: size, overflow: "hidden", border: `3px solid ${p.bright}`, background: `linear-gradient(to bottom, ${p.accent}, ${p.bg})` }
    : {};
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "flex-end", justifyContent: "center", ...frame }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} width={size} height={size} style={{ objectFit: "cover" }} alt="" />
      ) : (
        // The shirt as a background with the number as plain text on it: Satori misplaces absolutely positioned images.
        <div
          style={{
            ...display,
            width: size,
            height: size,
            display: "flex",
            justifyContent: "center",
            paddingTop: size * (round ? 0.38 : 0.33),
            backgroundImage: `url(${shirtSvg(p)})`,
            backgroundSize: `${size * (round ? 0.72 : 0.86)}px ${size * (round ? 0.72 : 0.86)}px`,
            backgroundPosition: `${size * (round ? 0.14 : 0.07)}px ${size * (round ? 0.16 : 0.08)}px`,
            backgroundRepeat: "no-repeat",
            fontSize: size * (round ? 0.28 : 0.32),
            color: "#fff",
          }}
        >
          {number != null ? String(number) : ""}
        </div>
      )}
    </div>
  );
}

/** Position chip and name, as on the reference post: "CDM | BURAK C". */
export function NameTag({ p, pos, name, size = 30 }: { p: Palette; pos?: string; name: ReactNode; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", boxShadow: "0 6px 18px rgba(0,0,0,0.45)" }}>
      {pos && (
        <div style={{ ...display, display: "flex", alignItems: "center", background: p.bright, color: "#fff", fontSize: size * 0.62, padding: "0 8px", letterSpacing: 1 }}>{pos}</div>
      )}
      <div style={{ ...display, display: "flex", alignItems: "center", background: "#fff", color: "#07101f", fontSize: size, padding: `${size * 0.12}px ${size * 0.36}px 0`, letterSpacing: 1 }}>
        {name}
      </div>
    </div>
  );
}

/** "zondag 25 oktober" in capitals. The graphics are in Dutch, like the posts they replace. */
export const dutchDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).toUpperCase();

export const pngHeaders = (download: string | null) => ({
  "Cache-Control": "no-store",
  ...(download ? { "Content-Disposition": `attachment; filename="${download}"` } : {}),
});
