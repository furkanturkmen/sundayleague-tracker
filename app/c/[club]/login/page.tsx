import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms";
import { Page, PageHero } from "@/components/home/Page";
import { login } from "@/lib/actions";
import { loadClubOpen } from "@/lib/club";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Sign in") };
}

type Props = { params: Promise<{ club: string }>; searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ params, searchParams }: Props) {
  const { club: slug } = await params;
  const { next } = await searchParams;
  // Not gated: this is where a private club sends everyone who isn't let in yet.
  const { data, st, admin, coach, canView } = await loadClubOpen(slug);
  // A signed-in coach or squad member lands here from admin-only pages, so only admins are sent on.
  if (admin) redirect(next?.startsWith(`${st.base}/`) ? next : st.base);

  const locked = !canView;
  const t = await getT();
  return (
    <Page accent={data.club.accent}>
      <PageHero
        size="mini"
        lead={locked ? data.club.name : t("Sign")}
        accent={locked ? t("is private.") : t("in.")}
        meta={
          locked
            ? t("Only the squad can see this club. Enter the squad password you got from the team.")
            : coach
              ? t("You're signed in as the coach, which only covers line-ups. Sign in with the admin password for this page.")
              : t("Admins sign in with the club password to add players and results. The coach signs in with the coach password to set line-ups.")
        }
      />
      <div className="hx-wrap hx-body hx-form-page hx-narrow">
        <LoginForm action={login.bind(null, slug)} next={next} />
        <p className="small muted rc-forgot">
          {t("Forgot the admin password?")} <Link href={`${st.base}/login/reset`}>{t("Reset it with the recovery code")}</Link>
        </p>
      </div>
    </Page>
  );
}
