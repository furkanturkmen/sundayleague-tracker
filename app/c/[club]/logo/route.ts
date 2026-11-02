import { getClubLogo } from "@/lib/club";
import { clearBackground } from "@/lib/logo";

// Links carry ?v=<logo_version>, so a new upload gets a new URL and the old one can be cached forever.
export async function GET(_req: Request, ctx: RouteContext<"/c/[club]/logo">) {
  const logo = await getClubLogo((await ctx.params).club);
  if (!logo) return new Response("No logo", { status: 404 });
  // Any flat background (an upload on a white square) is taken off, as for the opponents' crests.
  const clear = await clearBackground(logo.body, logo.type);
  return new Response(clear.body, {
    headers: { "Content-Type": clear.type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
