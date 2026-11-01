import type { Metadata } from "next";
import { headers } from "next/headers";
import { Onboarding } from "@/components/Onboarding";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Set up your club") };
}

export default async function NewClubPage() {
  const host = (await headers()).get("host") ?? "";
  return <Onboarding host={host} />;
}
