import Link from "next/link";
import { RecentClubs } from "@/components/RecentClubs";

// Clubs aren't listed here: each one is reached by its own link. This browser's own clubs come back under
// "Your clubs".
export default function Landing() {
  return (
    <div className="container landing">
      <header className="landing-hero">
        <div className="kicker">Sunday League Tracker</div>
        <h1>Every goal, every card, every excuse.</h1>
        <p>Results, player stats, club records, analysis and a Hall of Fame and Hall of Shame for your Sunday league side.</p>
        <Link href="/new" className="btn btn-lg">
          Create your club
        </Link>
      </header>

      <RecentClubs />

      <section className="section">
        <h2>Looking for your team?</h2>
        <p className="muted">Open the link your club shared with you. Each club has its own address, like /c/your-club.</p>
      </section>
    </div>
  );
}
