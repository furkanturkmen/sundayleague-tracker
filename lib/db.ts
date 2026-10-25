import "server-only";
import postgres from "postgres";

const SCHEMA = /* sql */ `
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text not null,
  tagline text not null default '',
  accent text not null default '#17663f',
  gold text not null default '#b07d0c',
  founded int,
  password_hash text not null,
  created_at timestamptz not null default now()
);
-- Uploaded crest as a data URL, shrunk in the browser. logo_version busts the image cache on change.
alter table clubs add column if not exists logo text;
alter table clubs add column if not exists logo_version int not null default 0;
-- voetbal.nl link: the team id (T1234567890) to sync fixtures, results and the league table from.
alter table clubs add column if not exists voetbal_team_id text;
alter table clubs add column if not exists voetbal_team_name text;
alter table clubs add column if not exists voetbal_league text;
alter table clubs add column if not exists voetbal_synced_at timestamptz;
alter table clubs add column if not exists voetbal_error text;
-- Head coach, shown on the line-up graphic. The photo is a PNG data URL like the logo.
alter table clubs add column if not exists coach_name text;
alter table clubs add column if not exists coach_photo text;
alter table clubs add column if not exists coach_photo_version int not null default 0;

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null,
  number int,
  position text not null default 'MID' check (position in ('GK', 'DEF', 'MID', 'FWD')),
  nickname text,
  bio text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists players_club_idx on players(club_id);
-- For the graphics: a short name ("BURAK C") and a photo, ideally cut out on a transparent background.
alter table players add column if not exists display_name text;
alter table players add column if not exists photo text;
alter table players add column if not exists photo_version int not null default 0;
-- Specific positions (LB, CDM, ST, ...) on top of the original four lines.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'players_position_v2') then
    alter table players drop constraint if exists players_position_check;
    alter table players add constraint players_position_v2 check (position in (
      'GK', 'DEF', 'LB', 'CB', 'RB', 'LWB', 'RWB', 'MID', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'FWD', 'LW', 'RW', 'CF', 'ST'));
  end if;
end $$;

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  date date not null,
  opponent text not null,
  venue text not null check (venue in ('H', 'A')),
  competition text not null default 'League',
  goals_against int check (goals_against >= 0),
  motm uuid references players(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists matches_club_idx on matches(club_id, date);
-- Filled by the voetbal.nl sync. goals_for is the official score; scorers are still logged by hand in goals,
-- so a synced match can have fewer goal rows than goals_for. lineup holds the names voetbal.nl shows.
alter table matches add column if not exists external_id text;
alter table matches add column if not exists goals_for int check (goals_for >= 0);
alter table matches add column if not exists kickoff text;
alter table matches add column if not exists lineup text[];
alter table matches add column if not exists opponent_code text;
-- Set when voetbal.nl has no result: 'abandoned' (gestaakt) or 'called-off' (afgelast). Not counted in any stats.
alter table matches add column if not exists status text;
create unique index if not exists matches_external_idx on matches(club_id, external_id);
-- The line-up graphic: formation (e.g. '4-2-3-1'), starters in the formation's slot order (null for an empty
-- slot) and the bench.
alter table matches add column if not exists formation text;
alter table matches add column if not exists starters uuid[];
alter table matches add column if not exists bench uuid[];

create table if not exists match_players (
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  primary key (match_id, player_id)
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  scorer_id uuid references players(id) on delete cascade,
  assist_id uuid references players(id) on delete set null,
  minute int,
  penalty boolean not null default false,
  ord int not null default 0
);
create index if not exists goals_match_idx on goals(match_id);

-- Y = yellow, R = red, OG = own goal, PM = penalty missed
create table if not exists match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  kind text not null check (kind in ('Y', 'R', 'OG', 'PM')),
  ord int not null default 0
);
create index if not exists match_events_match_idx on match_events(match_id);

create table if not exists moments (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  kind text not null check (kind in ('fame', 'shame')),
  title text not null,
  story text not null default '',
  player_id uuid references players(id) on delete set null,
  match_id uuid references matches(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists moments_club_idx on moments(club_id);

-- League table from voetbal.nl, replaced whole on every sync.
create table if not exists standings (
  club_id uuid not null references clubs(id) on delete cascade,
  position int not null,
  team text not null,
  played int not null,
  won int not null,
  drawn int not null,
  lost int not null,
  points int not null,
  goals_for int not null,
  goals_against int not null,
  penalty_points int not null default 0,
  is_us boolean not null default false,
  primary key (club_id, position, team)
);
alter table standings add column if not exists club_code text;
-- 'league' or 'cup' (the cup group). Older databases had a key without it.
alter table standings add column if not exists competition text not null default 'league';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'standings_competition_pk') then
    alter table standings drop constraint if exists standings_pkey;
    alter table standings add constraint standings_competition_pk primary key (club_id, competition, position, team);
  end if;
end $$;
`;

const globalForDb = globalThis as unknown as { sql?: postgres.Sql; schema?: Promise<unknown> };

function connect(): postgres.Sql {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add a Postgres database and set DATABASE_URL.");
  // prepare: false keeps it working behind transaction-mode poolers (Supabase, Neon pooled URLs).
  return postgres(url, { prepare: false, max: 5, idle_timeout: 20, onnotice: () => {} });
}

/** Shared client. Creates the tables on first use, so a fresh database needs no setup step. */
export async function db(): Promise<postgres.Sql> {
  globalForDb.sql ??= connect();
  const sql = globalForDb.sql;
  globalForDb.schema ??= sql.unsafe(SCHEMA).catch((err) => {
    globalForDb.schema = undefined;
    throw err;
  });
  await globalForDb.schema;
  return sql;
}
