# DWS AFC 2

Club tracker for DWS AFC 2, our Sunday league side. Results, player stats, club records, analysis, and the Hall of Fame and Hall of Shame.

## Pages

| Route | What's on it |
| --- | --- |
| `/` | Season record, next fixture, form, latest results, top scorers and assists |
| `/players` | Squad table, sortable by any column, filterable by season |
| `/players/[id]` | Player profile: totals, season breakdown, match log, fame/shame moments |
| `/matches` | Upcoming fixtures and every result by season |
| `/matches/[id]` | Scoreline, goals and assists, cards, MOTM, squad |
| `/records` | Biggest wins and defeats, streaks, individual records, season-by-season, head to head |
| `/analysis` | Goals by month, when we score, home vs away, competitions, partnerships, with/without |
| `/halls` | Hall of Fame and Hall of Shame awards, moments and darkest days |

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Updating the data

Everything lives in `data/`, and every stat is worked out from it, so there is nothing else to keep in sync.

- `data/players.ts` - the squad (id, name, shirt number, position, nickname, bio)
- `data/matches.ts` - fixtures and results. Each match is one line:

  ```ts
  m({
    date: "2026-10-18",
    opp: "Northside United",
    venue: "A",                       // "H" or "A"
    comp: "Cup",                      // defaults to "League"
    ga: 1,                            // goals conceded - leave out until it's played
    goals: [["connor", "josh", 23], ["josh", null, 75, "p"]], // [scorer, assist, minute, "p" = penalty], "og" = their own goal
    out: ["dan"], in: ["harry"],      // changes from the usual squad
    cards: [["ryan", "Y"]],
    og: ["tom"],                      // our own goals
    penMiss: ["connor"],
    motm: "josh",
    notes: "Anything worth remembering",
  }),
  ```

- `data/moments.ts` - stories for the Hall of Fame and Hall of Shame
- `data/club.ts` - name and tagline

The squad and results in the repo are placeholders - replace them with the real ones.

Club colours are CSS variables at the top of `app/globals.css` (`--accent`, `--gold`). Dark mode follows the system setting.

## Deploying

Works as-is on Vercel or anything that runs `next build && next start`.
