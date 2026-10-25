import { ImageResponse } from "next/og";
import { getGraphicImages, loadClubData } from "@/lib/club";
import { Backdrop, display, drawable, dutchDate, graphicFonts, NameTag, palette, pngHeaders, Portrait, POST } from "@/lib/graphics";
import { formationSlots, graphicName, matchLineup, shortTeamName } from "@/lib/lineup";

// The "Opstelling" post: starting eleven on the formation, bench and head coach. 1080×1350 for Instagram.

// Where the pitch sits on the canvas: slot coordinates (0-100) map onto these pixel ranges for a card's centre.
const X0 = 70;
const XS = 9.4;
const Y0 = 232;
const YS = 8.4;
const CARD_W = 200;
const PHOTO = 158;

export async function GET(req: Request, ctx: RouteContext<"/c/[club]/matches/[id]/graphics/lineup">) {
  const { club: slug, id } = await ctx.params;
  const data = await loadClubData(slug);
  const match = data?.matches.find((m) => m.id === id);
  if (!data || !match) return new Response("Not found", { status: 404 });
  const { club, players } = data;
  const images = await getGraphicImages(slug);
  const p = palette(club.accent, club.gold);

  const { formation, ...picked } = matchLineup(match, players);
  const byId = new Map(players.map((pl) => [pl.id, pl]));
  const slots = formationSlots(formation);
  const bench = picked.bench.map((b) => byId.get(b)).filter((b) => b !== undefined);
  const name = (pid: string) => graphicName(byId.get(pid)!, players);
  const logo = drawable(images.logo);
  const coachPhoto = drawable(images.coach);
  const opponent = shortTeamName(match.opponent).toUpperCase();

  const download = new URL(req.url).searchParams.has("download")
    ? `opstelling-${match.date}-${opponent.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`
    : null;

  return new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", fontFamily: "DM Sans", color: "#fff" }}>
        <Backdrop p={p} logo={logo} />

        {/* Header */}
        <div style={{ position: "absolute", top: 54, left: 60, right: 60, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} width={112} height={112} style={{ objectFit: "contain" }} alt="" />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4, color: p.bright, maxWidth: 420 }}>{`${club.name.toUpperCase()} · MATCHDAY`}</div>
              <div style={{ ...display, fontSize: 118, marginTop: 4 }}>OPSTELLING</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", paddingTop: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, color: "#b9c6dc" }}>{dutchDate(match.date)}</div>
            <div style={{ ...display, fontSize: opponent.length > 16 ? 44 : 56, marginTop: 8, maxWidth: 440, textAlign: "right" }}>{`VS ${opponent}`}</div>
            <div style={{ ...display, display: "flex", background: p.bright, fontSize: 30, padding: "4px 14px 0", marginTop: 10 }}>{formation}</div>
          </div>
        </div>

        {/* Starting eleven */}
        {slots.map((s, i) => {
          const pid = picked.starters[i];
          const pl = pid ? byId.get(pid) : undefined;
          return (
            <div
              key={i}
              style={{ position: "absolute", left: X0 + s.x * XS - CARD_W / 2, top: Y0 + s.y * YS - (PHOTO + 40) / 2, width: CARD_W, display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <div style={{ display: "flex", width: PHOTO, height: PHOTO, backgroundImage: `radial-gradient(circle at 50% 62%, ${p.bright}99 0%, transparent 64%)` }}>
                <Portrait p={p} photo={pl ? (images.players.get(pl.id) ?? null) : null} number={pl?.number ?? null} size={PHOTO} />
              </div>
              <div style={{ display: "flex", marginTop: -12 }}>
                <NameTag p={p} pos={s.pos} name={pl ? name(pl.id) : "?"} size={30} />
              </div>
            </div>
          );
        })}

        {/* Bench and coach */}
        <div style={{ position: "absolute", left: 60, right: 60, top: 1146, display: "flex", alignItems: "flex-end", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {bench.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ ...display, fontSize: 36, color: p.bright, letterSpacing: 1 }}>WISSELS</div>
                <div style={{ display: "flex", flex: 1, height: 2, background: "rgba(255,255,255,0.18)" }} />
              </div>
            )}
            <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
              {bench.map((b) => (
                <div key={b.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 96 }}>
                  <Portrait p={p} photo={images.players.get(b.id) ?? null} number={b.number} size={78} round />
                  <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1, marginTop: 8, textAlign: "center" }}>{name(b.id)}</div>
                </div>
              ))}
            </div>
          </div>
          {club.coach.name && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ ...display, fontSize: 36, color: p.bright, letterSpacing: 1 }}>HOOFDTRAINER</div>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 10 }}>
                <div style={{ ...display, fontSize: 60 }}>{club.coach.name.toUpperCase()}</div>
                {coachPhoto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coachPhoto} width={118} height={118} style={{ borderRadius: 118, objectFit: "cover", border: `4px solid ${p.bright}` }} alt="" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    { ...POST, fonts: await graphicFonts(), headers: pngHeaders(download) },
  );
}
