import { ImageResponse } from "next/og";
import { getGraphicImages, loadClubData } from "@/lib/club";
import { Backdrop, display, drawable, graphicFonts, palette, pngHeaders, POST } from "@/lib/graphics";
import { graphicName } from "@/lib/lineup";
import { getRanking } from "@/lib/rankings";
import { analyse } from "@/lib/stats";

// The "Ranglijst" post: a title and the players best first, in two columns once the list is long. 1080×1350.

const MAX_ROWS = 20;
const LIST_TOP = 430;
const LIST_BOTTOM = 84;
const GAP = 16;

export async function GET(req: Request, ctx: RouteContext<"/c/[club]/stats/rankings/[id]/graphic">) {
  const { club: slug, id } = await ctx.params;
  const data = await loadClubData(slug);
  const ranking = data && getRanking(data, analyse(data), id);
  if (!data || !ranking) return new Response("Not found", { status: 404 });
  const { club, players } = data;
  const p = palette(club.accent, club.gold);
  const logo = drawable((await getGraphicImages(slug)).logo);
  const byId = new Map(players.map((pl) => [pl.id, pl]));

  // The editor's unsaved list (?t=Snelste&a=van het team&p=id,id), so the preview redraws before saving.
  const params = new URL(req.url).searchParams;
  const preview = !ranking.auto && params.has("p");
  const title = preview ? (params.get("t") ?? "").slice(0, 40).toUpperCase() : ranking.graphic.title;
  const accent = preview ? (params.get("a") ?? "").slice(0, 40).toUpperCase() : ranking.graphic.accent;
  const rows = (
    preview
      ? (params.get("p") ?? "").split(",").filter((pid) => byId.has(pid)).map((pid) => ({ player: byId.get(pid)!, value: undefined }))
      : ranking.rows
  ).slice(0, MAX_ROWS);

  // Long lists split into two columns, read down the left first. Rows share the height that's left.
  const cols = rows.length > 7 ? 2 : 1;
  const perCol = Math.max(1, Math.ceil(rows.length / cols));
  const rowH = Math.min(118, Math.floor((POST.height - LIST_TOP - LIST_BOTTOM - GAP * (perCol - 1)) / perCol));
  const columns = Array.from({ length: cols }, (_, c) => rows.slice(c * perCol, (c + 1) * perCol).map((r, i) => ({ ...r, place: c * perCol + i + 1 })));
  const titleLength = `${title} ${accent}`.trim().length;
  const titleSize = titleLength > 26 ? 96 : titleLength > 18 ? 122 : 150;

  const download = params.has("download")
    ? `ranglijst-${`${title} ${accent}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lijst"}.png`
    : null;

  return new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", fontFamily: "DM Sans", color: "#fff" }}>
        <Backdrop p={p} logo={null} />

        <div style={{ position: "absolute", top: 64, left: 60, right: 60, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} width={104} height={104} style={{ objectFit: "contain" }} alt="" />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 5, color: p.bright }}>{club.name.toUpperCase()}</div>
              <div style={{ ...display, fontSize: 72, marginTop: 2, letterSpacing: 1 }}>RANGLIJST</div>
            </div>
          </div>
          <div style={{ ...display, display: "flex", flexWrap: "wrap", columnGap: titleSize * 0.22, marginTop: 34, fontSize: titleSize, letterSpacing: 1 }}>
            {title.split(/\s+/).filter(Boolean).map((w, i) => (
              <span key={`t${i}`}>{w}</span>
            ))}
            {accent.split(/\s+/).filter(Boolean).map((w, i) => (
              <span key={`a${i}`} style={{ color: p.bright }}>{w}</span>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", top: LIST_TOP, left: 60, right: 60, bottom: LIST_BOTTOM, display: "flex", gap: 24 }}>
          {rows.length === 0 && <div style={{ ...display, fontSize: 64, color: "#8d9bb3" }}>NOG NIEMAND OP DE LIJST</div>}
          {columns.map((col, c) => (
            <div key={c} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: cols === 1 ? "center" : "flex-start", gap: GAP }}>
              {col.map(({ player, value, place }) => {
                const podium = place <= 3;
                return (
                  <div
                    key={player.id}
                    style={{
                      display: "flex",
                      height: rowH,
                      borderRadius: 12,
                      overflow: "hidden",
                      border: podium ? "3px solid rgba(255,255,255,0.92)" : "2px solid rgba(255,255,255,0.08)",
                      backgroundImage: podium ? `linear-gradient(90deg, ${p.accent}, #0b1a33)` : "linear-gradient(90deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04))",
                      boxShadow: podium ? `0 0 34px ${p.bright}55` : "none",
                    }}
                  >
                    <div
                      style={{
                        ...display,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: rowH * 0.95,
                        paddingTop: rowH * 0.08,
                        fontSize: rowH * 0.56,
                        background: podium ? p.bright : `${p.bright}66`,
                      }}
                    >
                      {String(place)}
                    </div>
                    <div style={{ ...display, flex: 1, display: "flex", alignItems: "center", padding: `${rowH * 0.08}px ${rowH * 0.3}px 0`, fontSize: rowH * 0.5, letterSpacing: 1 }}>
                      {graphicName(player, players)}
                    </div>
                    {value !== undefined && (
                      <div style={{ ...display, display: "flex", alignItems: "center", paddingTop: rowH * 0.08, paddingRight: rowH * 0.3, fontSize: rowH * 0.56, color: podium ? "#fff" : p.bright }}>
                        {String(value)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...POST, fonts: await graphicFonts(), headers: pngHeaders(download) },
  );
}
