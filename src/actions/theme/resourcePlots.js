import { TABLE_PLOT_DEFAULTS } from "../../grammar/tablePlot.js";
import { TRAIL_PLOT_DEFAULTS } from "../../grammar/trailPlot.js";
import { WATERFALL_PLOT_DEFAULTS } from "../../grammar/waterfallPlot.js";
import { OHLC_PLOT_DEFAULTS } from "../../grammar/ohlcPlot.js";
import { PYRAMID_PLOT_DEFAULTS } from "../../grammar/pyramid/plot.js";
import { CALENDAR_PLOT_DEFAULTS } from "../../grammar/calendar/plot.js";
import { GRAPH_PLOT_DEFAULTS } from "../../grammar/graph/plot.js";
import { HIERARCHY_PLOT_DEFAULTS } from "../../grammar/hierarchy/plot.js";
import { FLOW_PLOT_DEFAULTS } from "../../grammar/flow/plot.js";
import { DEFAULT_TEXT_MARK } from "../../grammar/text.js";

const OWNERS = Object.freeze({
  table: { key: "tablePlot", op: "materializeTablePlot" },
  trail: { key: "trailPlot", op: "materializeTrailPlot" },
  waterfall: { key: "waterfallPlot", op: "materializeWaterfallPlot" },
  ohlc: { key: "ohlcPlot", op: "materializeOHLCPlot" },
  pyramid: { key: "pyramidPlot", op: "materializePyramidPlot" },
  calendar: { key: "calendarPlot", op: "materializeCalendarPlot" },
  graph: { key: "graphPlot", op: "materializeGraphPlot" },
  tree: { key: "hierarchyPlot", op: "materializeTreePlot" },
  treemap: { key: "hierarchyPlot", op: "materializeTreemapPlot" },
  partition: { key: "hierarchyPlot", op: "materializePartitionPlot" },
  "flow-node": { key: "flowPlot", op: "materializeFlowNodes" },
  "flow-link": { key: "flowPlot", op: "materializeFlowLinks" }
});

export function resourcePlotThemeOwner(layer) {
  return layer?.mark?.type === "geo" && layer.geoBinding?.mode === "annotation"
    ? { key: "geo", op: "materializeGeoMark" } : OWNERS[layer?.mark?.type];
}

// A family default is lower precedence than an active theme; removing the final
// frame restores that family's own value, not a generic mark default.
export function resourcePlotThemeProperty(path, layer) {
  if (path[0] === "marks" && path[2] === "geo" && layer?.geoBinding?.mode === "annotation") {
    if (path.length !== 4) return undefined;
    const property = path[3], token = property === "fill" ? "text" : ["fontFamily", "fontSize", "fontWeight"].includes(property) ? property : undefined;
    return token === undefined ? undefined : { token, defaultValue: DEFAULT_TEXT_MARK[property] };
  }
  if (path[0] !== "marks" || !["graphPlot", "hierarchyPlot", "flowPlot", "calendarPlot", "pyramidPlot", "ohlcPlot", "waterfallPlot", "trailPlot", "tablePlot"].includes(path[2])) return undefined;
  if (path.includes("overrides")) return { explicit: true };
  const calendarLabel = path[2] === "calendarPlot" && path[3] === "labels";
  if (path.length !== (calendarLabel ? 6 : 5)) return undefined;
  const [, , family, storedRole] = path, property = path.at(-1);
  const role = family === "flowPlot" && storedRole === "body"
    ? { "flow-node": "nodes", "flow-link": "links" }[layer?.mark?.type] : storedRole;
  const defaults = family === "tablePlot" ? TABLE_PLOT_DEFAULTS : family === "trailPlot" ? TRAIL_PLOT_DEFAULTS : family === "waterfallPlot" ? WATERFALL_PLOT_DEFAULTS : family === "ohlcPlot" ? OHLC_PLOT_DEFAULTS : family === "pyramidPlot" ? PYRAMID_PLOT_DEFAULTS : family === "calendarPlot" ? CALENDAR_PLOT_DEFAULTS : family === "graphPlot" ? GRAPH_PLOT_DEFAULTS : family === "flowPlot" ? FLOW_PLOT_DEFAULTS : HIERARCHY_PLOT_DEFAULTS;
  let token;
  if (role === "labels") token = property === "fill" ? "text" : ["fontFamily", "fontSize", "fontWeight"].includes(property) ? property : undefined;
  else if (family === "tablePlot") token = ["headerStyle", "footerStyle"].includes(role)
    ? property === "fill" ? "background" : property === "color" ? "text" : property === "fontWeight" ? "fontWeight" : undefined
    : role === "cells" ? property === "fill" ? "background" : property === "stroke" ? "mutedText" : undefined
      : role === "bars" && property === "fill" || role === "sparklines" && property === "stroke" ? "mark" : undefined;
  else if (family === "trailPlot") token = role === "body" && property === "fill" ? "mark" : undefined;
  else if (family === "waterfallPlot") token = ["bars", "connectors"].includes(role) && property === "stroke" ? "mutedText" : undefined;
  else if (family === "ohlcPlot") token = ["body", "stem"].includes(role) && property === "stroke" ? "mutedText" : undefined;
  else if (family === "calendarPlot") token = role === "cells"
    ? property === "fill" ? "mark" : property === "emptyFill" ? "background" : undefined
    : role === "monthBoundary" && property === "stroke" ? "mutedText" : undefined;
  else if (["nodes", "cells", "stages"].includes(role)) token = property === "fill" ? "mark" : property === "stroke" ? "background" : undefined;
  else if (["edges", "links"].includes(role) && property === (family === "flowPlot" ? "fill" : "stroke")) token = "mutedText";
  return token === undefined ? undefined : { token, defaultValue: defaults[role][property] };
}

