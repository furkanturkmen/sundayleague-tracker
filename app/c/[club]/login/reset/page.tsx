import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageHero } from "@/components/home/Page";
import { ResetPasswordForm } from "@/components/RecoveryCode";
import { resetPassword } from "@/lib/actions";
import { hasRecoveryCode, loadClubOpen } from "@/lib/club";

export const metadata: Metadata = { title: "Reset password" };

/** Forgot password. Not gated, like sign-in: a private club's admin who can't sign in has to reach it. */
export default async function ResetPage({ params }: { params: Promise<{ club: string }> }) {
  const { club: slug } = await params;
  const { data, st } = await loadClubOpen(slug);
  const hasCode = await hasRecoveryCode(slug);

  return (
    <Page accent={data.club.accent}>
      <PageHero
        size="mini"
        lead="Reset"
        accent="password."
        meta={
          hasCode
            ? "Enter the recovery code you saved when you made it, and choose a new admin password."
            : "This club never made a recovery code, so the password can't be reset here."
        }
      />
      <div className="hx-wrap hx-body hx-form-page hx-narrow">
        {hasCode ? (
          <ResetPasswordForm action={resetPassword.bind(null, slug)} base={st.base} />
        ) : (
          <p className="ce-note">
            Ask whoever runs the Sunday League Tracker site to reset it for you. Once you&apos;re back in, make a recovery code in Settings → Access so
            this doesn&apos;t happen again.
          </p>
        )}
        <p className="small muted rc-forgot">
          <Link href={`${st.base}/login`}>Back to sign in</Link>
        </p>
      </div>
    </Page>
  );
}
