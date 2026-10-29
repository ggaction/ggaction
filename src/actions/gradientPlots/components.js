import { assertGuideOptions, guideConflict } from "../guides/reuse.js";
import { action, closedAction } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";
import { GRADIENT_PROFILE_FIELDS } from "../../grammar/gradientProfile.js";
import {
  requestedStrokeDetails,
  STROKE_STYLE_PROPERTIES
} from "../../grammar/strokeStyle.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { findLayer } from "../../selectors/layers.js";
import { createDensityLegendPaint } from "./paint.js";
import { legendResourcePolicy } from "../../materialization/guides/resources.js";
import { resolveConcreteGraphicBounds } from "../../grammar/schemas/graphicBounds.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";

const CENTER_OPTIONS = Object.freeze([
  "id", "owner", "data", "category", "categoryType", "coordinate",
  "categoryScale", "measureScale", "orientation", "size", "stroke",
  "strokeWidth", ...STROKE_STYLE_PROPERTIES
]);
const LEGEND_OPTIONS = Object.freeze(["owner", "title", "position"]);

export const createGradientPlotCenter = /* @__PURE__ */ closedAction(
  {
    op: "createGradientPlotCenter",
    description: "Create the optional center rule for one gradient plot."
  }, CENTER_OPTIONS,
  function (args = {}) {
    const categoryAction = args.orientation === "vertical" ? "encodeX" : "encodeY";
    const measureAction = args.orientation === "vertical" ? "encodeY" : "encodeX";
    const spanOrientation = args.orientation === "vertical" ? "horizontal" : "vertical";
    let next = this.createRuleMark({
      id: args.id,
      data: args.data,
      ...requestedStrokeDetails(args, "createGradientPlotCenter")
    });
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

export const rematerializeGradientPlotLegend = /* @__PURE__ */ action(
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
    const right = bounds.x + bounds.width;
    const legendBounds = Object.keys(this.guideConfigs.legend ?? {}).flatMap(kind =>
      legendResourcePolicy(kind).graphicIds.filter(id => this.graphicSpec.objects[id])
        .map(id => resolveConcreteGraphicBounds(this.graphicSpec, id, this.materializationConfigs.textMetrics)))
      .filter(box => box && box.left >= right);
    const x = Math.max(right + 50, ...legendBounds.map(box => box.right + 24));
    const y = bounds.y + 50;
    const width = 22;
    const height = Math.min(170, Math.max(80, bounds.height - 110));
    const baseline = this.semanticSpec.guides.legend?.color?.scale === `${owner}Density`
      ? this.editSemantic({ property: "guide.legend.color", remove: true }) : this;
    let next = editProperties(baseline, ids.strip, {
      x, y, width, height,
      fill: createDensityLegendPaint(config.gradient.opacity),
      stroke: DEFAULT_COLORS.border,
      strokeWidth: 1
    });
    next = editProperties(next, ids.labels, {
      x: x + width + 10,
      y: [y + height, y],
      text: ["Low", "High"],
      fill: DEFAULT_COLORS.mutedText,
      fontSize: 11,
      fontFamily: "sans-serif",
      textAlign: "left",
      textBaseline: "middle"
    });
    return editProperties(next, ids.title, {
      x,
      y: y - 18,
      text: config.guides.legend.title,
      fill: DEFAULT_COLORS.text,
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
  const { ids } = resolveDensityLegend(program, args);
  if (Object.keys(program.markConfigs).some(owner => owner !== args.owner &&
      program.graphicSpec.objects[`${owner}DensityLegend`])) {
    guideConflict("Gradient plot density legend uses a different scale or family");
  }
  const existing = Object.values(ids).filter(id => program.graphicSpec.objects[id] !== undefined);
  if (existing.length === 0) return program.createGradientPlotLegend(args);
  if (existing.length !== Object.keys(ids).length) {
    guideConflict("Gradient plot density legend has incomplete ownership");
  }
  const { owner, ...explicit } = args;
  assertGuideOptions(explicit, program.markConfigs[owner].gradientPlot.guides.legend, "Gradient plot density legend");
  return program;
}

export const createGradientPlotLegend = /* @__PURE__ */ action(
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
      [`scale[${densityScale}].range`, { palette: { name: "greys" } }]
    ]) {
      next = next.editSemantic({ property, value });
    }
    // Older snapshots used the color-channel slot for this independent guide.
    // Its existing owner config is sufficient; free that slot for actual hue.
    if (next.semanticSpec.guides.legend?.color?.scale === densityScale) {
      next = next.editSemantic({ property: "guide.legend.color", remove: true });
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
