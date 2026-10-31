import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms";
import { Page, PageHero } from "@/components/home/Page";
import { login } from "@/lib/actions";
import { loadClubOpen } from "@/lib/club";

export const metadata: Metadata = { title: "Sign in" };

type Props = { params: Promise<{ club: string }>; searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ params, searchParams }: Props) {
  const { club: slug } = await params;
  const { next } = await searchParams;
  // Not gated: this is where a private club sends everyone who isn't let in yet.
  const { data, st, admin, coach, canView } = await loadClubOpen(slug);
  // A signed-in coach or squad member lands here from admin-only pages, so only admins are sent on.
  if (admin) redirect(next?.startsWith(`${st.base}/`) ? next : st.base);

  const locked = !canView;
  return (
    <Page accent={data.club.accent}>
      <PageHero
        size="mini"
        lead={locked ? data.club.name : "Sign"}
        accent={locked ? "is private." : "in."}
        meta={
          locked
            ? "Only the squad can see this club. Enter the squad password you got from the team."
            : coach
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
