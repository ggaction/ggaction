import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  BAR_ORIENTATIONS,
  resolveBarOrientation
} from "../../grammar/bars/policy.js";
import { findSemanticScale } from "../../selectors/scales.js";

const OPTIONS = Object.freeze(["axes", "grid", "legend"]);

function validateGuideOption(value, label) {
  if (value !== undefined && value !== false && !isPlainObject(value)) {
    throw new TypeError(`${label} must be false or a plain object.`);
  }
}

function validateOptions(args) {
  if (!isPlainObject(args)) {
    throw new TypeError("createGuides options must be a plain object.");
  }
  for (const key of Object.keys(args)) {
    if (!OPTIONS.includes(key)) {
      throw new Error(`Unknown createGuides option "${key}".`);
    }
  }
  validateGuideOption(args.axes, "createGuides axes");
  validateGuideOption(args.grid, "createGuides grid");
  validateGuideOption(args.legend, "createGuides legend");
}

function hasCartesianEncoding(program) {
  return program.semanticSpec.layers.some(
    layer => layer.encoding?.x !== undefined || layer.encoding?.y !== undefined
  );
}

function hasPolarEncoding(program) {
  return program.semanticSpec.layers.some(
    layer => layer.encoding?.theta !== undefined ||
      layer.encoding?.radius !== undefined
  );
}

function hasGridEncoding(program) {
  return program.semanticSpec.layers.some(
    layer => layer.encoding?.x?.scale !== undefined ||
      layer.encoding?.y?.scale !== undefined ||
      layer.encoding?.theta?.scale !== undefined ||
      layer.encoding?.radius?.scale !== undefined
  );
}

function inferGridOptions(program) {
  if (hasPolarEncoding(program) && !hasCartesianEncoding(program)) {
    return { theta: {}, radial: {} };
  }
  const barOrientations = program.semanticSpec.layers
    .map(resolveBarOrientation)
    .filter(Boolean);
  const positionedLayers = program.semanticSpec.layers.filter(
    layer => layer.encoding?.x !== undefined && layer.encoding?.y !== undefined
  );
  const horizontalQuantitative = positionedLayers.length > 0 &&
    positionedLayers.every(layer =>
      layer.encoding.x.fieldType === "quantitative" &&
      ["nominal", "ordinal", "temporal"].includes(layer.encoding.y.fieldType)
    );
  if (
    horizontalQuantitative ||
    (barOrientations.length > 0 &&
      barOrientations.every(value => value === BAR_ORIENTATIONS.horizontal))
  ) {
    return { horizontal: false, vertical: true };
  }
  return { horizontal: true, vertical: false };
}

function inferAxesOptions(program) {
  const horizontalInterval = program.semanticSpec.layers.some(layer =>
    layer.mark?.type === "rule" &&
    layer.encoding?.x?.fieldType === "quantitative" &&
    layer.encoding?.x2?.fieldType === "quantitative" &&
    ["nominal", "ordinal", "temporal"].includes(layer.encoding?.y?.fieldType)
  );
  return horizontalInterval
    ? { x: { ticksAndLabels: { count: 7 } } }
    : {};
}

function hasLegendEncoding(program) {
  return program.semanticSpec.layers.some(
    layer =>
      (layer.mark?.type === "point" &&
        layer.encoding?.opacity?.scale !== undefined) ||
      (layer.mark?.type === "point" &&
        layer.encoding?.size?.scale !== undefined) ||
      (layer.mark?.type === "point" &&
        layer.encoding?.color?.scale !== undefined &&
        (layer.encoding?.shape?.scale !== undefined ||
          ["sequential", "quantize", "quantile", "threshold"].includes(
            findSemanticScale(program, layer.encoding.color.scale)?.type
          ))) ||
      (layer.mark?.type === "line" &&
        ["color", "strokeDash"].some(
          channel => layer.encoding?.[channel]?.scale !== undefined
        )) ||
      (layer.mark?.type === "bar" &&
        layer.encoding?.color?.scale !== undefined) ||
      (layer.mark?.type === "area" &&
        layer.encoding?.color?.scale !== undefined)
  );
}

function selectOption(explicit, applicable) {
  if (explicit === false) return undefined;
  if (explicit !== undefined) return explicit;
  return applicable ? {} : undefined;
}

const createGuides = action(
  {
    op: "createGuides",
    description: "Create applicable axes, grid, and legend."
  },
  function (args = {}) {
    validateOptions(args);
    const hasAxes = hasCartesianEncoding(this) || hasPolarEncoding(this);
    const axes = args.axes === undefined && hasCartesianEncoding(this)
      ? inferAxesOptions(this)
      : selectOption(args.axes, hasAxes);
    const grid = args.grid === undefined && hasGridEncoding(this)
      ? inferGridOptions(this)
      : selectOption(args.grid, hasGridEncoding(this));
    const legend = selectOption(
      args.legend,
      hasLegendEncoding(this)
    );

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
