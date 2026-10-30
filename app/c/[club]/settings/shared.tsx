import { redirect } from "next/navigation";
import { PageHero, PageTabs } from "@/components/home/Page";
import { loadClub } from "@/lib/club";

// Settings is split into short pages under one hero; these are the pieces each of them shares.

export type SettingsTab = "squad" | "club" | "voetbal" | "access" | "moments";

const TABS: { key: SettingsTab; label: string }[] = [
  { key: "squad", label: "Squad" },
  { key: "club", label: "Club" },
  { key: "voetbal", label: "voetbal.nl" },
  { key: "access", label: "Access" },
  { key: "moments", label: "Moments" },
];

/** The club for a settings page, or off to sign in and back here after. */
export async function loadSettings(slug: string, tab: SettingsTab) {
  const ctx = await loadClub(slug);
  const here = `${ctx.st.base}/settings/${tab}`;
  if (!ctx.admin) redirect(`${ctx.st.base}/login?next=${encodeURIComponent(here)}`);
  return ctx;
}

export function SettingsHero({ base, active }: { base: string; active: SettingsTab }) {
  return (
    <PageHero size="mini" lead="Club" accent="settings.">
      <PageTabs label="Settings" tabs={TABS.map((t) => ({ href: `${base}/settings/${t.key}`, label: t.label, on: t.key === active }))} />
    </PageHero>
  );
}
