import { ImageResponse } from "next/og";
import { getGraphicImages, loadClubData } from "@/lib/club";
import { Backdrop, competitionLabel, display, drawable, dutchDate, graphicFonts, Kicker, opponentLogo, palette, pngHeaders, POST, TeamBlock } from "@/lib/graphics";
import { shortTeamName } from "@/lib/lineup";

// The matchday poster: both crests, the date, kick-off and home or away. 1080×1350 for Instagram.

export async function GET(req: Request, ctx: RouteContext<"/c/[club]/matches/[id]/graphics/matchday">) {
  const { club: slug, id } = await ctx.params;
  const data = await loadClubData(slug);
  const match = data?.matches.find((m) => m.id === id);
  if (!data || !match) return new Response("Not found", { status: 404 });
  const { club } = data;
  const [images, theirLogo] = await Promise.all([getGraphicImages(slug), opponentLogo(match.opponentCode)]);
  const p = palette(club.accent, club.gold);
  const ourLogo = drawable(images.logo);
  const opponent = shortTeamName(match.opponent);
  const home = match.venue === "H" ? { logo: ourLogo, name: club.name } : { logo: theirLogo, name: opponent };
  const away = match.venue === "H" ? { logo: theirLogo, name: opponent } : { logo: ourLogo, name: club.name };

  const download = new URL(req.url).searchParams.has("download") ? `matchday-${match.date}.png` : null;

  return new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", fontFamily: "DM Sans", color: "#fff" }}>
        <Backdrop p={p} logo={null} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "76px 60px 110px" }}>
          <Kicker p={p}>{`${club.name.toUpperCase()} · ${competitionLabel(match.competition, club.voetbal?.league)}`}</Kicker>
          <div style={{ ...display, fontSize: 230, marginTop: 6, letterSpacing: 2 }}>MATCHDAY</div>

          <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "space-around" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TeamBlock p={p} logo={home.logo} name={home.name} size={270} />
            <div style={{ ...display, fontSize: 96, color: p.bright, margin: "0 6px 80px" }}>VS</div>
            <TeamBlock p={p} logo={away.logo} name={away.name} size={270} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 5, color: "#c3cfe2" }}>{dutchDate(match.date)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 20 }}>
              {match.kickoff && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 5, color: p.bright }}>AFTRAP</div>
                  <div style={{ ...display, fontSize: 130, marginTop: 6 }}>{match.kickoff}</div>
                </div>
              )}
              <div style={{ ...display, display: "flex", background: match.venue === "H" ? p.bright : "#fff", color: match.venue === "H" ? "#fff" : "#07101f", fontSize: 46, padding: "8px 22px 2px" }}>
                {match.venue === "H" ? "THUIS" : "UIT"}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    ),
    { ...POST, fonts: await graphicFonts(), headers: pngHeaders(download) },
  );
}
