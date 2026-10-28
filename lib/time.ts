/** "2026-11-01", "13:00" read as Amsterdam wall-clock time, as epoch ms. Matches are played in Dutch time. */
export function amsterdam(date: string, time = "00:00"): number {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const at = (tz: string) => Date.parse(new Date(guess).toLocaleString("en-US", { timeZone: tz }));
  return guess - (at("Europe/Amsterdam") - at("UTC"));
}
