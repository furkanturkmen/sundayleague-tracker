"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Notice, Submit } from "@/components/forms";
import { useT } from "@/components/I18n";
import { makeRecoveryCode, type FormState } from "@/lib/actions";

type Action = (state: FormState, f: FormData) => Promise<FormState>;

/** A code on screen with a Copy button. It's shown once, so the words say to save it. */
export function ShownCode({ code }: { code: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="rc-code">
      <code>{code}</code>
      <button
        type="button"
        className="btn-link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // No clipboard (insecure page or blocked): the code is there to select by hand.
          }
        }}
      >
        {copied ? t("Copied") : t("Copy")}
      </button>
    </div>
  );
}

/** Makes (or replaces) the club's recovery code and shows it once. */
export function RecoveryCode({ slug, isSet }: { slug: string; isSet: boolean }) {
  const t = useT();
  const [state, setState] = useState<FormState>({});
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function make() {
    setBusy(true);
    setConfirming(false);
    setState(await makeRecoveryCode(slug).catch((e: unknown) => ({ error: e instanceof Error ? e.message : t("Couldn't make a code.") })));
    setBusy(false);
  }

  if (state.code)
    return (
      <div className="rc">
        <ShownCode code={state.code} />
        <p className="rc-note">
          {state.ok} {t("A note on your phone or a password manager works. Anyone with it can take over the admin login.")}
        </p>
      </div>
    );

  return (
    <div className="rc">
      <p className="rc-note">
        {isSet
          ? t("A recovery code is set. Making a new one stops the old one working.")
          : t("No recovery code yet. Without one, a lost admin password can't be reset.")}
      </p>
      {confirming ? (
        <div className="rc-actions">
          <button type="button" className="btn" onClick={make} disabled={busy}>
            {busy ? t("Making…") : t("Yes, replace it")}
          </button>
          <button type="button" className="btn-link" onClick={() => setConfirming(false)}>
            {t("Keep the old one")}
          </button>
        </div>
      ) : (
        <div className="rc-actions">
          <button type="button" className="btn" onClick={() => (isSet ? setConfirming(true) : make())} disabled={busy}>
            {busy ? t("Making…") : isSet ? t("Make a new code") : t("Make recovery code")}
          </button>
        </div>
      )}
      {state.error && <Notice state={state} />}
    </div>
  );
}

/** Forgot password: the recovery code and a new password. On success it shows the replacement code. */
export function ResetPasswordForm({ action, base }: { action: Action; base: string }) {
  const t = useT();
  const [state, formAction] = useActionState(action, {});
  if (state.code)
    return (
      <div className="form rc">
        <p className="notice notice-ok">{state.ok}</p>
        <ShownCode code={state.code} />
        <Link href={base} className="btn">
          {t("Go to the club")}
        </Link>
      </div>
    );
  return (
    <form action={formAction} className="form">
      <label>
        {t("Recovery code")}
        <input name="code" required autoFocus autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX" />
      </label>
      <label>
        {t("New admin password")}
        <input type="password" name="password" required minLength={6} autoComplete="new-password" />
      </label>
      <label>
        {t("Confirm")}
        <input type="password" name="confirm" required minLength={6} autoComplete="new-password" />
      </label>
      <Notice state={state} />
      <Submit pending={t("Checking…")}>{t("Reset password")}</Submit>
    </form>
  );
}
