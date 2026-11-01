import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageHero } from "@/components/home/Page";
import { ResetPasswordForm } from "@/components/RecoveryCode";
import { resetPassword } from "@/lib/actions";
import { hasRecoveryCode, loadClubOpen } from "@/lib/club";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Reset password") };
}

/** Forgot password. Not gated, like sign-in: a private club's admin who can't sign in has to reach it. */
export default async function ResetPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st } = await loadClubOpen(slug);
  const hasCode = await hasRecoveryCode(slug);
  const t = await getT();

  return (
    <Page accent={data.club.accent}>
      <PageHero
        size="mini"
        lead={t("Reset")}
        accent={t("password.")}
        meta={
          hasCode
            ? t("Enter the recovery code you saved when you made it, and choose a new admin password.")
            : t("This club never made a recovery code, so the password can't be reset here.")
        }
      />
      <div className="hx-wrap hx-body hx-form-page hx-narrow">
        {hasCode ? (
          <ResetPasswordForm action={resetPassword.bind(null, slug)} base={st.base} />
        ) : (
          <p className="ce-note">
            {t("Ask whoever runs the Sunday League Tracker site to reset it for you. Once you're back in, make a recovery code in Settings → Access so this doesn't happen again.")}
          </p>
        )}
        <p className="small muted rc-forgot">
          <Link href={`${st.base}/login`}>{t("Back to sign in")}</Link>
        </p>
      </div>
    </Page>
  );
}
