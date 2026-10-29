import type { Metadata } from "next";
import Link from "next/link";
import { Band } from "@/components/home/Band";
import { Reveal } from "@/components/home/Motion";
import { Page, PageHero, PageTabs, Pitch } from "@/components/home/Page";
import { TeamLogo } from "@/components/ui";
import { loadClub } from "@/lib/club";

export const metadata: Metadata = { title: "Table" };

type Props = { params: Promise<{ club: string }>; searchParams: Promise<{ competition?: string }> };

// The whole table on the navy pitch from the home screen, every column this time, with our row lit up.

export default async function TablePage({ params, searchParams }: Props) {
  const { data, st, admin } = await loadClub((await params).club);
  const league = data.standings.filter((r) => r.competition === "league");
  const cup = data.standings.filter((r) => r.competition === "cup");
  const showCup = (await searchParams).competition === "cup" && cup.length > 0;
  const rows = showCup ? cup : league;
  const us = rows.find((r) => r.isUs);
  const penalties = rows.some((r) => r.penaltyPoints > 0);
  const vnl = data.club.voetbal;

  return (
    <Page accent={data.club.accent}>
      <PageHero
        lead="The"
        accent="table."
        meta={
          <>
            {showCup ? "Cup group" : (vnl?.league ?? "League")}
            {us && (
              <>
                {" "}
                · {data.club.shortName} {ordinal(us.position)} on {us.points} {us.points === 1 ? "point" : "points"}
              </>
            )}
          </>
        }
      >
        {cup.length > 0 && (
          <PageTabs
            label="Competition"
            tabs={[
              { href: `${st.base}/table`, label: "League", on: !showCup },
              { href: `${st.base}/table?competition=cup`, label: "Cup", on: showCup },
            ]}
          />
        )}
      </PageHero>

      <div className="hx-bands">
        <Band className="hx-band-pitch" labelledBy="page-title" bg={<Pitch />}>
          {rows.length > 0 ? (
            <Reveal className="hx-table tb-table">
              <table>
                <thead>
                  <tr>
                    <th className="num">#</th>
                    <th>Team</th>
                    <th className="num" title="Played">
                      P
                    </th>
                    <th className="num tb-wdl" title="Won">
                      W
                    </th>
                    <th className="num tb-wdl" title="Drawn">
                      D
                    </th>
                    <th className="num tb-wdl" title="Lost">
                      L
                    </th>
                    <th className="num tb-goals" title="Goals for and against">
                      Goals
                    </th>
                    <th className="num" title="Goal difference">
                      GD
                    </th>
                    {penalties && (
                      <th className="num tb-pen" title="Points deducted">
                        Pen
                      </th>
                    )}
                    <th className="num" title="Points">
                      Pts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.team} className={r.isUs ? "is-us" : undefined}>
                      <td className="num">{r.position}</td>
                      <td>
                        <span className="hx-team-cell">
                          <TeamLogo code={r.clubCode} name={r.team} size={24} />
                          <span>{r.team}</span>
                        </span>
                      </td>
                      <td className="num">{r.played}</td>
                      <td className="num tb-wdl">{r.won}</td>
                      <td className="num tb-wdl">{r.drawn}</td>
                      <td className="num tb-wdl">{r.lost}</td>
                      <td className="num tb-goals">
                        {r.goalsFor}–{r.goalsAgainst}
                      </td>
                      <td className="num">{signed(r.goalsFor - r.goalsAgainst)}</td>
                      {penalties && <td className="num tb-pen">{r.penaltyPoints ? <small>−{r.penaltyPoints}</small> : ""}</td>}
                      <td className="num">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Reveal>
          ) : (
            <p className="hx-empty">
              No table yet.{" "}
              {admin ? (
                <>
                  Connect your team to voetbal.nl in <Link href={`${st.base}/settings#voetbal`}>Settings</Link> to pull it in.
                </>
              ) : (
                "It shows up once the club admin connects the team to voetbal.nl."
              )}
            </p>
          )}
          {vnl?.syncedAt && (
            <p className="tb-source">
              From voetbal.nl, updated{" "}
              {new Date(vnl.syncedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" })}.
            </p>
          )}
        </Band>
      </div>
    </Page>
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
