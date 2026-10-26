import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms";
import { login } from "@/lib/actions";
import { loadClub } from "@/lib/club";

export const metadata: Metadata = { title: "Sign in" };

type Props = { params: Promise<{ club: string }>; searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ params, searchParams }: Props) {
  const { club: slug } = await params;
  const { next } = await searchParams;
  const { st, admin, coach } = await loadClub(slug);
  // A signed-in coach lands here from admin-only pages, so only admins are sent on.
  if (admin) redirect(next?.startsWith(`${st.base}/`) ? next : st.base);

  return (
    <div className="narrow">
      <header className="page-header">
        <h1>Sign in</h1>
        <p className="muted" style={{ margin: 0 }}>
          {coach
            ? "You're signed in as the coach, which only covers line-ups. Sign in with the admin password for this page."
            : "Admins sign in with the club password to add players and results. The coach signs in with the coach password to set line-ups."}
        </p>
      </header>
      <div className="card">
        <LoginForm action={login.bind(null, slug)} next={next} />
      </div>
    </div>
  );
}
