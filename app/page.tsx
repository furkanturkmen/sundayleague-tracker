import Link from "next/link";
import { LangSwitch } from "@/components/I18n";
import { RecentClubs } from "@/components/RecentClubs";
import { getT } from "@/lib/i18n/server";

// Clubs aren't listed here: each one is reached by its own link. This browser's own clubs come back under
// "Your clubs".
export default async function Landing() {
  const t = await getT();
  return (
    <div className="container landing">
      <header className="landing-hero">
        <div className="kicker">Sunday League Tracker</div>
        <h1>{t("Every goal, every card, every excuse.")}</h1>
        <p>{t("Results, player stats, club records, analysis and a Hall of Fame and Hall of Shame for your Sunday league side.")}</p>
        <Link href="/new" className="btn btn-lg">
          {t("Create your club")}
        </Link>
      </header>

      <RecentClubs />

      <section className="section">
        <h2>{t("Looking for your team?")}</h2>
        <p className="muted">{t("Open the link your club shared with you. Each club has its own address, like /c/your-club.")}</p>
      </section>

      <footer className="section small muted">
        <LangSwitch />
      </footer>
    </div>
  );
}
