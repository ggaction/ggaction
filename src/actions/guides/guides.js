import { assertAxisFrame } from "./axes/frame.js";
import { previewAxesFrame } from "./axes/axes.js";
import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateOptionObject } from "../../core/validation.js";
import {
  resolveAutomaticGridOptions,
  resolveGuideApplicability
} from "./applicability.js";
import { findDataset } from "../../selectors/datasets.js";
import { findUpstreamTransform } from
  "../../materialization/dataProvenance.js";
import { sampleNumericRange } from "../../grammar/numeric.js";
import { automaticLegendOptions } from "./legends/automatic.js";

const OPTIONS = Object.freeze(["axes", "grid", "legend"]);

function validateGuideOption(value, label) {
  if (value !== undefined && value !== false && !isPlainObject(value)) {
    throw new TypeError(`${label} must be false or a plain object.`);
  }
}

function validateOptions(args) {
  validateOptionObject(args, OPTIONS, "createGuides");
  validateGuideOption(args.axes, "createGuides axes");
  validateGuideOption(args.grid, "createGuides grid");
  validateGuideOption(args.legend, "createGuides legend");
}

function inferAxesOptions(program, applicability, layers) {
  const horizontalInterval = layers.some(layer =>
    program.markConfigs[layer.id]?.boxPlot?.orientation === "horizontal" ||
    layer.mark?.type === "rule" &&
    layer.encoding?.x?.fieldType === "quantitative" &&
    layer.encoding?.x2?.fieldType === "quantitative" &&
    ["nominal", "ordinal", "temporal"].includes(layer.encoding?.y?.fieldType)
  );
  const inferred = horizontalInterval
    ? { x: { ticksAndLabels: { count: 7 } } }
    : {};
  const directions = applicability.axes.directions;
  for (const channel of ["x", "y"]) {
    if (!directions[channel] && layers.some(layer => layer.encoding?.[channel] !== undefined)) {
      inferred[channel] = false;
    }
  }
  const hasStoredY = layers.some(
    layer => layer.encoding?.y !== undefined
  );
  if (!directions.y && hasStoredY) inferred.y = false;
  const horizonLayers = layers.filter(layer =>
    findUpstreamTransform(
      program,
      findDataset(program, layer.data),
      "horizon"
    ) !== undefined
  );
  if (horizonLayers.length === 1 && directions.x && !directions.y) {
    const scaleId = horizonLayers[0].encoding?.x?.scale;
    const domain = program.resolvedScales?.[scaleId]?.domain;
    if (
      Array.isArray(domain) &&
      domain.length === 2 &&
      domain.every(Number.isFinite) &&
      domain[0] !== domain[1]
    ) {
      const low = Math.min(...domain);
      const high = Math.max(...domain);
      inferred.x = {
        ...(inferred.x ?? {}),
        ticksAndLabels: {
          values: sampleNumericRange(low, high, 6, "Horizon axis domain")
        }
      };
    }
  }
  return inferred;
}

function selectOption(explicit, applicable) {
  if (explicit === false) return undefined;
  if (explicit !== undefined) return explicit;
  return applicable ? {} : undefined;
}

function mergeInferredOptions(inferred, explicit) {
  if (!isPlainObject(inferred) || !isPlainObject(explicit)) return explicit;
  const merged = { ...inferred };
  for (const [key, value] of Object.entries(explicit)) {
    merged[key] = isPlainObject(value) && isPlainObject(inferred[key])
      ? mergeInferredOptions(inferred[key], value)
      : value;
  }
  if (Object.hasOwn(explicit, "count")) delete merged.values;
  if (Object.hasOwn(explicit, "values")) delete merged.count;
  return merged;
}

function hasStoredGuideCollection(program, collection) {
  return [
    program.semanticSpec.guides?.[collection],
    program.guideConfigs?.[collection]
  ].some(value => value !== undefined && Object.keys(value).length > 0);
}

export function resolveGuideOptions(program, args = {}, layers = program.semanticSpec.layers) {
  validateOptions(args);
  const applicability = resolveGuideApplicability(program, layers);
  const hasAxes = applicability.axes.cartesian || applicability.axes.polar ||
    applicability.axes.parallel;
  const inferredAxes = applicability.axes.cartesian
    ? inferAxesOptions(program, applicability, layers)
    : {};
  const axes = args.axes === undefined && applicability.axes.cartesian
    ? inferredAxes
    : args.axes !== undefined && args.axes !== false && hasAxes
      ? mergeInferredOptions(inferredAxes, args.axes)
      : selectOption(args.axes, hasAxes);
  const grid = args.grid === undefined &&
      (applicability.grid.cartesian || applicability.grid.polar)
    ? resolveAutomaticGridOptions(program, layers)
    : selectOption(
        args.grid,
        applicability.grid.cartesian || applicability.grid.polar
      );
  const legend = automaticLegendOptions(program, selectOption(
    args.legend,
    applicability.legend
  ), layers);
  return { axes, grid, legend };
}

const createGuides = /* @__PURE__ */ action(
  {
    op: "createGuides",
    description: "Create applicable axes, grid, and legend.",
    scope: "any"
  },
  function (args = {}) {
    if (this.compositionSpec?.facet) {
      validateOptions(args);
      if (Object.keys(args).length === 0) {
        const selected = Object.entries(resolveGuideOptions(this, args))
          .filter(([, options]) => options !== undefined);
        if (selected.length > 0 && selected.every(([kind]) =>
          hasStoredGuideCollection(this, kind === "axes" ? "axis" : kind)
        )) return this;
      }
      return this.editFacetSource({ action: { method: "createGuides", options: args } });
    }
    this._assertUnitProgram("createGuides");
    const { axes, grid, legend } = resolveGuideOptions(this, args);
    if (axes === undefined && grid === undefined && legend === undefined) {
      if (this.semanticSpec.layers.length > 0 &&
          OPTIONS.some(key => args[key] === undefined)) return this;
      throw new Error("createGuides requires at least one selected guide.");
    }

    if (axes !== undefined && !(args.axes === undefined && hasStoredGuideCollection(this, "axis"))) {
      assertAxisFrame(previewAxesFrame(this, axes));
    }
    let next = this;
    if (
      axes !== undefined &&
      !(args.axes === undefined && hasStoredGuideCollection(this, "axis"))
    ) next = next.createAxes(axes);
    if (
      grid !== undefined &&
      !(args.grid === undefined && hasStoredGuideCollection(this, "grid"))
    ) next = next.createGrid(grid);
    if (
      legend !== undefined &&
      !(args.legend === undefined && hasStoredGuideCollection(this, "legend"))
    ) next = next.createLegend(legend);
    return next;
  }
);

export function registerGuideCollectionActions(ProgramClass) {
  ProgramClass.prototype.createGuides = createGuides;
}
