import { getClubLogo } from "@/lib/club";

// Links carry ?v=<logo_version>, so a new upload gets a new URL and the old one can be cached forever.
export async function GET(_req: Request, ctx: RouteContext<"/c/[club]/logo">) {
  const logo = await getClubLogo((await ctx.params).club);
  if (!logo) return new Response("No logo", { status: 404 });
  return new Response(new Uint8Array(logo.body), {
    headers: { "Content-Type": logo.type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
