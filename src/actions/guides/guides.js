import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  resolveAutomaticGridOptions,
  resolveGuideApplicability
} from "./applicability.js";

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
    const applicability = resolveGuideApplicability(this);
    const hasAxes = applicability.axes.cartesian || applicability.axes.polar;
    const axes = args.axes === undefined && applicability.axes.cartesian
      ? inferAxesOptions(this)
      : selectOption(args.axes, hasAxes);
    const grid = args.grid === undefined &&
        (applicability.grid.cartesian || applicability.grid.polar)
      ? resolveAutomaticGridOptions(this)
      : selectOption(
          args.grid,
          applicability.grid.cartesian || applicability.grid.polar
        );
    const legend = selectOption(
      args.legend,
      applicability.legend
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
