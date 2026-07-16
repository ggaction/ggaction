const ACCENT = "#dc2626";

export const POINT_HIGHLIGHT_TARGET = Object.freeze({
  accent: ACCENT,
  opacity: 1,
  stroke: "#ffffff",
  strokeWidth: 1.5,
  shape: "diamond",
  size: 5.5,
  offset: Object.freeze({ x: 7, y: -7 }),
  dimOpacity: 0.18
});

export const POINT_HIGHLIGHT_LAYOUT = Object.freeze({
  width: 760,
  height: 440,
  margin: Object.freeze({ top: 90, right: 170, bottom: 60, left: 70 })
});

export function selectGroupedMaximumHorsepower(cars) {
  if (!Array.isArray(cars)) throw new TypeError("cars must be an array.");
  const rows = cars.filter(row =>
    Number.isFinite(row.Horsepower) &&
    Number.isFinite(row.Miles_per_Gallon) &&
    typeof row.Origin === "string" &&
    row.Origin.length > 0
  );
  const selected = new Map();
  for (const [index, row] of rows.entries()) {
    const current = selected.get(row.Origin);
    if (current === undefined || row.Horsepower > current.row.Horsepower) {
      selected.set(row.Origin, { index, row });
    }
  }
  return Object.freeze({
    rows: Object.freeze(rows),
    selected: Object.freeze([...selected.values()].map(value =>
      Object.freeze(value)
    ))
  });
}
