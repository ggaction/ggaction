import { assertGuideOptions, guideConflict } from "../guides/reuse.js";
import { action } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";
import { GRADIENT_PROFILE_FIELDS } from "../../grammar/gradientProfile.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { findLayer } from "../../selectors/layers.js";
import { createDensityLegendPaint } from "./paint.js";

const CENTER_OPTIONS = Object.freeze([
  "id", "owner", "data", "category", "categoryType", "coordinate",
  "categoryScale", "measureScale", "orientation", "size", "stroke",
  "strokeWidth"
]);
const LEGEND_OPTIONS = Object.freeze(["owner", "title", "position"]);

export const createGradientPlotCenter = action(
  {
    op: "createGradientPlotCenter",
    description: "Create the optional center rule for one gradient plot."
  },
  function (args = {}) {
    validateKeys(args, CENTER_OPTIONS, "createGradientPlotCenter");
    const categoryAction = args.orientation === "vertical" ? "encodeX" : "encodeY";
    const measureAction = args.orientation === "vertical" ? "encodeY" : "encodeX";
    const spanOrientation = args.orientation === "vertical" ? "horizontal" : "vertical";
    let next = this.createRuleMark({ id: args.id, data: args.data });
    next = next[categoryAction]({
      target: args.id,
      field: args.category,
      fieldType: args.categoryType,
      coordinate: args.coordinate,
      scale: { id: args.categoryScale }
    });
    next = next[measureAction]({
      target: args.id,
      field: GRADIENT_PROFILE_FIELDS.center,
      fieldType: "quantitative",
      coordinate: args.coordinate,
      scale: { id: args.measureScale }
    });
    return next
      .encodeStroke({ target: args.id, value: args.stroke })
      .encodeStrokeWidth({ target: args.id, value: args.strokeWidth })
      .materializeRuleSpan({
        id: args.id,
        orientation: spanOrientation,
        size: args.size
      });
  }
);

function legendIds(owner) {
  return {
    strip: `${owner}DensityLegend`,
    labels: `${owner}DensityLegendLabels`,
    title: `${owner}DensityLegendTitle`
  };
}

function requireLegendOwner(program, owner) {
  const layer = findLayer(program, owner);
  const config = program.markConfigs[owner]?.gradientPlot;
  if (layer === undefined || config?.materialized !== true) {
    throw new Error(`Unknown gradient-plot legend owner "${owner}".`);
  }
  return { layer, config };
}

function editProperties(program, target, properties) {
  let next = program;
  for (const [property, value] of Object.entries(properties)) {
    next = next.editGraphics({ target, property, value });
  }
  return next;
}

export const rematerializeGradientPlotLegend = action(
  {
    op: "rematerializeGradientPlotLegend",
    description: "Rematerialize one gradient plot density legend."
  },
  function ({ owner } = {}) {
    const { config } = requireLegendOwner(this, owner);
    const ids = legendIds(owner);
    const bounds = resolveGraphicBounds(this);
    const position = config.guides.legend.position;
    if (position !== "right") {
      throw new Error('Gradient plot density legend currently requires position "right".');
    }
    const x = bounds.x + bounds.width + 50;
    const y = bounds.y + 50;
    const width = 22;
    const height = Math.min(170, Math.max(80, bounds.height - 110));
    let next = editProperties(this, ids.strip, {
      x, y, width, height,
      fill: createDensityLegendPaint(config.gradient.opacity),
      stroke: "#cbd5e1",
      strokeWidth: 1
    });
    next = editProperties(next, ids.labels, {
      x: x + width + 10,
      y: [y + height, y],
      text: ["Low", "High"],
      fill: "#64748b",
      fontSize: 11,
      fontFamily: "sans-serif",
      textAlign: "left",
      textBaseline: "middle"
    });
    return editProperties(next, ids.title, {
      x,
      y: y - 18,
      text: config.guides.legend.title,
      fill: "#334155",
      fontSize: 12,
      fontFamily: "sans-serif",
      fontWeight: 600,
      textAlign: "left",
      textBaseline: "middle"
    });
  }
);

function resolveDensityLegend(program, args) {
  validateKeys(args, LEGEND_OPTIONS, "createGradientPlotLegend");
  requireLegendOwner(program, args.owner);
  if (args.position !== undefined && args.position !== "right") {
    throw new Error('Gradient plot density legend currently requires position "right".');
  }
  if (args.title !== undefined && (typeof args.title !== "string" || args.title.length === 0)) {
    throw new TypeError("Gradient plot density legend title must be a non-empty string.");
  }
  const ids = legendIds(args.owner);
  const densityScale = `${args.owner}Density`;
  const title = args.title ?? "Relative density";
  return { ids, densityScale, title };
}

export function fulfillGradientPlotLegend(program, args) {
  const { ids, densityScale } = resolveDensityLegend(program, args);
  const occupied = program.semanticSpec.guides.legend?.color;
  if (occupied !== undefined && occupied.scale !== densityScale) {
    guideConflict("Gradient plot density legend uses a different scale or family");
  }
  const existing = Object.values(ids).filter(id => program.graphicSpec.objects[id] !== undefined);
  if (existing.length === 0) return program.createGradientPlotLegend(args);
  if (existing.length !== Object.keys(ids).length || occupied?.scale !== densityScale) {
    guideConflict("Gradient plot density legend has incomplete ownership");
  }
  const { owner, ...explicit } = args;
  assertGuideOptions(explicit, program.markConfigs[owner].gradientPlot.guides.legend, "Gradient plot density legend");
  return program;
}

export const createGradientPlotLegend = action(
  {
    op: "createGradientPlotLegend",
    description: "Create the neutral density legend owned by one gradient plot."
  },
  function (args = {}) {
    const { ids, densityScale, title } = resolveDensityLegend(this, args);
    let next = this;
    for (const [property, value] of [
      [`scale[${densityScale}].type`, "sequential"],
      [`scale[${densityScale}].domain`, this.markConfigs[args.owner].gradientPlot.intensityDomain],
      [`scale[${densityScale}].range`, { palette: { name: "greys" } }],
      ["guide.legend.color.scale", densityScale],
      ["guide.legend.color.title", title]
    ]) {
      next = next.editSemantic({ property, value });
    }
    for (const [id, type, length] of [
      [ids.strip, "rect"],
      [ids.labels, "text", 2],
      [ids.title, "text"]
    ]) {
      next = next.createGraphics({
        id,
        type,
        ...(length === undefined ? {} : { length }),
        parent: "canvas"
      });
    }
    next = next._withMarkConfig(args.owner, {
      ...next.markConfigs[args.owner],
      gradientPlot: {
        ...next.markConfigs[args.owner].gradientPlot,
        guides: {
          ...next.markConfigs[args.owner].gradientPlot.guides,
          legend: {
            title,
            position: args.position ?? "right"
          }
        }
      }
    });
    return next.rematerializeGradientPlotLegend({ owner: args.owner });
  }
);

export function removeGradientPlotLegend(program, owner) {
  const ids = legendIds(owner);
  let next = program;
  for (const id of Object.values(ids)) {
    if (next.graphicSpec.objects[id] !== undefined) {
      next = next.editGraphics({ target: id, remove: true });
    }
  }
  return next;
}
