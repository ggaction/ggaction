export const canvas = { width: 1080, height: 360, margin: { left: 40, right: 40, top: 80, bottom: 40 }, background: "#ffffff" };
export const variants = [
  { id: "year", chart: "calendar", title: "A leap year, one cell per civil day", subtitle: "2024 contains 366 days. Pale cells have no recorded observation.", weekStartsOn: 0, missing: "empty" },
  { id: "monday", chart: "calendar-monday", title: "Weeks begin on Monday", subtitle: "The dates and values stay the same; the shared calendar grid changes.", weekStartsOn: 1, missing: "empty" },
  { id: "omitted", chart: "calendar-omitted", title: "Omit unobserved days", subtitle: "Only observed days keep their cells; calendar positions remain fixed.", weekStartsOn: 1, missing: "omit" }
];
export const observations = Array.from({ length: 366 }, (_, index) => ({ date: new Date(Date.UTC(2024, 0, index + 1)).toISOString().slice(0, 10), value: index % 10 }))
  .filter((_, index) => index % 5 !== 0);
export function calendarOptions(id = "year") {
  const variant = variants.find(value => value.id === id);
  if (!variant) throw new Error(`Unknown calendar variant ${id}.`);
  return { variant, canvas, data: { id: "observations", keyField: "date", values: observations },
    layout: { id: "days", date: "date", value: "value", start: "2024-01-01", end: "2024-12-31", timeZone: "UTC", weekStartsOn: variant.weekStartsOn, aggregate: "sum", missing: variant.missing },
    plot: { id: "calendar", color: false, cells: { fill: "#2563eb", emptyFill: "#e2e8f0" }, labels: { week: false }, monthBoundary: id === "omitted" ? false : {} },
    title: { text: variant.title, subtitle: variant.subtitle, align: "left", alongOffset: 0, offset: 2, gap: 8,
      titleStyle: { color: "#0f172a", fontSize: 20, fontFamily: "sans-serif", fontWeight: 600 },
      subtitleStyle: { color: "#64748b", fontSize: 12, fontFamily: "sans-serif", fontWeight: 400 } } };
}
