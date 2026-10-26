import { chart } from "../../../src/index.js";
import { realisticLegendOptions } from "./realistic-guide-scale-recipes.js";

const anchors = ["right", "left", "top", "bottom", "top-left", "top-right", "bottom-left", "bottom-right"];
const border = { color: "#94a3b8", lineWidth: 1, padding: 8, background: "#fff", strokeDash: [4, 2] };
export const PARENT_LEGEND_WITNESS_PROFILES = Object.freeze([
  ...anchors.map((position, index) => ({ id: `anchor-${position}`, family: "color", legend: {
    position, direction: ["top", "bottom"].includes(position) ? "horizontal" : "vertical",
    columns: ["top", "bottom"].includes(position) ? 2 : 1,
    align: ["top", "bottom"].includes(position) ? index % 2 ? "right" : "left" : "center",
    layout: "edge", order: "scale", overflow: false, combine: "separate",
    symbol: index % 2 ? "auto" : { width: 20, height: 12, stroke: "#fff", strokeWidth: 1 },
    border: [false, true, border][index % 3],
    title: index === 7 ? false : "Source groups",
    titleStyle: { align: ["left", "center", "right"][index % 3], color: "#0f172a", fontSize: 13, fontFamily: "sans-serif", fontWeight: 700 }
  } })),
  { id: "free-position", family: "color", legend: { at: { x: 24, y: 24 }, border, symbol: { layers: [
    { type: "line", length: 24, lineWidth: 2, opacity: 0.7 },
    { type: "point", shape: "circle", size: 24, fill: "#94a3b8", stroke: "#fff", strokeWidth: 1, opacity: 0.7 },
    { type: "swatch", width: 20, height: 12, stroke: "#fff", strokeWidth: 1, opacity: 0.7 }
  ] }, clipHeight: 12 } },
  { id: "legacy-bottom", family: "color", legend: { position: "bottom", direction: "horizontal", layout: "legacy-bottom", offset: 8, titlePosition: "top" } },
  { id: "explicit-order-overflow", family: "color", explicitOrder: true, legend: { position: "top", direction: "horizontal", align: "center", columns: 2,
    titlePosition: "left", overflow: { maxItems: 2, summary: "ellipsis-count" } } },
  ...["x", "y", "theta"].map(channel => ({ id: `linked-${channel}`, family: `order-${channel}`, legend: { position: "bottom", order: { channel } } })),
  { id: "line-recipe", family: "series", legend: { position: "bottom", channels: ["color"], symbol: { length: 28, lineWidth: 2 } } },
  ...["row", "column", "wrap"].map(blockLayout => ({ id: `blocks-${blockLayout}`, family: "multi", legend: {
    position: "bottom", channels: ["color", "shape", "size"], direction: "vertical", columns: 1,
    blockLayout, count: 3, combine: "separate", symbol: "auto", labels: { offset: 80, color: "#334155", fontSize: 12, fontFamily: "sans-serif", fontWeight: 500, format: ".2f" }
  } })),
  { id: "shape-size", family: "size-shape", legend: { position: "top-left", channels: ["shape", "size"], combine: "size-shape", symbol: "auto", clipHeight: 12 } },
  { id: "color-size", family: "color-size", legend: { position: "top-left", channels: ["color", "size"], combine: "color-size", count: 3,
    clipHeight: 12, symbol: { type: "point", stroke: "#fff", strokeWidth: 1, opacity: 0.65 } } },
  { id: "color-size-shape", family: "color-size-shape", legend: { position: "top-left", channels: ["color", "size", "shape"],
    combine: "color-size-shape", clipHeight: 12, symbol: { type: "point", stroke: "#fff", strokeWidth: 1, opacity: 0.65 } } },
  { id: "summary-line", family: "series", legend: { position: "bottom", channels: ["color"],
    overflow: { maxItems: 2, summarySymbol: "first-hidden" }, symbol: { layers: [{ type: "line", length: 24, lineWidth: 2 }] } } },
  { id: "color-gradient", family: "continuous", legend: { position: "bottom", align: "center", direction: "horizontal", titlePosition: "bottom",
    channels: ["color"], representation: "gradient", count: 3, gradient: { length: 180, thickness: 14, opacity: 0.7 }, labels: { format: ".2f" } } },
  { id: "color-symbol-count", family: "continuous", legend: { position: "top-left", channels: ["color"], representation: "symbols", count: 3,
    symbol: { type: "point", radius: 12, stroke: "#fff", strokeWidth: 1 }, clipHeight: 12 } },
  { id: "color-symbol-values", family: "continuous", sampledValues: true, legend: { position: "top-left", channels: ["color"], representation: "symbols",
    symbol: { type: "point", radius: 8, stroke: "#fff", strokeWidth: 1 } } },
  { id: "opacity-samples", family: "opacity", sampledValues: true, legend: { position: "right", channels: ["opacity"],
    symbol: { type: "point", radius: 12, fill: "#2563eb", stroke: "#111827", strokeWidth: 1 }, clipHeight: 12, labels: { format: ".1f" } } },
  { id: "shared-template", family: "color", legacy: "shared" },
  { id: "disabled", family: "color", legacy: false }
]);

