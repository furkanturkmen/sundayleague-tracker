import type { Metadata } from "next";
import Link from "next/link";
import { Band } from "@/components/home/Band";
import { Reveal } from "@/components/home/Motion";
import { Page, PageHero, PageTabs, Pitch } from "@/components/home/Page";
import { TeamLogo } from "@/components/ui";
import { loadClub } from "@/lib/club";
import { dateLocale, type Lang } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Table") };
}

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
  const [t, lang] = await Promise.all([getT(), getLang()]);

  return (
    <Page accent={data.club.accent}>
      <PageHero
        lead={t("The")}
        accent={t("table.")}
        meta={
          <>
            {showCup ? t("Cup group") : (vnl?.league ?? t("League"))}
            {us && (
              <>
                {" "}
                ·{" "}
                {t(us.points === 1 ? "{club} {pos} on {n} point" : "{club} {pos} on {n} points", {
                  club: data.club.shortName,
                  pos: ordinal(us.position, lang),
                  n: us.points,
                })}
              </>
            )}
          </>
        }
      >
        {cup.length > 0 && (
          <PageTabs
            label={t("Competition")}
            tabs={[
              { href: `${st.base}/table`, label: t("League"), on: !showCup },
              { href: `${st.base}/table?competition=cup`, label: t("Cup"), on: showCup },
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
                    <th>{t("Team")}</th>
                    <th className="num" title={t("Played")}>
                      {t("P")}
                    </th>
                    <th className="num tb-wdl" title={t("Won")}>
                      {t("W")}
                    </th>
                    <th className="num tb-wdl" title={t("Drawn")}>
                      {t("D")}
                    </th>
                    <th className="num tb-wdl" title={t("Lost")}>
                      {t("L")}
                    </th>
                    <th className="num tb-goals" title={t("Goals for and against")}>
                      {t("Goals")}
                    </th>
                    <th className="num" title={t("Goal difference")}>
                      {t("GD")}
                    </th>
                    {penalties && (
                      <th className="num tb-pen" title={t("Points deducted")}>
                        {t("Pen")}
                      </th>
                    )}
                    <th className="num" title={t("Points")}>
                      {t("Pts")}
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
              {t("No table yet.")}{" "}
              {admin ? (
                <>
                  {t("Connect your team to voetbal.nl in")} <Link href={`${st.base}/settings/voetbal`}>{t("Settings")}</Link> {t("to pull it in.")}
                </>
              ) : (
                t("It shows up once the club admin connects the team to voetbal.nl.")
              )}
            </p>
          )}
          {vnl?.syncedAt && (
            <p className="tb-source">
              {t("From voetbal.nl, updated")}{" "}
              {new Date(vnl.syncedAt).toLocaleString(dateLocale(lang), { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" })}.
            </p>
          )}
        </Band>
      </div>
    </Page>
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

function ordinal(n: number, lang: Lang) {
  if (lang === "nl") return `${n}e`;
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
