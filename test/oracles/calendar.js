// Gregorian integer arithmetic, independent of production Date/time-zone code.
export const leapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
export function monthLength(year, month) {
  return [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
export function civilOrdinal(year, month, day) {
  const previous = year - 1;
  let days = 365 * previous + Math.floor(previous / 4) - Math.floor(previous / 100) + Math.floor(previous / 400);
  for (let current = 1; current < month; current++) days += monthLength(year, current);
  return days + day - 1;
}
export function civilCell(year, month, day, weekStartsOn) {
  const first = civilOrdinal(year, 1, 1);
  const firstWeekday = ((first + 1) % 7 + 7) % 7;
  const offset = (firstWeekday - weekStartsOn + 7) % 7;
  const index = civilOrdinal(year, month, day) - first + offset;
  return { week: Math.floor(index / 7), weekday: index % 7 };
}
export function cellPerimeter(cells) {
  const occupied = new Set(cells.map(cell => `${cell.week},${cell.weekday}`));
  let perimeter = 0;
  for (const { week, weekday } of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (!occupied.has(`${week + dx},${weekday + dy}`)) perimeter++;
  }
  return perimeter;
}
export function polygonPerimeter(polygons) {
  return polygons.flatMap(polygon => [polygon.outer, ...polygon.holes]).reduce((total, ring) => {
    for (let index = 1; index < ring.length; index++) total += Math.abs(ring[index][0] - ring[index - 1][0]) + Math.abs(ring[index][1] - ring[index - 1][1]);
    return total;
  }, 0);
}
