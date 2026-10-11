import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms";
import { login } from "@/lib/actions";
import { loadClub } from "@/lib/club";

export const metadata: Metadata = { title: "Admin sign in" };

type Props = { params: Promise<{ club: string }>; searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ params, searchParams }: Props) {
  const { club: slug } = await params;
  const { next } = await searchParams;
  const { st, admin } = await loadClub(slug);
  if (admin) redirect(next?.startsWith(`${st.base}/`) ? next : st.base);

  return (
    <div className="narrow">
      <header className="page-header">
        <h1>Admin sign in</h1>
        <p className="muted" style={{ margin: 0 }}>Sign in with the club password to add players and results.</p>
      </header>
      <div className="card">
        <LoginForm action={login.bind(null, slug)} next={next} />
      </div>
    </div>
  );
}
