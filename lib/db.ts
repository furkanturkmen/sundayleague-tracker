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
