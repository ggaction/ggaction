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
  const legend = selectOption(
    args.legend,
    applicability.legend
  );
  return { axes, grid, legend };
}

const createGuides = action(
  {
    op: "createGuides",
    description: "Create applicable axes, grid, and legend."
  },
  function (args = {}) {
    const { axes, grid, legend } = resolveGuideOptions(this, args);
    if (axes === undefined && grid === undefined && legend === undefined) {
      throw new Error("createGuides requires at least one selected guide.");
    }

    let next = this;
    if (axes !== undefined) next = next.createAxes(axes);
    if (grid !== undefined) next = next.createGrid(grid);
    if (legend !== undefined) next = next.createLegend(legend);
    return next;
  }
);

export function registerGuideCollectionActions(ProgramClass) {
  ProgramClass.prototype.createGuides = createGuides;
}
