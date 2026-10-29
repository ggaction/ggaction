import { validateGeneratedItemLimit } from "../../core/validation.js";
import { requireStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { validateCalendarBinding } from "../../grammar/calendar/plot.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolveCoordinateBounds } from "../coordinateBounds.js";
import { materializeFillItems } from "../fillPaint.js";
import { materializeMarkEffectProperties } from "../markEffects.js";
import { bindTextFontProperties } from "../textFont.js";
import { mapScaleConsumerValues } from "../scales/map.js";
import { uniqueFields } from "../selection/items/common.js";

const MONTH_NAMES = Object.freeze(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);
const DAY_NAMES = Object.freeze(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);

export function resolveCalendarPlot(program, layer, config, resolvedScales = program.resolvedScales) {
  validateCalendarBinding(layer, config);
  const layout = requireStoredResource(program, layer.calendarBinding.layout);
  if (layout.options.method !== "calendar" || layout.inputs[0].kind !== "data" || requireCoordinate(program, layer.coordinate).type !== "cartesian") {
    throw new TypeError("Calendar plots require a calendar layout and Cartesian coordinate.");
  }
  const dataset = resolveInputReference(program, layout.inputs[0]);
  const frame = resolveCoordinateBounds(program, layer.coordinate, { resolvedScales });
  const { years, cells, months } = layout.result, maxWeeks = Math.max(...years.map(year => year.weeks));
  const size = Math.min(frame.width / (maxWeeks + 3), frame.height / (years.length * 11));
  const originX = frame.x + (frame.width - maxWeeks * size) / 2 + size;
  const originY = frame.y + (frame.height - years.length * 11 * size) / 2 + 2 * size;
  const point = (yearIndex, x, y) => ({ x: originX + x * size, y: originY + (yearIndex * 11 + y) * size });
  const lineage = { kind: "resource", resource: layer.calendarBinding.layout }, graphics = [], items = [];
  const color = layer.encoding?.color === undefined ? undefined : resolvedScales[layer.encoding?.color.scale];
  if (layer.encoding?.color !== undefined && color === undefined) throw new TypeError("Calendar color requires a resolved scale.");
  const { emptyFill, gap, ...body } = config.cells;
  for (const cell of cells) {
    const members = cell.sourceIndices.map(index => dataset.values[index]), memberKeys = cell.sourceIndices.map(index => dataset.rowKeys[index]);
    const key = JSON.stringify([[], layer.id, "calendar-day", [layout.id, cell.key]]), topology = "cell";
    const fill = cell.value === null ? emptyFill : color === undefined ? body.fill : mapScaleConsumerValues([cell.value], color, "color")[0];
    const properties = { ...point(cell.yearIndex, cell.week + gap / 2, cell.weekday + gap / 2), width: size * (1 - gap), height: size * (1 - gap), ...body, fill };
    graphics.push({ type: "rect", properties, identity: { key, topology, role: "body", lineage } });
    items.push({ key, topology, role: "calendar-day", fields: { ...uniqueFields(members), date: cell.key, instant: cell.instant, year: cell.year,
      month: cell.month, day: cell.day, week: cell.week, weekday: cell.weekday, value: cell.value, empty: cell.value === null }, properties,
      members, memberKeys, graphicRoles: ["body"] });
  }
  const decorationIdentity = (role, id) => ({ key: JSON.stringify([[], layer.id, "calendar-decoration", [layout.id, id]]), topology: "", role, lineage });
  const label = (role, id, yearIndex, x, y, text, textAlign = "center") => {
    if (!layer.calendarLabels[role]) return;
    graphics.push({ type: "text", properties: bindTextFontProperties(program, { ...point(yearIndex, x, y), text, ...config.labels[role], textAlign, textBaseline: "middle" }),
      identity: decorationIdentity(`${role}-label`, id) });
  };
  for (const month of months) {
    if (config.monthBoundary !== false) {
      const commands = [];
      for (const polygon of month.polygons) for (const ring of [polygon.outer, ...polygon.holes]) {
        ring.slice(0, -1).forEach(([x, y], index) => commands.push({ op: index === 0 ? "M" : "L", ...point(month.yearIndex, x, y) }));
        commands.push({ op: "Z" });
      }
      graphics.push({ type: "path", properties: { commands, fill: "none", ...config.monthBoundary }, identity: decorationIdentity("month-boundary", month.key) });
    }
    label("month", month.key, month.yearIndex, (month.bounds.left + month.bounds.right) / 2, -.75, MONTH_NAMES[month.month - 1]);
  }
  for (const year of years) {
    label("year", String(year.year), year.yearIndex, -1.7, -1.35, String(year.year));
    for (let day = 0; day < 7; day++) label("weekday", `${year.year}-${day}`, year.yearIndex, -.35, day + .5,
      DAY_NAMES[(day + layout.options.options.weekStartsOn) % 7], "right");
    for (let week = 0; week < year.weeks; week++) label("week", `${year.year}-${week}`, year.yearIndex, week + .5, 7.75, String(week + 1));
  }
  validateGeneratedItemLimit(graphics.length, "Calendar graphic count");
  const concrete = materializeFillItems(program, layer, graphics.map(graphic => ({ ...graphic,
    properties: materializeMarkEffectProperties(graphic.properties) })));
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return { graphics: concrete, items, frame, layout, dataset };
}
