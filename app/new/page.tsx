import type { Metadata } from "next";
import { headers } from "next/headers";
import { Onboarding } from "@/components/Onboarding";

export const metadata: Metadata = { title: "Set up your club" };

export default async function NewClubPage() {
  const host = (await headers()).get("host") ?? "";
  return <Onboarding host={host} />;
}
