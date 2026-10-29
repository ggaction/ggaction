import { canvas, variants, observations } from "../../../examples/calendar/fixture.js";
import { civilCell, monthLength } from "../../oracles/calendar.js";
export { canvas, variants };

// Complete months are column strips with one partial column at either end.
// Walk those six corners by integer steps, independently of the edge-union kernel.
function monthRing(first, last) {
  const corners = [[first.week, first.weekday], [first.week + 1, first.weekday], [first.week + 1, 0],
    [last.week + 1, 0], [last.week + 1, last.weekday + 1], [last.week, last.weekday + 1],
    [last.week, 7], [first.week, 7], [first.week, first.weekday]];
  const ring = [corners[0]];
  for (const [x, y] of corners.slice(1)) {
    let [a, b] = ring.at(-1);
    while (a !== x || b !== y) { a += Math.sign(x - a); b += Math.sign(y - b); ring.push([a, b]); }
  }
  // When a month ends on the seventh weekday the two bottom corners coincide;
  // their horizontal backtracking must be removed from the independent outline.
  const reduced = [];
  for (const point of ring) {
    if (reduced.length > 1 && point[0] === reduced.at(-2)[0] && point[1] === reduced.at(-2)[1]) reduced.pop();
    else reduced.push(point);
  }
  return reduced;
}

export function calendarReference(id = "year") {
  const variant = variants.find(value => value.id === id);
  if (!variant) throw new Error(`Unknown calendar reference ${id}.`);
  const source = new Map(observations.map(row => [row.date, row.value])), dates = [];
  for (let month = 1; month <= 12; month++) for (let day = 1; day <= monthLength(2024, month); day++) {
    const key = `2024-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (variant.missing === "omit" && !source.has(key)) continue;
    dates.push({ key, month, day, ...civilCell(2024, month, day, variant.weekStartsOn) });
  }
  const last = civilCell(2024, 12, 31, variant.weekStartsOn), weeks = last.week + 1;
  const size = Math.min(1000 / (weeks + 3), 240 / 11);
  const originX = 40 + (1000 - weeks * size) / 2 + size, originY = 80 + (240 - 11 * size) / 2 + 2 * size;
  const point = (x, y) => ({ x: originX + x * size, y: originY + y * size });
  const graphics = dates.map(day => ({ type: "rect", properties: { ...point(day.week + .04, day.weekday + .04),
    width: size * .92, height: size * .92, fill: source.has(day.key) ? "#2563eb" : "#e2e8f0", stroke: "none", strokeWidth: 0, opacity: 1 } }));
  const text = (x, y, text, textAlign = "center") => ({ type: "text", properties: { ...point(x, y), text, fill: "#0f172a", fontFamily: "sans-serif", fontSize: 10, fontWeight: "normal", textAlign, textBaseline: "middle" } });
  for (let month = 1; month <= 12; month++) {
    const days = dates.filter(day => day.month === month), first = days[0], last = days.at(-1);
    if (variant.missing === "empty") graphics.push({ type: "path", properties: { commands: [...monthRing(first, last).slice(0, -1).map(([x, y], index) => ({ op: index === 0 ? "M" : "L", ...point(x, y) })), { op: "Z" }], fill: "none", stroke: "#64748b", strokeWidth: 1, opacity: 1 } });
    graphics.push(text((first.week + last.week + 1) / 2, -.75, ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1]));
  }
  graphics.push(text(-1.7, -1.35, "2024"));
  for (let day = 0; day < 7; day++) graphics.push(text(-.35, day + .5, ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][(day + variant.weekStartsOn) % 7], "right"));
  return { graphics, clip: { x: 40, y: 80, width: 1000, height: 240 }, ...variant };
}
