import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateOptionObject,
  validatePositiveFinite
} from "../../core/validation.js";
import { resolveFacetDefinition } from "../../grammar/facets/index.js";
import { normalizeFacetScalePolicies } from
  "../../grammar/facets/scales.js";
import { resolveFacetLayout } from "../../layout/facets.js";
import { compositionChildDescriptor } from
  "../../materialization/composition.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from "../../theme/defaults.js";
import { deriveFacetChildren } from "./derive.js";
import { rebindLayerData, replayDerivedData } from "./replay.js";
import { composeFacetGuides } from "./guides.js";

const FACET_OPTIONS = Object.freeze([
  "id", "field", "data", "columns", "gap", "align", "padding", "scales",
  "guides"
]);
const GUIDE_OPTIONS = Object.freeze(["axes", "legend"]);
const HEADER_OPTIONS = Object.freeze([
  "fontSize", "fontFamily", "fontWeight", "color", "offset"
]);
const DEFAULT_HEADERS = Object.freeze({
  fontSize: 12,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: 600,
  color: DEFAULT_COLORS.strongText,
  offset: 10
});

function normalizeGuides(guides) {
  if (guides === undefined) return { axes: "each", legend: false };
  validateOptionObject(guides, GUIDE_OPTIONS, "facet.guides");
  const axes = guides.axes ?? "each";
  if (!["each", "outer"].includes(axes)) {
    throw new Error('facet guides.axes must be "each" or "outer".');
  }
  const legend = guides.legend ?? false;
  if (legend !== false && legend !== "shared") {
    throw new Error('facet guides.legend must be false or "shared".');
  }
  return { axes, legend };
}

function normalizeHeaderPatch(args, previous) {
  validateOptionObject(args, HEADER_OPTIONS, "editFacetHeaders", {
    allowEmpty: false,
    emptyMessage: "editFacetHeaders requires at least one change."
  });
  const next = { ...previous, ...args };
  validatePositiveFinite(next.fontSize, "Facet header fontSize");
  validateNonEmptyString(next.fontFamily, "Facet header fontFamily");
  validateNonEmptyString(next.color, "Facet header color");
  validateNonNegativeFinite(next.offset, "Facet header offset");
  if (!(
    (typeof next.fontWeight === "string" && next.fontWeight.length > 0) ||
    Number.isFinite(next.fontWeight)
  )) {
    throw new TypeError("Facet header fontWeight must be a non-empty string or number.");
  }
  return next;
}

function requireFacetProgram(program, operation) {
  program._assertCompositionProgram(operation);
  if (program.compositionSpec.type !== "facet") {
    throw new Error(`${operation} requires a facet composition.`);
  }
}

export const facet = action(
  {
    op: "facet",
    description: "Repeat one direct-source chart by field value."
  },
  function (args = {}) {
    validateOptionObject(args, FACET_OPTIONS, "facet");
    const guides = normalizeGuides(args.guides);
    const definition = resolveFacetDefinition(this.semanticSpec, args);
    const scalePolicies = normalizeFacetScalePolicies(
      this.semanticSpec,
      args.scales ?? {}
    );
    const derived = deriveFacetChildren(this, definition, {
      closeInheritedAction: true,
      stripTitle: true,
      scales: args.scales ?? {}
    });
    const preflight = resolveFacetLayout({
      children: definition.cells.map(cell => ({
        ...compositionChildDescriptor(cell.id, derived.children[cell.id]),
        value: cell.value
      })),
      ...(Object.hasOwn(args, "columns") ? { columns: args.columns } : {}),
      ...(Object.hasOwn(args, "gap") ? { gap: args.gap } : {}),
      ...(Object.hasOwn(args, "align") ? { align: args.align } : {}),
      ...(Object.hasOwn(args, "padding") ? { padding: args.padding } : {}),
      sharedLegend: guides.legend === "shared"
    });
    const compositionSpec = {
      id: definition.id,
      type: "facet",
      children: definition.cells.map(cell => cell.id),
      columns: preflight.columns,
      gap: preflight.gap,
      align: preflight.align,
      padding: preflight.padding,
      facet: {
        data: definition.data,
        field: definition.field,
        values: definition.values,
        scales: scalePolicies.channels,
        guides
      }
    };
    let next = this
      ._withCompositionState({
        children: derived.children,
        compositionSpec
      })
      ._withMaterializationConfig(["facets", definition.id], {
        headers: DEFAULT_HEADERS
      });
    for (const id of compositionSpec.children) {
      next = next.useProgram({ id });
    }
    return next.materializeComposition();
  }
);

export const editFacetHeaders = action(
  {
    op: "editFacetHeaders",
    description: "Edit parent-owned facet header appearance.",
    scope: "composition"
  },
  function (args = {}) {
    requireFacetProgram(this, "editFacetHeaders");
    const id = this.compositionSpec.id;
    const config = this.materializationConfigs.facets?.[id];
    if (!isPlainObject(config?.headers)) {
      throw new Error(`Facet "${id}" requires header configuration.`);
    }
    const headers = normalizeHeaderPatch(args, config.headers);
    return this
      ._withMaterializationConfig(["facets", id], { ...config, headers })
      .materializeComposition();
  }
);

export function registerFacetActions(ProgramClass) {
  ProgramClass.prototype.replayDerivedData = replayDerivedData;
  ProgramClass.prototype.rebindLayerData = rebindLayerData;
  ProgramClass.prototype.composeFacetGuides = composeFacetGuides;
  ProgramClass.prototype.facet = facet;
  ProgramClass.prototype.editFacetHeaders = editFacetHeaders;
}