export function parentLegendWitnessDomain(view) {
  const values = view.rows.map(row => row.value).filter(Number.isFinite);
  const lower = Math.min(...values), upper = Math.max(...values);
  return lower === upper ? [lower, lower + 1] : [lower, upper];
}

export function parentLegendWitnessSource(view, profile) {
  const domain = parentLegendWitnessDomain(view);
  const categories = [...new Set(view.rows.map(row => row.category))];
  let program = chart().createCanvas({ plot: { width: 600, height: 450 }, margin: 100 })
    .createData({ id: "rows", values: view.rows });
  program = profile.family === "series" ? program.createLineMark({ id: "points" }) : program.createPointMark({ id: "points", shape: "circle" });
  if (profile.family === "order-theta") {
    program = program.encodeTheta({ field: "category", fieldType: "nominal", scale: { type: "point" } })
      .encodeR({ field: "orderNumeric" });
  } else {
    program = program.encodeX(profile.family === "order-x"
      ? { field: "category", fieldType: "nominal", scale: { type: "band" } } : { field: "orderNumeric" })
      .encodeY(profile.family === "order-y"
        ? { field: "category", fieldType: "nominal", scale: { type: "band" } } : { field: "value" });
  }
  if(profile.family==='color-size-shape') {
    const cut=(domain[0]+domain[1])/2;
    return program.encodeColor({field:'value',fieldType:'quantitative',scale:{type:'threshold',domain:[cut],range:['#17365d','#8fbbe8']}})
      .encodeSize({field:'value',scale:{type:'threshold',domain:[cut],range:[100,400]}})
      .encodeShape({field:'value',scale:{domain:[domain[0],cut],range:['circle','diamond'],unknown:'circle'}});
  }
  program = program.encodeColor(["continuous", "color-size"].includes(profile.family)
    ? { field: "value", fieldType: "quantitative", scale: { id: "color", type: "sequential", domain } }
    : { field: "category" });
  if (["shape", "size-shape", "multi"].includes(profile.family)) program = program.encodeShape({ field: "category" });
  if (profile.family === "size-shape") program = program.encodeSize({ field: "category", fieldType: "ordinal",
    scale: { type: "ordinal", domain: categories, range: categories.map((_, index) => 100 + index * 200) } });
  if (["color-size", "multi"].includes(profile.family)) program = program.encodeSize({ field: "value", scale: { type: "linear", domain, range: [100, 900] } });
  if (profile.family === "opacity") program = program.encodeOpacity({ field: "value", scale: { domain, range: [0.2, 0.9] } });
  if (profile.legacy === "shared") program = program.createLegend({ target: "points", channels: ["color"] });
  return program;
}

export function parentLegendWitnessOptions(view, profile) {
  if (Object.hasOwn(profile, "legacy")) return profile.legacy;
  const common = realisticLegendOptions({ id: profile.id }, "Source groups", { target: "points", channels: ["color"] });
  const options = { ...common, titlePosition: "top", direction: "vertical", align: "center", columns: 1, ...profile.legend };
  if (options.at !== undefined) for (const key of ["position", "align", "offset"]) delete options[key];
  if (options.layout === "legacy-bottom") delete options.columns;
  if (profile.family === "opacity") for (const key of ["columns", "direction"]) delete options[key];
  if (profile.id === "color-gradient") for (const key of ["columns", "symbol", "itemGap"]) delete options[key];
  if (options.layout !== "legacy-bottom") {
    options.titlePadding = 6;
    if (profile.id !== "color-gradient") options.rowPadding = 2;
  }
  if (profile.explicitOrder) options.order = { values: [...new Set(view.rows.map(row => row.category))].reverse() };
  if(profile.family==='color-size-shape') {
    const [lower,upper]=parentLegendWitnessDomain(view);options.values=[lower,(lower+upper)/2];
  }
  if (profile.sampledValues) {
    const [lower, upper] = parentLegendWitnessDomain(view); options.values = [lower, lower + (upper - lower) / 2, upper];
  }
  return options;
}

export function createParentLegendWitness(source, host, legend, profile) {
  const shared = { guides: { axes: "each", legend }, gap: 40, spacing: "plot" };
  if (host === "facet") return source.facet({ field: "subgroup", columns: 2, ...shared });
  if (host === "facetGrid") return source.facetGrid({ rows: { field: "subgroup" }, columns: { field: "category" }, ...shared });
  const channel = profile.family === "order-theta" ? "r" : profile.family === "order-x" ? "y" : "x";
  const field = channel === "x" || channel === "r" ? "orderNumeric" : "value";
  return source.repeatCharts({ target: "points", channel, fields: [field], ...shared });
}
