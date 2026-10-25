import { getPhoto } from "@/lib/club";

// A player's photo by id, or the coach's at /photos/coach. Links carry ?v=<version>, like the logo.
export async function GET(_req: Request, ctx: RouteContext<"/c/[club]/photos/[who]">) {
  const { club, who } = await ctx.params;
  const photo = await getPhoto(club, who);
  if (!photo) return new Response("No photo", { status: 404 });
  return new Response(new Uint8Array(photo.body), {
    headers: { "Content-Type": photo.type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
