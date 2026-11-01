"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/I18n";

type Size = "post" | "story";

const SIZES: { size: Size; label: string }[] = [
  { size: "post", label: "post" },
  { size: "story", label: "story" },
];

/** The graphic as a file, named the way the route names its downloads ("…-story.png" for a story). */
async function fetchGraphic(src: string, size: Size): Promise<File> {
  const url = `${src}${src.includes("?") ? "&" : "?"}download=1${size === "story" ? "&size=story" : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  const name = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `graphic${size === "story" ? "-story" : ""}.png`;
  return new File([await res.blob()], name, { type: "image/png" });
}

function save(file: File) {
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Share a graphic as an Instagram post (1080×1350) or story (1080×1920). On a phone it opens the share sheet with
 * the image, so it goes straight into Instagram, WhatsApp or wherever; where files can't be shared it downloads.
 */
export function ShareGraphic({ src, className }: { src: string; className?: string }) {
  // Known only in the browser; until then the buttons say Share, which is what phones will show.
  const [canShare, setCanShare] = useState(true);
  const [busy, setBusy] = useState<Size | null>(null);
  // A file made but not shared yet: Safari drops the tap if the image took too long, so the next tap shares it at once.
  const [ready, setReady] = useState<{ size: Size; src: string; file: File } | null>(null);
  const [error, setError] = useState(false);
  const t = useT();

  useEffect(() => {
    const probe = new File([], "x.png", { type: "image/png" });
    setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
  }, []);

  async function share(size: Size) {
    setError(false);
    let file = ready?.size === size && ready.src === src ? ready.file : null;
    try {
      if (!file) {
        setBusy(size);
        file = await fetchGraphic(src, size);
      }
      if (!canShare) {
        save(file);
        setReady(null);
        return;
      }
      await navigator.share({ files: [file] });
      setReady(null);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "AbortError") setReady(null);
      else if (name === "NotAllowedError" && file) setReady({ size, src, file });
      else setError(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`gx-share${className ? ` ${className}` : ""}`}>
      {SIZES.map(({ size, label }) => (
        <button key={size} type="button" className="btn" onClick={() => share(size)} disabled={busy !== null} aria-busy={busy === size}>
          {busy === size
            ? t("Making…")
            : ready?.size === size && ready.src === src
              ? t(`Tap to share ${label}`)
              : t(`${canShare ? "Share" : "Download"} ${label}`)}
        </button>
      ))}
      {error && (
        <span className="gx-share-error" role="alert">
          {t("Couldn't make the image. Try again.")}
        </span>
      )}
    </div>
  );
}
