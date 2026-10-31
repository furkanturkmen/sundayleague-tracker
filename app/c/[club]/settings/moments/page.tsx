import { redirect } from "next/navigation";

// Moments are added and deleted on the Fame & Shame page itself now; old links land there.
export default async function MomentsSettingsPage({ params }: { params: Promise<{ club: string }> }) {
  const { club } = await params;
  redirect(`/c/${club}/halls#hl-fame-moments`);
}
