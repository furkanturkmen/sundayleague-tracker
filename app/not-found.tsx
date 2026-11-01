import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="card" style={{ textAlign: "center", padding: 48 }}>
      <h1>{t("Offside.")}</h1>
      <p className="muted">{t("That page doesn't exist.")}</p>
      <Link href="/">{t("Back to the dressing room")}</Link>
    </div>
  );
}
