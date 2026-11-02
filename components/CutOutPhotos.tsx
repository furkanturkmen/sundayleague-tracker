"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/I18n";
import { PHOTO_PX } from "@/components/forms";
import type { FormState } from "@/lib/actions";
import { cutOut, headOut } from "@/lib/cutout";

/** `cut`: the photo is already a cut-out and only needs its head (again, when the head cutter has changed). */
type Photo = { id: string; name: string; url: string; cut: boolean };

/**
 * Photos saved before cut-outs existed, or brought in from voetbal.nl, still have their background, and none has
 * a head for the shirt yet. This cuts them out one by one in the browser and saves each. Ones with nobody clear in
 * them are left as they are.
 */
export function CutOutPhotos({
  photos,
  save,
  done,
}: {
  photos: Photo[];
  save: (id: string, photo: string | null, head: string | null) => Promise<FormState>;
  done: () => Promise<void>;
}) {
  const t = useT();
  const router = useRouter();
  const [at, setAt] = useState<number | null>(null);
  const [result, setResult] = useState<{ cut: number; kept: string[]; failed: boolean } | null>(null);
  if (!photos.length && !result) return null;

  async function run() {
    let cut = 0;
    const kept: string[] = [];
    let failed = false;
    for (let i = 0; i < photos.length; i++) {
      setAt(i);
      const p = photos[i];
      try {
        const [png, head] = await Promise.all([p.cut ? null : cutOut(p.url, PHOTO_PX), headOut(p.url, PHOTO_PX)]);
        if (!png && !head) {
          // Marked as tried, so it isn't offered again.
          await save(p.id, null, null);
          kept.push(p.name);
          continue;
        }
        const res = await save(p.id, png, head);
        if (res.error) kept.push(p.name);
        else cut++;
      } catch {
        // No model (offline) or a photo that wouldn't load: stop rather than fail every one the same way.
        failed = true;
        break;
      }
    }
    if (cut) await done();
    setAt(null);
    setResult({ cut, kept, failed });
    router.refresh();
  }

  return (
    <div className="cutout-photos">
      {at !== null ? (
        <p role="status">{t("Cutting out {n} of {total}…", { n: at + 1, total: photos.length })}</p>
      ) : result ? (
        <p role="status">
          {t(result.cut === 1 ? "{n} photo cut out." : "{n} photos cut out.", { n: result.cut })}
          {result.kept.length > 0 && <> {t("No clear person in: {names}. Those stay as they are.", { names: result.kept.join(", ") })}</>}
          {result.failed && <> {t("Couldn't load the cut-out tool. Check the connection and try again.")}</>}
        </p>
      ) : (
        <>
          <p>
            {t(photos.length === 1 ? "{n} photo isn't cut out yet." : "{n} photos aren't cut out yet.", { n: photos.length })}{" "}
            {t("Cut them out so the players wear the shirt on their pages, and stand free in the graphics.")}
          </p>
          <button type="button" className="btn" onClick={run}>
            {t("Cut out photos")}
          </button>
        </>
      )}
    </div>
  );
}
