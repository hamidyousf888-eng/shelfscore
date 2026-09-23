export function money(cents: number, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format((cents ?? 0) / 100);
}

export function amount(value: number, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value ?? 0);
}

export function num(value: number, locale = "en-US", digits = 0) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value ?? 0);
}

export function formatDate(value: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", opts ?? { dateStyle: "medium" }).format(d);
}

export function formatDateTime(value: string | Date | null | undefined) {
  return formatDate(value, { dateStyle: "medium", timeStyle: "short" });
}

export function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
