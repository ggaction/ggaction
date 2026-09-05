import { action } from "../../core/action.js";
import { freezeOwned, isPlainObject } from "../../core/immutable.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateOptionObject,
  validatePositiveFinite
} from "../../core/validation.js";
import { resolveFacetDefinition } from "../../grammar/facets/index.js";
import {
  FACET_SCALE_CHANNELS,
  normalizeFacetScalePolicies
} from "../../grammar/facets/scales.js";
import { resolveFacetLayout } from "../../layout/facets.js";
import { compositionChildDescriptor } from
  "../../materialization/composition.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from "../../theme/defaults.js";
import { deriveFacetChildren } from "./derive.js";
import { replayDerivedData } from "./replay.js";
import { composeFacetGuides } from "./guides.js";
import { applyCompositionState } from "../composition/actions.js";

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

function requireFacetProgram(program, operation) {
  program._assertCompositionProgram(operation);
  if (program.compositionSpec.type !== "facet") {
    throw new Error(`${operation} requires a facet composition.`);
  }
}

function facetUnitTemplate(program) {
  const seed = program.children[program.compositionSpec.children[0]];
  if (seed === undefined) {
    throw new Error(`Facet "${program.compositionSpec.id}" requires a retained child.`);
  }
  const { facets: _facets, guides: _guides, ...unitConfigs } = program.materializationConfigs;
  return new program.constructor({
    semanticSpec: program.semanticSpec,
    graphicSpec: seed.graphicSpec,
    resolvedScales: program.resolvedScales,
    materializationConfigs: freezeOwned({
      ...unitConfigs,
      ...(seed.materializationConfigs.guides === undefined
        ? {}
        : { guides: seed.materializationConfigs.guides }),
      canvas: seed.materializationConfigs.canvas
    }),
    children: {},
    context: program.context,
    trace: program.trace,
    actionStack: program.actionStack,
    actionSequence: program._actionSequence
  });
}

function rederiveFacet(program, { scales, guides }) {
  const current = program.compositionSpec;
  const definition = resolveFacetDefinition(program.semanticSpec, {
    id: current.id,
    data: current.facet.data,
    field: current.facet.field,
    values: current.facet.values
  });
  const request = Object.fromEntries(FACET_SCALE_CHANNELS.flatMap(channel =>
    program.semanticSpec.layers.some(
      layer => layer.encoding?.[channel]?.scale !== undefined
    ) ? [[channel, scales[channel]]] : []
  ));
  const normalized = normalizeFacetScalePolicies(program.semanticSpec, request);
  const template = facetUnitTemplate(program);
  const derived = deriveFacetChildren(template, definition, {
    closeInheritedAction: true,
    stripTitle: true,
    scales: request
  });
  const compositionSpec = {
    ...current,
    facet: {
      ...current.facet,
      scales: normalized.channels,
      guides
    }
  };
  let parent = program._withoutMaterializationConfig(["guides", "legend"]);
  for (const [kind, config] of Object.entries(template.guideConfigs.legend ?? {})) {
    parent = parent._withLegendConfig(kind, config);
  }
  return applyCompositionState(parent, {
    children: derived.children,
    compositionSpec
  }, compositionSpec.children);
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
    return applyCompositionState(
      this._withMaterializationConfig(["facets", definition.id], {
        headers: DEFAULT_HEADERS
      }),
      {
        children: derived.children,
        compositionSpec
      },
      compositionSpec.children
    );
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
    validateOptionObject(args, HEADER_OPTIONS, "editFacetHeaders", {
      allowEmpty: false,
      emptyMessage: "editFacetHeaders requires at least one change."
    });
    const headers = { ...config.headers, ...args };
    validatePositiveFinite(headers.fontSize, "Facet header fontSize");
    validateNonEmptyString(headers.fontFamily, "Facet header fontFamily");
    validateNonEmptyString(headers.color, "Facet header color");
    validateNonNegativeFinite(headers.offset, "Facet header offset");
    if (!(
      (typeof headers.fontWeight === "string" && headers.fontWeight.length > 0) ||
      Number.isFinite(headers.fontWeight)
    )) {
      throw new TypeError(
        "Facet header fontWeight must be a non-empty string or number."
      );
    }
    return this
      ._withMaterializationConfig(["facets", id], { ...config, headers })
      .materializeComposition();
  }
);

export const editFacetScales = action(
  {
    op: "editFacetScales",
    description: "Edit facet scale-resolution policies and rederive every cell.",
    scope: "composition"
  },
  function (args = {}) {
    requireFacetProgram(this, "editFacetScales");
    validateOptionObject(args, FACET_SCALE_CHANNELS, "editFacetScales", {
      allowEmpty: false,
      emptyMessage: "editFacetScales requires at least one channel policy change."
    });
    for (const channel of Object.keys(args)) {
      if (!this.semanticSpec.layers.some(
        layer => layer.encoding?.[channel]?.scale !== undefined
      )) {
        throw new Error(
          `Facet scale channel "${channel}" is not used by an affected layer.`
        );
      }
    }
    const current = this.compositionSpec.facet;
    const scales = { ...current.scales, ...args };
    if (FACET_SCALE_CHANNELS.every(
      channel => scales[channel] === current.scales[channel]
    )) {
      throw new Error("editFacetScales requires at least one channel policy change.");
    }
    return rederiveFacet(this, {
      scales,
      guides: current.guides
    });
  }
);

export const editFacetGuides = action(
  {
    op: "editFacetGuides",
    description: "Edit facet guide ownership and rederive every cell.",
    scope: "composition"
  },
  function (args = {}) {
    requireFacetProgram(this, "editFacetGuides");
    validateOptionObject(args, GUIDE_OPTIONS, "editFacetGuides", {
      allowEmpty: false,
      emptyMessage: "editFacetGuides requires at least one guide policy."
    });
    const current = this.compositionSpec.facet;
    const guides = normalizeGuides({ ...current.guides, ...args });
    return rederiveFacet(this, {
      scales: current.scales,
      guides
    });
  }
);

export function registerFacetActions(ProgramClass) {
  ProgramClass.prototype.replayDerivedData = replayDerivedData;
  ProgramClass.prototype.composeFacetGuides = composeFacetGuides;
  ProgramClass.prototype.facet = facet;
  ProgramClass.prototype.editFacetHeaders = editFacetHeaders;
  ProgramClass.prototype.editFacetScales = editFacetScales;
  ProgramClass.prototype.editFacetGuides = editFacetGuides;
}
