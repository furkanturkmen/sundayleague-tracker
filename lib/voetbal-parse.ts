// Parsers for voetbal.nl team and match pages. Pure functions over HTML, kept free of app imports
// so they can be checked against saved pages on their own.
import * as cheerio from "cheerio";

const MONTHS: Record<string, number> = {
  januari: 1, februari: 2, maart: 3, april: 4, mei: 5, juni: 6,
  juli: 7, augustus: 8, september: 9, oktober: 10, november: 11, december: 12,
};

export interface ScheduleRow {
  /** voetbal.nl match id, e.g. "M518764028". */
  id: string;
  date: string;
  home: string;
  away: string;
  /** Which side is the followed team, or null when this row is someone else's match. */
  us: "home" | "away" | null;
  score: { home: number; away: number } | null;
  kickoff: string | null;
  /** Anything else voetbal.nl puts where the score or time goes, e.g. AFG (called off) or GST (abandoned). */
  status: string | null;
}

export interface StandingRow {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  penaltyPoints: number;
  isUs: boolean;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Same team, however voetbal.nl happens to space or capitalise it ("DWS AFC 2" vs "DWS afc 2"). */
export const sameName = (a: string, b: string) => clean(a).toLowerCase() === clean(b).toLowerCase();

/** "Zondag 25 oktober 2026" → "2026-10-25". */
export function parseDutchDate(text: string): string | null {
  const m = clean(text).match(/(\d{1,2}) ([a-z]+) (\d{4})/i);
  const month = m && MONTHS[m[2].toLowerCase()];
  if (!m || !month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** Accepts a team link (…/team/T1628317720/overzicht) or the bare id. */
export function parseTeamId(input: string): string | null {
  return input.match(/\bT\d{6,}\b/)?.[0] ?? null;
}

/** Team name and league from the page header, e.g. "DWS afc 2" and "Mannen Zondag - 3e klasse 2". */
export function parseTeamHeader(html: string): { name: string | null; league: string | null } {
  const $ = cheerio.load(html);
  const name = clean($(".PageCover-titleWrap h1").first().text()) || null;
  const league = clean($(".PageCover-titleWrap h3").first().text()) || null;
  return { name, league };
}

/** The programma or uitslagen list: date headers followed by one link per match. */
export function parseSchedule(html: string): ScheduleRow[] {
  const $ = cheerio.load(html);
  const rows: ScheduleRow[] = [];
  $(".ScheduleResults-content .table").each((_, table) => {
    const date = parseDutchDate($(table).find(".header .title").first().text());
    if (!date) return;
    $(table)
      .find("a.row")
      .each((_, a) => {
        const id = $(a).attr("href")?.match(/\/wedstrijd\/(M\d+)/)?.[1];
        if (!id) return;
        const home = clean($(a).find(".value.home .team").text());
        const away = clean($(a).find(".value.away .team").text());
        const us = $(a).find(".value.home").hasClass("my-team") ? "home" : $(a).find(".value.away").hasClass("my-team") ? "away" : null;
        const center = clean($(a).find(".value.center").text());
        const score = center.match(/^(\d+)\s*-\s*(\d+)$/);
        const time = center.match(/^\d{1,2}:\d{2}$/);
        rows.push({
          id,
          date,
          home,
          away,
          us,
          score: score ? { home: Number(score[1]), away: Number(score[2]) } : null,
          kickoff: time ? center : null,
          status: !score && !time && center ? center : null,
        });
      });
  });
  return rows;
}

export function parseStandings(html: string): StandingRow[] {
  const $ = cheerio.load(html);
  const num = (s: string) => Number(clean(s)) || 0;
  const rows: StandingRow[] = [];
  $(".table-standingstable a.row").each((_, a) => {
    const cells = $(a).children(".value").toArray().map((el) => $(el));
    const pick = (cls: string) => cells.find((c) => c.hasClass(cls));
    // After position, logo and team come G W GL V P + - PM, in that order.
    const stats = cells.filter((c) => !c.hasClass("position") && !c.hasClass("logo") && !c.hasClass("team")).map((c) => num(c.text()));
    const team = clean(pick("team")?.text() ?? "");
    if (!team || stats.length < 8) return;
    rows.push({
      position: num(pick("position")?.text() ?? ""),
      team,
      played: stats[0],
      won: stats[1],
      drawn: stats[2],
      lost: stats[3],
      points: stats[4],
      goalsFor: stats[5],
      goalsAgainst: stats[6],
      penaltyPoints: stats[7],
      isUs: $(a).hasClass("my-team"),
    });
  });
  return rows;
}

/**
 * Both line-ups from a match page, home side first. Players who keep their voetbal.nl profile private
 * show as "Afgeschermd" and are left out.
 */
export function parseLineups(html: string): [string[], string[]] {
  const $ = cheerio.load(html);
  const sides = $(".TeamMembers-teamWrapper")
    .toArray()
    .map((wrap) =>
      $(wrap)
        .find(".TeamMembers-name")
        .toArray()
        .map((el) => clean($(el).text()).replace(/\s*\((C|K)\)$/i, ""))
        .filter((n) => n && !/^afgeschermd/i.test(n)),
    );
  return [sides[0] ?? [], sides[1] ?? []];
}
