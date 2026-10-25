// Club crests from voetbal.nl's logo service, passed through so visitors load them from us and they get cached.
const WEEK = 60 * 60 * 24 * 7;

export async function GET(_req: Request, ctx: RouteContext<"/logos/[code]">) {
  const { code } = await ctx.params;
  if (!/^[A-Z0-9]{5,10}$/i.test(code)) return new Response("Bad club code", { status: 400 });
  const res = await fetch(`https://logoapi.voetbal.nl/logo.php?clubcode=${code}`, { next: { revalidate: WEEK } });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("image/")) return new Response("No logo", { status: 404 });
  return new Response(await res.arrayBuffer(), {
    headers: { "Content-Type": type, "Cache-Control": `public, max-age=${WEEK}, stale-while-revalidate=${WEEK}` },
  });
}
