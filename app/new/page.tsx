import type { Metadata } from "next";
import Link from "next/link";
import { ClubForm } from "@/components/forms";
import { createClub } from "@/lib/actions";

export const metadata: Metadata = { title: "Create a club" };

export default function NewClubPage() {
  return (
    <div className="container narrow">
      <Link href="/" className="small muted">← All clubs</Link>
      <header className="page-header" style={{ marginTop: 12 }}>
        <h1>Create your club</h1>
        <p className="muted" style={{ margin: 0 }}>Takes a minute. You can change everything except the web address later.</p>
      </header>
      <div className="card">
        <ClubForm action={createClub} />
      </div>
    </div>
  );
}