function change(node) {
  const match = /^(create|edit)(GraphPlot|TreePlot|TreemapPlot|PartitionPlot|FlowNodes|FlowLinks|CalendarPlot|GeoAnnotation|PyramidPlot|OHLCPlot|WaterfallPlot|TrailPlot|TablePlot)$/u.exec(node.op);
  if (match === null) return;
  const family = match[2] === "TablePlot" ? "tablePlot" : match[2] === "TrailPlot" ? "trailPlot" : match[2] === "GeoAnnotation" ? "geo" : match[2] === "WaterfallPlot" ? "waterfallPlot" : match[2] === "OHLCPlot" ? "ohlcPlot" : match[2] === "PyramidPlot" ? "pyramidPlot" : match[2] === "CalendarPlot" ? "calendarPlot" : match[2] === "GraphPlot" ? "graphPlot" : match[2].startsWith("Flow") ? "flowPlot" : "hierarchyPlot";
  const args = node.args, ids = new Set();
  const materializer = match[2] === "GeoAnnotation" ? "materializeGeoMark" : `materialize${match[2]}`;
  const visit = entry => {
    if (entry.op === materializer && typeof entry.args.id === "string") ids.add(entry.args.id);
    entry.children?.forEach(visit);
  };
  visit(node);
  const id = args.target ?? args.id ?? (ids.size === 1 ? [...ids][0] : undefined);
  return typeof id === "string" ? { family, id, args } : undefined;
}

export function clearResourcePlotThemeOverrides(overrides, node) {
  const target = change(node);
  if (target === undefined) return;
  const disabled = ["labels", "links", "connectors", "monthBoundary"].filter(role => target.args[role] === false);
  if (target.family === "calendarPlot" && target.args.labels && typeof target.args.labels === "object") {
    for (const [role, value] of Object.entries(target.args.labels)) if (value === false) disabled.push(`labels.${role}`);
  }
  for (const role of disabled) {
    const prefix = `c:marks.${target.id}.${target.family}.${role}.`;
    for (const key of overrides) if (key.startsWith(prefix)) overrides.delete(key);
  }
}

export function addResourcePlotThemeOverrides(overrides, node) {
  const target = change(node);
  if (target === undefined) return;
  const { family, id, args } = target;
  if (family === "geo") {
    for (const property of ["fill", "fontFamily", "fontSize", "fontWeight"]) {
      if (Object.hasOwn(args, property)) overrides.add(`c:marks.${id}.geo.${property}`);
    }
    return;
  }
  const roles = ["headerStyle", "footerStyle", "sparklines", "bars", "connectors", "body", "stem", "stages", "nodes", "cells", "edges", "links", "labels", "monthBoundary"];
  for (const role of roles) {
    if (args[role] === null || typeof args[role] !== "object") continue;
    const styles = family === "calendarPlot" && role === "labels" ? Object.entries(args.labels).map(([label, value]) => [`labels.${label}`, value])
      : [[family === "flowPlot" && role !== "labels" ? "body" : role, args[role]]];
    for (const [storedRole, style] of styles) {
      if (style === null || typeof style !== "object") continue;
      for (const property of ["fill", "emptyFill", "stroke", "fontFamily", "fontSize", "fontWeight"]) {
        if (Object.hasOwn(style, property)) overrides.add(`c:marks.${id}.${family}.${storedRole}.${property}`);
      }
    }
  }
}
