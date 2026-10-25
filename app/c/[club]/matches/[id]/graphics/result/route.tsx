import { ImageResponse } from "next/og";
import { getGraphicImages, loadClubData } from "@/lib/club";
import {
  Backdrop,
  competitionLabel,
  display,
  drawable,
  dutchDate,
  graphicFonts,
  Kicker,
  NameTag,
  opponentLogo,
  palette,
  pngHeaders,
  Portrait,
  POST,
  TeamBlock,
} from "@/lib/graphics";
import { graphicName, shortTeamName } from "@/lib/lineup";
import { analyse } from "@/lib/stats";

// The full-time poster: score, our scorers and the man of the match. 1080×1350 for Instagram.

export async function GET(req: Request, ctx: RouteContext<"/c/[club]/matches/[id]/graphics/result">) {
  const { club: slug, id } = await ctx.params;
  const data = await loadClubData(slug);
  const m = data && analyse(data).getPlayed(id);
  if (!data || !m) return new Response("No result for this match yet", { status: 404 });
  const { club, players } = data;
  const [images, theirLogo] = await Promise.all([getGraphicImages(slug), opponentLogo(m.opponentCode)]);
  const p = palette(club.accent, club.gold);
  const ourLogo = drawable(images.logo);
  const opponent = shortTeamName(m.opponent);
  const us = { logo: ourLogo, name: club.name, score: m.gf, ours: true };
  const them = { logo: theirLogo, name: opponent, score: m.ga, ours: false };
  const [home, away] = m.venue === "H" ? [us, them] : [them, us];
  const byId = new Map(players.map((pl) => [pl.id, pl]));
  const name = (pid: string) => (byId.has(pid) ? graphicName(byId.get(pid)!, players) : "?");

  // One line per scorer in the order they first scored: "FURKAN 23' 67' (P)".
  const scorers: { label: string; minutes: string }[] = [];
  for (const g of m.goals) {
    const label = g.scorer === "og" ? "EIGEN DOELPUNT" : name(g.scorer);
    const minute = g.minute !== undefined ? `${g.minute}'${g.penalty ? " (P)" : ""}` : g.penalty ? "(P)" : "";
    const row = scorers.find((s) => s.label === label);
    if (row) row.minutes = [row.minutes, minute].filter(Boolean).join(" ");
    else scorers.push({ label, minutes: minute });
  }
  const motm = m.motm ? byId.get(m.motm) : undefined;
  const title = m.result === "W" ? "GEWONNEN" : m.result === "D" ? "GELIJKSPEL" : "VERLOREN";

  const download = new URL(req.url).searchParams.has("download") ? `uitslag-${m.date}.png` : null;

  const Score = ({ team }: { team: typeof us }) => (
    <div style={{ ...display, display: "flex", alignItems: "center", justifyContent: "center", width: 150, height: 170, paddingTop: 14, fontSize: 150, background: team.ours ? p.bright : "#fff", color: team.ours ? "#fff" : "#07101f" }}>
      {String(team.score)}
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", fontFamily: "DM Sans", color: "#fff" }}>
        <Backdrop p={p} logo={null} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "76px 60px 110px" }}>
          <Kicker p={p}>{`${club.name.toUpperCase()} · EINDSTAND`}</Kicker>
          <div style={{ ...display, fontSize: 200, marginTop: 6, letterSpacing: 2 }}>{title}</div>

          <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "space-around", width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
            <div style={{ display: "flex", width: 300, justifyContent: "center" }}>
              <TeamBlock p={p} logo={home.logo} name={home.name} size={200} width={300} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 15 }}>
              <Score team={home} />
              <div style={{ ...display, fontSize: 80, color: "#8d9bb3" }}>-</div>
              <Score team={away} />
            </div>
            <div style={{ display: "flex", width: 300, justifyContent: "center" }}>
              <TeamBlock p={p} logo={away.logo} name={away.name} size={200} width={300} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 5, color: "#c3cfe2", marginTop: 26 }}>
            {`${dutchDate(m.date)} · ${competitionLabel(m.competition, club.voetbal?.league)}`}
          </div>
          </div>

          {(scorers.length > 0 || motm) && (
            <div style={{ display: "flex", width: "100%", gap: 40, justifyContent: "center" }}>
              {scorers.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", flex: 1, maxWidth: 560 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <div style={{ ...display, fontSize: 40, color: p.bright }}>DOELPUNTEN</div>
                    <div style={{ display: "flex", flex: 1, height: 2, background: "rgba(255,255,255,0.18)" }} />
                  </div>
                  {scorers.slice(0, 6).map((s) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 14 }}>
                      <div style={{ ...display, fontSize: 46 }}>{s.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#c3cfe2" }}>{s.minutes}</div>
                    </div>
                  ))}
                </div>
              )}
              {motm && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 300 }}>
                  <div style={{ ...display, fontSize: 40, color: p.bright }}>MAN OF THE MATCH</div>
                  <div style={{ display: "flex", marginTop: 14, backgroundImage: `radial-gradient(circle at 50% 62%, ${p.bright}99 0%, transparent 64%)` }}>
                    <Portrait p={p} photo={images.players.get(motm.id) ?? null} number={motm.number} size={190} />
                  </div>
                  <div style={{ display: "flex", marginTop: -12 }}>
                    <NameTag p={p} pos={motm.position} name={name(motm.id)} size={34} />
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    ),
    { ...POST, fonts: await graphicFonts(), headers: pngHeaders(download) },
  );
}
