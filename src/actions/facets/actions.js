import { action } from "../../core/action.js";
import { freezeOwned, isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateOptionObject,
  validatePositiveFinite
} from "../../core/validation.js";
import {
  resolveFacetDefinition,
  resolveFacetGridDefinition
} from "../../grammar/facets/index.js";
import {
  FACET_SCALE_CHANNELS,
  normalizeFacetScalePolicies
} from "../../grammar/facets/scales.js";
import { resolveFacetLayout } from "../../layout/facets.js";
import { compositionChildDescriptor } from
  "../../materialization/composition.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from "../../theme/defaults.js";
import { deriveFacetChildren } from "./derive.js";
import { resolveFacetChildrenScales } from "./derive.js";
import { replayDerivedData } from "./replay.js";
import { composeFacetGuides } from "./guides.js";
import { applyCompositionState } from "../composition/actions.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";

const FACET_OPTIONS = Object.freeze([
  "id", "field", "data", "values", "columns", "gap", "align", "padding", "scales",
  "guides"
]);
const FACET_GRID_OPTIONS = Object.freeze([
  "id", "data", "rows", "columns", "combinations", "gap", "align",
  "padding", "scales", "guides"
]);
const REPEAT_OPTIONS = Object.freeze([
  "id", "target", "channel", "fields", "columns", "gap", "align",
  "padding", "scales", "guides"
]);
const SOURCE_EDIT_OPTIONS = Object.freeze(["program"]);
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

function usedFacetScalePolicies(program, policies) {
  return Object.fromEntries(FACET_SCALE_CHANNELS.flatMap(channel =>
    program.semanticSpec.layers.some(
      layer => layer.encoding?.[channel]?.scale !== undefined
    ) ? [[channel, policies[channel]]] : []
  ));
}

