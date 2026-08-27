/** Display helpers — keep UI dates human-readable (day, month, year). */

export function formatDisplayDate(isoOrYmd: string | null | undefined): string {
  if (!isoOrYmd) return "—";
  const raw = isoOrYmd.trim();
  const d =
    /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T12:00:00`)
      : new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
