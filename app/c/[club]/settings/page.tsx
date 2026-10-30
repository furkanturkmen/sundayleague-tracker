import { redirect } from "next/navigation";

// Settings opens on the squad, the part that changes most. The old one-page anchors land on their own pages.
export default async function SettingsPage({ params }: { params: Promise<{ club: string }> }) {
  const { club } = await params;
  redirect(`/c/${club}/settings/squad`);
}