function facetUnitTemplate(program) {
  const seedId = program.compositionSpec.children.find(id =>
    program.children[id]?.semanticSpec.layers.length > 0
  ) ?? program.compositionSpec.children[0];
  const seed = program.children[seedId];
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
  if (current.facet.repeat !== undefined) {
    const template = facetUnitTemplate(program);
    const definition = resolveRepeatDefinition(template, {
      id: current.id,
      ...current.facet.repeat
    });
    const derived = deriveRepeatChildren(
      template,
      definition,
      usedFacetScalePolicies(template, scales),
      true
    );
    return applyCompositionState(program, {
      children: derived.children,
      compositionSpec: {
        ...current,
        facet: { ...current.facet, scales, guides }
      }
    }, current.children);
  }
  const definition = current.facet.grid === undefined
    ? resolveFacetDefinition(program.semanticSpec, {
        id: current.id,
        data: current.facet.data,
        field: current.facet.field,
        values: current.facet.values
      })
    : resolveFacetGridDefinition(program.semanticSpec, {
        id: current.id,
        data: current.facet.data,
        rows: current.facet.grid.rows,
        columns: current.facet.grid.columns,
        combinations: current.facet.grid.combinations
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

function resolveRepeatDefinition(program, args) {
  if (!isPlainObject(args)) {
    throw new TypeError("repeatCharts options must be a plain object.");
  }
  const id = validateUserId(args.id ?? "repeat", "Repeat id");
  if (!["x", "y"].includes(args.channel)) {
    throw new Error('repeatCharts channel must be "x" or "y".');
  }
  if (!Array.isArray(args.fields) || args.fields.length === 0 ||
      args.fields.some(field => typeof field !== "string" || field.length === 0)) {
    throw new TypeError("repeatCharts fields must be a non-empty array of field names.");
  }
  if (new Set(args.fields).size !== args.fields.length) {
    throw new Error("repeatCharts fields must be unique.");
  }
  const eligible = program.semanticSpec.layers.filter(layer =>
    layer.encoding?.x?.scale !== undefined &&
    layer.encoding?.y?.scale !== undefined &&
    layer.encoding?.[args.channel]?.field !== undefined &&
    ["point", "line", "area", "bar", "rule", "tick", "rect"].includes(layer.mark?.type)
  );
  let target;
  if (args.target !== undefined) {
    target = validateUserId(args.target, "Repeat target");
    if (!eligible.some(layer => layer.id === target)) {
      throw new Error(`repeatCharts target "${target}" is not an eligible Cartesian mark.`);
    }
  } else if (eligible.length === 1) {
    target = eligible[0].id;
  } else {
    throw new Error(
      eligible.length === 0
        ? "repeatCharts requires one complete Cartesian mark."
        : "repeatCharts target is ambiguous; provide target."
    );
  }
  if (program.semanticSpec.layers.length !== 1) {
    throw new Error("repeatCharts currently supports one direct Cartesian mark only.");
  }
  const config = program.markConfigs[target] ?? {};
  const composite = [
    "boxPlot", "gradientPlot", "violinPlot", "regressionPlot", "endpointPlot",
    "ecdfPlot", "raincloudPlot", "intervalPlot"
  ].find(key => config[key] !== undefined);
  if (composite !== undefined) {
    throw new Error(`repeatCharts does not replace the ${composite} composite role.`);
  }
  const layer = findLayer(program, target);
  const dataset = findDataset(program, layer.data);
  if (dataset?.transform?.length > 0) {
    throw new Error("repeatCharts does not rewrite a derived dataset dependency.");
  }
  const encoding = layer.encoding[args.channel];
  return {
    id,
    target,
    channel: args.channel,
    fields: [...args.fields],
    data: layer.data,
    encoding,
    cells: args.fields.map((field, index) => ({
      id: `${id}-field-${index + 1}`,
      field,
      value: field
    }))
  };
}

function repeatEncodingArgs(definition, field) {
  const encoding = definition.encoding;
  return {
    target: definition.target,
    field,
    fieldType: encoding.fieldType,
    ...(encoding.temporalUnit === undefined ? {} : { temporalUnit: encoding.temporalUnit }),
    ...(encoding.aggregate === undefined ? {} : { aggregate: encoding.aggregate }),
    ...(encoding.bin === undefined ? {} : { bin: encoding.bin }),
    ...(encoding.stack === undefined ? {} : { stack: encoding.stack }),
    ...(encoding.weight === undefined ? {} : { weight: encoding.weight }),
    scale: { id: encoding.scale }
  };
}

function deriveRepeatChildren(base, definition, scales, closeInheritedAction) {
  const template = base.semanticSpec.title.text === undefined
    ? base
    : base.removeTitle();
  const independentlyResolved = Object.fromEntries(definition.cells.map(cell => [
    cell.id,
    template[definition.channel === "x" ? "encodeX" : "encodeY"](
      repeatEncodingArgs(definition, cell.field)
    )
  ]));
  return resolveFacetChildrenScales(
    template,
    definition.cells.map(cell => cell.id),
    independentlyResolved,
    scales,
    closeInheritedAction
  );
}

export const repeatCharts = action(
  {
    op: "repeatCharts",
    description: "Repeat one direct Cartesian chart across an ordered field list."
  },
  function (args = {}) {
    validateOptionObject(args, REPEAT_OPTIONS, "repeatCharts");
    const guides = normalizeGuides(args.guides);
    if (guides.axes === "outer") {
      throw new Error("repeatCharts does not promote axes across different repeated fields.");
    }
    const definition = resolveRepeatDefinition(this, args);
    const requestedScales = {
      ...(args.scales ?? {}),
      [definition.channel]: args.scales?.[definition.channel] ?? "independent"
    };
    const scalePolicies = normalizeFacetScalePolicies(
      this.semanticSpec,
      requestedScales
    );
    const derived = deriveRepeatChildren(
      this,
      definition,
      requestedScales,
      true
    );
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
        values: definition.fields,
        repeat: {
          target: definition.target,
          channel: definition.channel,
          fields: definition.fields
        },
        scales: scalePolicies.channels,
        guides
      }
    };
    return applyCompositionState(
      this._withMaterializationConfig(["facets", definition.id], {
        headers: DEFAULT_HEADERS
      }),
      { children: derived.children, compositionSpec },
      compositionSpec.children
    );
  }
);

export const facetGrid = action(
  {
    op: "facetGrid",
    description: "Repeat one direct-source Cartesian chart across a row and column field grid."
  },
  function (args = {}) {
    validateOptionObject(args, FACET_GRID_OPTIONS, "facetGrid");
    const guides = normalizeGuides(args.guides);
    const definition = resolveFacetGridDefinition(this.semanticSpec, args);
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
        value: cell.value,
        row: cell.row,
        column: cell.column
      })),
      columns: definition.grid.columns.values.length,
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
        values: definition.cells.map(cell => cell.value),
        grid: {
          ...definition.grid,
          cells: definition.cells.map(cell => ({
            id: cell.id,
            row: cell.row,
            column: cell.column,
            rowValue: cell.rowValue,
            columnValue: cell.columnValue,
            empty: cell.empty
          }))
        },
        scales: scalePolicies.channels,
        guides
      }
    };
    return applyCompositionState(
      this._withMaterializationConfig(["facets", definition.id], {
        headers: DEFAULT_HEADERS
      }),
      { children: derived.children, compositionSpec },
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
    if (current.repeat !== undefined && guides.axes === "outer") {
      throw new Error("repeatCharts does not promote axes across different repeated fields.");
    }
    return rederiveFacet(this, {
      scales: current.scales,
      guides
    });
  }
);

