import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms";
import { Page, PageHero } from "@/components/home/Page";
import { login } from "@/lib/actions";
import { loadClub } from "@/lib/club";

export const metadata: Metadata = { title: "Sign in" };

type Props = { params: Promise<{ club: string }>; searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ params, searchParams }: Props) {
  const { club: slug } = await params;
  const { next } = await searchParams;
  const { data, st, admin, coach } = await loadClub(slug);
  // A signed-in coach lands here from admin-only pages, so only admins are sent on.
  if (admin) redirect(next?.startsWith(`${st.base}/`) ? next : st.base);

  return (
    <Page accent={data.club.accent}>
      <PageHero
        size="mini"
        lead="Sign"
        accent="in."
        meta={
          coach
            ? "You're signed in as the coach, which only covers line-ups. Sign in with the admin password for this page."
            : "Admins sign in with the club password to add players and results. The coach signs in with the coach password to set line-ups."
        }
      />
      <div className="hx-wrap hx-body hx-form-page hx-narrow">
        <LoginForm action={login.bind(null, slug)} next={next} />
      </div>
    </Page>
  );
}