function adoptUnitState(program, actionOwner) {
  if (!(program instanceof actionOwner.constructor)) {
    throw new TypeError("editFacetSource program must be a ChartProgram.");
  }
  if (program.compositionSpec !== undefined) {
    throw new Error("editFacetSource program must be a complete unit ChartProgram.");
  }
  if (program.actionStack.length !== 0) {
    throw new Error("editFacetSource program has an unfinished action stack.");
  }
  return new actionOwner.constructor({
    semanticSpec: program.semanticSpec,
    graphicSpec: program.graphicSpec,
    resolvedScales: program.resolvedScales,
    materializationConfigs: program.materializationConfigs,
    children: {},
    context: program.context,
    trace: actionOwner.trace,
    actionStack: actionOwner.actionStack,
    actionSequence: actionOwner._actionSequence
  });
}

export const editFacetSource = action(
  {
    op: "editFacetSource",
    description: "Reapply one facet, grid, or repeat recipe to a revised complete unit program.",
    scope: "composition"
  },
  function (args = {}) {
    validateOptionObject(args, SOURCE_EDIT_OPTIONS, "editFacetSource");
    requireFacetProgram(this, "editFacetSource");
    const current = this.compositionSpec;
    const facetConfig = this.materializationConfigs.facets?.[current.id];
    const base = adoptUnitState(args.program, this);
    let revised;
    const scales = usedFacetScalePolicies(base, current.facet.scales);
    if (current.facet.grid !== undefined) {
      revised = base.facetGrid({
        id: current.id,
        data: current.facet.data,
        rows: current.facet.grid.rows,
        columns: current.facet.grid.columns,
        combinations: current.facet.grid.combinations,
        gap: current.gap,
        align: current.align,
        padding: current.padding,
        scales,
        guides: current.facet.guides
      });
    } else if (current.facet.repeat !== undefined) {
      revised = base.repeatCharts({
        id: current.id,
        ...current.facet.repeat,
        columns: current.columns,
        gap: current.gap,
        align: current.align,
        padding: current.padding,
        scales,
        guides: current.facet.guides
      });
    } else {
      revised = base.facet({
        id: current.id,
        data: current.facet.data,
        field: current.facet.field,
        values: current.facet.values,
        columns: current.columns,
        gap: current.gap,
        align: current.align,
        padding: current.padding,
        scales,
        guides: current.facet.guides
      });
    }
    if (facetConfig !== undefined) {
      revised = revised
        ._withMaterializationConfig(["facets", current.id], facetConfig)
        .materializeComposition();
    }
    if (revised.semanticSpec.title.text !== undefined) {
      revised = revised.removeTitle();
    }
    if (this.semanticSpec.title.text !== undefined) {
      revised = revised.createTitle({
        ...this.titleConfig,
        ...this.semanticSpec.title
      });
    }
    return revised;
  }
);

export function registerFacetActions(ProgramClass) {
  ProgramClass.prototype.replayDerivedData = replayDerivedData;
  ProgramClass.prototype.composeFacetGuides = composeFacetGuides;
  ProgramClass.prototype.facet = facet;
  ProgramClass.prototype.facetGrid = facetGrid;
  ProgramClass.prototype.repeatCharts = repeatCharts;
  ProgramClass.prototype.editFacetHeaders = editFacetHeaders;
  ProgramClass.prototype.editFacetScales = editFacetScales;
  ProgramClass.prototype.editFacetGuides = editFacetGuides;
  ProgramClass.prototype.editFacetSource = editFacetSource;
}
