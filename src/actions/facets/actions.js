import { normalizeFacetAxes, validateFacetAxisPolicy } from "../../core/facetAxisPolicy.js";
import { DEFAULT_ACTION_METHODS } from "../../core/vocabulary.js";
import { axisGraphicIds } from "../../materialization/guides/resources.js";
import { cartesianAxisOwners, axisTargetArgs } from "../../selectors/axes.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { action, closedAction, getWrappedActionMetadata } from "../../core/action.js";
import { registerFacetDataRevision, reviseUnitData } from "../data/revise.js";
import { applyMaterializationPlan } from "../../materialization/dependencies.js";
import { getMarkMaterializationStep } from "../../materialization/marks/index.js";
import { buildMaterializationPlan } from "../../materialization/planner.js";
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
import { collectFacetScaleBindings, resolveFacetFamily } from
  "../../grammar/facets/dependencies.js";
import {
  FACET_SCALE_CHANNELS,
  normalizeFacetScalePolicies
} from "../../grammar/facets/scales.js";
import { resolveFacetLayout } from "../../layout/facets.js";
import { compositionChildDescriptor } from
  "../../materialization/composition.js";
import { deriveFacetChildren } from "./derive.js";
import { resolveFacetChildrenScales } from "./derive.js";
import { replayDerivedData } from "./replay.js";
import { composeFacetGuides } from "./guides.js";
import { applyCompositionState } from "../composition/actions.js";
import { replayCompositionThemeState } from "../theme/composition.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { normalizeDisplayLabelMap } from "../../grammar/displayLabels.js";
import { resolveRotation } from "../../grammar/rotation.js";
import { normalizeFacetHeaderTitle } from "../../grammar/facetHeaders.js";
import {
  createDefaultFacetHeaders,
  normalizeFacetHeadersConfig,
  resolveFacetHeaderConfig
} from "../../materialization/facetHeaders.js";

const FACET_OPTIONS = Object.freeze([
  "id", "field", "data", "values", "columns", "gap", "spacing", "topLane", "align", "padding", "scales",
  "guides", "headers"
]);
const FACET_GRID_OPTIONS = Object.freeze([
  "id", "data", "rows", "columns", "combinations", "gap", "spacing", "topLane", "align",
  "padding", "scales", "guides", "headers"
]);
const REPEAT_OPTIONS = Object.freeze([
  "id", "target", "channel", "fields", "columns", "gap", "spacing", "topLane", "align",
  "padding", "scales", "guides", "headers"
]);
const SOURCE_ACTION_NAMES = new Set(DEFAULT_ACTION_METHODS);

const SOURCE_EDIT_OPTIONS = Object.freeze(["program", "action"]);
const GUIDE_OPTIONS = Object.freeze(["axes", "legend"]);
const HEADER_OPTIONS = Object.freeze([
  "fontSize", "fontFamily", "fontWeight", "color", "offset", "role",
  "labelMap", "side", "align", "rotation", "title", "anchor"
]);
const HEADER_STYLE_OPTIONS = Object.freeze([
  "fontSize", "fontFamily", "fontWeight", "color", "offset", "align", "rotation", "anchor"
]);

function normalizeGuides(guides, allowStored = false) {
  if (guides === undefined) return { axes: "each", legend: false };
  validateOptionObject(guides, GUIDE_OPTIONS, "facet.guides");
  const axes = normalizeFacetAxes(guides.axes);
  const legend = guides.legend ?? false;
  if (legend !== false && legend !== "shared" && !isPlainObject(legend)) {
    throw new Error('facet guides.legend must be false, "shared", or legend options.');
  }
  if (!allowStored && isPlainObject(legend) && Object.hasOwn(legend, "type")) {
    throw new Error("Facet legend options do not accept internal type tags.");
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
  const used = new Set(
    collectFacetScaleBindings(program.semanticSpec).map(binding => binding.policyKey)
  );
  return Object.fromEntries(
    FACET_SCALE_CHANNELS.flatMap(channel =>
      used.has(channel) && policies[channel] !== undefined ? [[channel, policies[channel]]] : []
    )
  );
}

function facetUnitTemplate(program, sourceAction = false) {
  const seedId = program.compositionSpec.children.find(id =>
    program.children[id]?.semanticSpec.layers.length > 0
  ) ?? program.compositionSpec.children[0];
  const seed = program.children[seedId];
  if (seed === undefined) {
    throw new Error(`Facet "${program.compositionSpec.id}" requires a retained child.`);
  }
  const { facets: _facets, guides: _guides, ...unitConfigs } = program.materializationConfigs;
  const { legend: _parentLegend, ...sourceSemanticGuides } = program.semanticSpec.guides;
  const sourceGuides = { ...seed.materializationConfigs.guides,
    axis: _guides?.axis ?? seed.guideConfigs.axis,
    grid: _guides?.grid ?? seed.guideConfigs.grid };
  if (sourceAction) delete unitConfigs.title;
  return new program.constructor({
    semanticSpec: sourceAction ? { ...program.semanticSpec, title: {},
      guides: { ...sourceSemanticGuides, ...(seed.semanticSpec.guides.legend === undefined ? {} : { legend: seed.semanticSpec.guides.legend }) } } : program.semanticSpec,
    graphicSpec: seed.graphicSpec,
    resolvedScales: program.resolvedScales,
    materializationConfigs: freezeOwned({
      ...unitConfigs,
      ...(seed.materializationConfigs.theme === undefined
        ? {}
        : { theme: seed.materializationConfigs.theme }),

      ...(sourceGuides === undefined ? {} : { guides: sourceGuides }),
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
  const request = usedFacetScalePolicies(program, scales);
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

function resolveEditedFacetHeaders(currentHeaders, args, grid, operation = "editFacetHeaders") {
  validateOptionObject(args, HEADER_OPTIONS, operation, {
    allowEmpty: false,
    emptyMessage: `${operation} requires at least one change.`
  });
  const role = args.role ?? "all";
  if (!["all", "row", "column"].includes(role)) {
    throw new Error(`Unknown facet header role "${role}".`);
  }
  if (role === "all" && Object.hasOwn(args, "side")) {
    throw new Error(`${operation} side requires an explicit row or column role.`);
  }
  if (role === "all" && Object.hasOwn(args, "title")) {
    throw new Error(`${operation} title requires an explicit row or column role.`);
  }
  if (role === "row" && grid === undefined) {
    throw new Error(`${operation} row role requires a row-column facet grid.`);
  }
  if (Object.hasOwn(args, "side")) {
    const sides = role === "row" ? ["left", "right"]
      : grid === undefined
        ? ["top", "bottom", "left", "right"] : ["top", "bottom"];
    if (!sides.includes(args.side)) {
      throw new Error(`${operation} ${role} side must be ${sides.join(" or ")}.`);
    }
  }
  if (Object.hasOwn(args, "align") &&
      !["start", "center", "end"].includes(args.align)) {
    throw new Error(`${operation} align must be start, center, or end.`);
  }
  if (role === "all" && Object.keys(args).every(key => key === "role")) {
    throw new Error(`${operation} requires at least one change.`);
  }
  const current = normalizeFacetHeadersConfig(currentHeaders);
  const owner = role === "all" ? "common" : role;
  const patch = { ...current[owner] };
  if (Object.hasOwn(args, "title")) {
    const title = normalizeFacetHeaderTitle(patch.title, args.title);
    if (title === undefined) delete patch.title;
    else patch.title = title;
  }
  for (const key of HEADER_STYLE_OPTIONS) {
    if (Object.hasOwn(args, key)) patch[key] = args[key];
  }
  if (Object.hasOwn(args, "rotation")) {
    patch.rotation = resolveRotation(args.rotation, `${operation} ${role} rotation`);
  }
  if (Object.hasOwn(args, "side")) patch.side = args.side;
  if (Object.hasOwn(args, "labelMap")) {
    if (args.labelMap === "auto") delete patch.labelMap;
    else {
      patch.labelMap = normalizeDisplayLabelMap(
        args.labelMap,
        `${operation} ${role} labelMap`
      );
    }
  }
  const headers = {
    ...current,
    ...(role === "all" ? {} : { mode: "roles" }),
    [owner]: patch
  };
  for (const headerRole of ["all", "row", "column"]) {
    const resolved = resolveFacetHeaderConfig(headers, headerRole);
    validatePositiveFinite(resolved.fontSize, `Facet ${headerRole} header fontSize`);
    validateNonEmptyString(resolved.fontFamily, `Facet ${headerRole} header fontFamily`);
    validateNonEmptyString(resolved.color, `Facet ${headerRole} header color`);
    validateNonNegativeFinite(resolved.offset, `Facet ${headerRole} header offset`);
    if (resolved.rotation !== undefined && !Number.isFinite(resolved.rotation)) {
      throw new TypeError(`Facet ${headerRole} header rotation must resolve to finite radians.`);
    }
    if (!(
      (typeof resolved.fontWeight === "string" && resolved.fontWeight.length > 0) ||
      Number.isFinite(resolved.fontWeight)
    )) {
      throw new TypeError(
        `Facet ${headerRole} header fontWeight must be a non-empty string or number.`
      );
    }
    if (!["start", "center", "end"].includes(resolved.align)) {
      throw new Error(`Facet ${headerRole} header align must be start, center, or end.`);
    }
    if (resolved.labelMap !== undefined) {
      normalizeDisplayLabelMap(
        resolved.labelMap,
        `Facet ${headerRole} header labelMap`
      );
    }
  }
  return headers;
}

function initialFacetHeaders(value, grid) {
  let headers = createDefaultFacetHeaders();
  if (value === undefined) return headers;
  validateOptionObject(value, [...HEADER_STYLE_OPTIONS, "labelMap", "row", "column"], "facet.headers");
  const { row, column, ...common } = value;
  if (Object.keys(common).length > 0) headers = resolveEditedFacetHeaders(headers, common, grid, "facet.headers");
  for (const [role, patch] of [["row", row], ["column", column]]) {
    if (patch === undefined) continue;
    validateOptionObject(patch, HEADER_OPTIONS.filter(key => key !== "role"), `facet.headers.${role}`);
    headers = resolveEditedFacetHeaders(headers, { ...patch, role }, grid, `facet.headers.${role}`);
  }
  return headers;
}

function composeDerivedFacet(program, args, { definition, derived, guides, scalePolicies, facet }) {
  const retainedHeaders = program.materializationConfigs.facets?.[definition.id]?.headers;
  const headers = args.headers === undefined && retainedHeaders !== undefined
    ? normalizeFacetHeadersConfig(retainedHeaders)
    : initialFacetHeaders(args.headers, definition.grid);
  const preflight = resolveFacetLayout({
    spacing: args.spacing,
    topLane: args.topLane,
    plots: Object.entries(derived.children).map(([id, child]) => ({ id, ...resolveGraphicBounds(child) })),
    children: definition.cells.map(cell => ({
      ...compositionChildDescriptor(cell.id, derived.children[cell.id]), value: cell.value,
      ...(definition.grid === undefined ? {} : { row: cell.row, column: cell.column })
    })),
    columns: definition.grid?.columns.values.length ?? args.columns,
    gap: args.gap, align: args.align, padding: args.padding,
    sharedLegend: guides.legend === "shared"
  });
  const compositionSpec = {
    id: definition.id, type: "facet", children: definition.cells.map(cell => cell.id),
    columns: preflight.columns, gap: preflight.gap, align: preflight.align, padding: preflight.padding,
    ...(preflight.spacing === undefined ? {} : { spacing: preflight.spacing }),
    ...(preflight.topLane === undefined ? {} : { topLane: preflight.topLane }),
    facet: { data: definition.data, ...facet, scales: scalePolicies.channels, guides }
  };
  return applyCompositionState(
    program._withMaterializationConfig(["facets", definition.id], { headers }),
    { children: derived.children, compositionSpec }, compositionSpec.children
  );
}

function partitionFacetAction(op, description, definitionResolver) {
  return closedAction({ op, description }, op === "facet" ? FACET_OPTIONS : FACET_GRID_OPTIONS,
    function (args = {}) {
      const guides = normalizeGuides(args.guides);
      const definition = definitionResolver(this.semanticSpec, args);
      validateFacetAxisPolicy(guides.axes, definition.family);
      const scalePolicies = normalizeFacetScalePolicies(this.semanticSpec, args.scales ?? {});
      const derived = deriveFacetChildren(this, definition, {
        closeInheritedAction: true, stripTitle: true, scales: args.scales ?? {}
      });
      const facet = definition.grid === undefined
        ? { field: definition.field, values: definition.values }
        : { values: definition.cells.map(cell => cell.value), grid: {
            ...definition.grid, cells: definition.cells.map(cell => ({
              id: cell.id, row: cell.row, column: cell.column,
              rowValue: cell.rowValue, columnValue: cell.columnValue, empty: cell.empty
            }))
          } };
      return composeDerivedFacet(this, args, { definition, derived, guides, scalePolicies, facet });
    });
}

export const facet = /* @__PURE__ */ partitionFacetAction("facet",
  "Repeat one direct-source chart by field value.", resolveFacetDefinition);

function resolveRepeatDefinition(program, args) {
  if (!isPlainObject(args)) {
    throw new TypeError("repeatCharts options must be a plain object.");
  }
  const id = validateUserId(args.id ?? "repeat", "Repeat id");
  const parallelChannel = isPlainObject(args.channel);
  if (parallelChannel) {
    const keys = Object.keys(args.channel);
    if (keys.length !== 1 || keys[0] !== "parallelDimension" ||
        typeof args.channel.parallelDimension !== "string" ||
        args.channel.parallelDimension.length === 0) {
      throw new Error(
        "repeatCharts Parallel channel must contain exactly one non-empty parallelDimension."
      );
    }
  } else if (!["x", "y", "theta", "r"].includes(args.channel)) {
    throw new Error(
      'repeatCharts channel must be "x", "y", "theta", "r", or one parallelDimension.'
    );
  }
  if (!Array.isArray(args.fields) || args.fields.length === 0 ||
      args.fields.some(field => typeof field !== "string" || field.length === 0)) {
    throw new TypeError("repeatCharts fields must be a non-empty array of field names.");
  }
  if (new Set(args.fields).size !== args.fields.length) {
    throw new Error("repeatCharts fields must be unique.");
  }
  const family = resolveFacetFamily(program.semanticSpec).family;
  const semanticChannel = args.channel === "r" ? "radius" : args.channel;
  const eligible = program.semanticSpec.layers.filter(layer => {
    if (parallelChannel) {
      const matches = (layer.encoding?.parallel?.dimensions ?? []).filter(
        dimension => dimension.field === args.channel.parallelDimension
      );
      return family === "parallel" && layer.mark?.type === "line" && matches.length === 1;
    }
    if (["x", "y"].includes(args.channel)) {
      return family === "cartesian" &&
        layer.encoding?.x?.scale !== undefined &&
        layer.encoding?.y?.scale !== undefined &&
        layer.encoding?.[args.channel]?.field !== undefined &&
        ["point", "line", "area", "bar", "rule", "tick", "rect"].includes(layer.mark?.type);
    }
    const role = program.markConfigs[layer.id]?.compositionRole;
    if (family !== "polar" || ["pie", "radar"].includes(role)) return false;
    return ["point", "line", "arc"].includes(layer.mark?.type) &&
      layer.encoding?.[semanticChannel]?.field !== undefined;
  });
  let target;
  if (args.target !== undefined) {
    target = validateUserId(args.target, "Repeat target");
    if (!eligible.some(layer => layer.id === target)) {
      throw new Error(
        `repeatCharts target "${target}" is not eligible for the requested field role.`
      );
    }
  } else if (eligible.length === 1) {
    target = eligible[0].id;
  } else {
    throw new Error(
      eligible.length === 0
        ? "repeatCharts requires one eligible complete mark for the requested field role."
        : "repeatCharts target is ambiguous; provide target."
    );
  }
  const unrelatedLayers = program.semanticSpec.layers.filter(layer => {
    if (layer.id === target) return false;
    const attachedLabel = layer.mark?.type === "text" && layer.source === target;
    const statisticalReference = program.markConfigs[layer.id]
      ?.statisticalReference?.source === target;
    return !attachedLabel && !statisticalReference;
  });
  if (unrelatedLayers.length > 0) {
    throw new Error("repeatCharts currently supports one direct mark only.");
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
  // Lookup has already preserved the primary grain and materialized its fields.
  // Repeating an output field changes only the encoding, never either input table.
  if (dataset?.transform?.length > 0 && dataset.transform[0].type!=="lookup") {
    throw new Error("repeatCharts does not rewrite a derived dataset dependency.");
  }
  const encoding = parallelChannel
    ? layer.encoding.parallel
    : layer.encoding[semanticChannel];
  const dimensionIndex = parallelChannel
    ? encoding.dimensions.findIndex(
        dimension => dimension.field === args.channel.parallelDimension
      )
    : undefined;
  return {
    id,
    target,
    channel: parallelChannel ? { ...args.channel } : args.channel,
    policyKey: parallelChannel ? "parallelDimensions" : args.channel,
    fields: [...args.fields],
    data: layer.data,
    encoding,
    ...(dimensionIndex === undefined ? {} : { dimensionIndex }),
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

function parallelRepeatDimensions(program, definition, field) {
  return definition.encoding.dimensions.map((dimension, index) => {
    const semanticScale = findSemanticScale(program, dimension.scale);
    if (semanticScale === undefined) {
      throw new Error(`repeatCharts Parallel dimension scale "${dimension.scale}" is missing.`);
    }
    const { id: _id, ...scale } = semanticScale;
    void _id;
    const replacement = index === definition.dimensionIndex;
    return {
      field: replacement ? field : dimension.field,
      fieldType: dimension.fieldType,
      title: replacement && dimension.title === dimension.field
        ? field
        : dimension.title,
      scale
    };
  });
}

function deriveRepeatedProgram(template, definition, field) {
  if (isPlainObject(definition.channel)) {
    return template.encodeParallelCoordinates({
      target: definition.target,
      coordinate: findLayer(template, definition.target).coordinate,
      dimensions: parallelRepeatDimensions(template, definition, field),
      ...(definition.encoding.key === undefined ? {} : { key: definition.encoding.key }),
      missing: definition.encoding.missing
    });
  }
  const operation = {
    x: "encodeX",
    y: "encodeY",
    theta: "encodeTheta",
    r: "encodeR"
  }[definition.channel];
  return template[operation](repeatEncodingArgs(definition, field));
}

function deriveRepeatChildren(base, definition, scales, closeInheritedAction) {
  const template = base.semanticSpec.title.text === undefined
    ? base
    : base.removeTitle();
  const independentlyResolved = Object.fromEntries(definition.cells.map(cell => [
    cell.id,
    deriveRepeatedProgram(template, definition, cell.field)
  ]));
  return resolveFacetChildrenScales(
    template,
    definition.cells.map(cell => cell.id),
    independentlyResolved,
    scales,
    closeInheritedAction
  );
}

export const repeatCharts = /* @__PURE__ */ closedAction(
  {
    op: "repeatCharts",
    description: "Repeat one direct chart across an ordered field-role list."
  }, REPEAT_OPTIONS,
  function (args = {}) {
    const guides = normalizeGuides(args.guides);
    const definition = resolveRepeatDefinition(this, args);
    validateFacetAxisPolicy(guides.axes, resolveFacetFamily(this.semanticSpec).family, true);
    const requestedScales = {
      ...(args.scales ?? {}),
      [definition.policyKey]: args.scales?.[definition.policyKey] ?? "independent"
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
    return composeDerivedFacet(this, args, {
      definition, derived, guides, scalePolicies,
      facet: { values: definition.fields,
        repeat: { target: definition.target, channel: definition.channel, fields: definition.fields } }
    });
  }
);

export const facetGrid = /* @__PURE__ */ partitionFacetAction("facetGrid",
  "Repeat one direct-source Cartesian chart across a row and column field grid.", resolveFacetGridDefinition);

export const editFacetHeaders = /* @__PURE__ */ action(
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
    const headers = resolveEditedFacetHeaders(config.headers, args, this.compositionSpec.facet.grid);
    return this
      ._withMaterializationConfig(["facets", id], { ...config, headers })
      .materializeComposition();
  }
);

export const editFacetScales = /* @__PURE__ */ action(
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
      if (!collectFacetScaleBindings(this.semanticSpec).some(
        binding => binding.policyKey === channel
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

export const editFacetGuides = /* @__PURE__ */ action(
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
    if (Object.hasOwn(args, "legend")) normalizeGuides({ legend: args.legend });
    const guides = normalizeGuides({ ...current.guides, ...args,
      ...(Object.hasOwn(args, "axes") ? { axes: normalizeFacetAxes(args.axes, current.guides.axes) } : {}) }, true);
    const family = resolveFacetFamily(this.semanticSpec).family;
    validateFacetAxisPolicy(guides.axes, family, current.repeat !== undefined);
    return rederiveFacet(this, {
      scales: current.scales,
      guides
    });
  }
);

function adoptUnitState(program, actionOwner, preferSource = false) {
  if (!(program instanceof actionOwner.constructor)) {
    throw new TypeError("editFacetSource program must be a ChartProgram.");
  }
  if (program.compositionSpec !== undefined) {
    throw new Error("editFacetSource program must be a complete unit ChartProgram.");
  }
  if (program.actionStack.length !== 0) {
    throw new Error("editFacetSource program has an unfinished action stack.");
  }
  const seedId = actionOwner.compositionSpec.children.find(id =>
    actionOwner.children[id]?.semanticSpec.layers.length > 0
  ) ?? actionOwner.compositionSpec.children[0];
  const retained = actionOwner.children[seedId]?.materializationConfigs ?? {};
  const {
    canvas: _retainedCanvas,
    theme: _retainedTheme,
    facets: _retainedFacets,
    ...retainedRecipe
  } = retained;
  void _retainedCanvas;
  void _retainedTheme;
  void _retainedFacets;
  return new actionOwner.constructor({
    semanticSpec: program.semanticSpec,
    graphicSpec: program.graphicSpec,
    resolvedScales: program.resolvedScales,
    materializationConfigs: freezeOwned({
      ...(preferSource ? { ...retainedRecipe, ...program.materializationConfigs }
        : { ...program.materializationConfigs, ...retainedRecipe }),
      ...(program.materializationConfigs.canvas === undefined
        ? {}
        : { canvas: program.materializationConfigs.canvas }),
      ...(program.materializationConfigs.theme === undefined
        ? {}
        : { theme: program.materializationConfigs.theme })
    }),
    children: {},
    context: program.context,
    trace: actionOwner.trace,
    actionStack: actionOwner.actionStack,
    actionSequence: actionOwner._actionSequence
  });
}

export const editFacetSource = /* @__PURE__ */ closedAction(
  {
    op: "editFacetSource",
    description: "Reapply one facet, grid, or repeat recipe to a revised complete unit program.",
    scope: "composition"
  }, SOURCE_EDIT_OPTIONS,
  function (args = {}) {
    requireFacetProgram(this, "editFacetSource");
    const current = this.compositionSpec;
    const facetConfig = this.materializationConfigs.facets?.[current.id];
    if (Object.hasOwn(args, "program") === Object.hasOwn(args, "action")) {
      throw new Error("editFacetSource requires exactly one of program or action.");
    }
    let source = args.program, owner = this;
    if (args.action !== undefined) {
      validateOptionObject(args.action, ["method", "options"], "editFacetSource action");
      const method = validateNonEmptyString(args.action.method, "editFacetSource action method");
      let unit = facetUnitTemplate(this, true);
      const metadata = typeof unit[method] === "function" ? getWrappedActionMetadata(unit[method]) : undefined;
      if (!metadata || !SOURCE_ACTION_NAMES.has(method) || metadata.scope === "composition" ||
          /^(?:_|materialize|rematerialize|replay|editSemantic$|editGraphics$|createGraphics$)/.test(method)) {
        throw new Error("editFacetSource action requires a unit chart-authoring action.");
      }
      // A retained child is partitioned and may hide outer guide parts. Restore
      // full-data mark items before source actions inspect their item grain.
      unit = applyMaterializationPlan(unit, buildMaterializationPlan({
        marks: unit.semanticSpec.layers.map(layer => getMarkMaterializationStep(unit, layer))
      }));
      for (const axis of cartesianAxisOwners(unit)) {
        const config = unit.guideConfigs.axis?.[axis.id] ?? {};
        const ids = axisGraphicIds(axis.channel, axis.id);
        for (const [index, component] of ["line", "ticks", "labels", "title"].entries()) {
          if (!config[component] || unit.graphicSpec.objects[ids[index]]) continue;
          const { mode, inferredValues, inferredText, inferredRotation, inferredOffset, ...options } = config[component];
          if (mode === "values") delete options.count;
          if (mode === "count") delete options.values;
          const suffix = component[0].toUpperCase() + component.slice(1);
          unit = unit[`create${axis.channel.toUpperCase()}Axis${suffix}`]({
            ...options, ...axisTargetArgs(axis.id, axis.channel)
          });
        }
      }
      const revised = unit[method](args.action.options ?? {});
      // Retain the wrapped source action inside this one parent transaction.
      owner = new this.constructor({ ...this, trace: revised.trace, actionStack: revised.actionStack,
        actionSequence: revised._actionSequence });
      source = new this.constructor({ ...revised, actionStack: [], actionSequence: revised._actionSequence });
    }
    let base = adoptUnitState(source, owner, args.action !== undefined);
    if (facetConfig !== undefined) {
      base = base._withMaterializationConfig(["facets", current.id], facetConfig);
    }
    const authored = isPlainObject(current.facet.guides.legend);
    const guides = authored ? { ...current.facet.guides, legend: false } : current.facet.guides;
    let revised;
    // Policies for channels absent from the previous source are defaults, not
    // authored requests. A newly introduced alias must inherit the policy of
    // the existing physical scale rather than conflict with a stale default.
    const scales = usedFacetScalePolicies(base,
      usedFacetScalePolicies(this, current.facet.scales));
    if (current.facet.grid !== undefined) {
      revised = base.facetGrid({
        id: current.id,
        data: current.facet.data,
        rows: current.facet.grid.rows,
        columns: current.facet.grid.columns,
        combinations: current.facet.grid.combinations,
        gap: current.gap,
        ...(current.spacing === undefined ? {} : { spacing: current.spacing }),
        ...(current.topLane === undefined ? {} : { topLane: current.topLane }),
        align: current.align,
        padding: current.padding,
        scales,
        guides
      });
    } else if (current.facet.repeat !== undefined) {
      revised = base.repeatCharts({
        id: current.id,
        ...current.facet.repeat,
        columns: current.columns,
        gap: current.gap,
        ...(current.spacing === undefined ? {} : { spacing: current.spacing }),
        ...(current.topLane === undefined ? {} : { topLane: current.topLane }),
        align: current.align,
        padding: current.padding,
        scales,
        guides
      });
    } else {
      revised = base.facet({
        id: current.id,
        data: current.facet.data,
        field: current.facet.field,
        values: current.facet.values,
        columns: current.columns,
        gap: current.gap,
        ...(current.spacing === undefined ? {} : { spacing: current.spacing }),
        ...(current.topLane === undefined ? {} : { topLane: current.topLane }),
        align: current.align,
        padding: current.padding,
        scales,
        guides
      });
    }
    if (authored) {
      const spec = revised.compositionSpec;
      revised = revised._withCompositionState({ children: revised.children,
        compositionSpec: { ...spec, facet: { ...spec.facet, guides: current.facet.guides } } });
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
    return replayCompositionThemeState(
      revised,
      this.materializationConfigs.theme
    );
  }
);

export function registerFacetActions(ProgramClass) {
  registerFacetDataRevision((program, args) => {
    const template = facetUnitTemplate(program);
    // A parent title belongs to the composition, not the retained child unit.
    const revisionSource = template.semanticSpec.title.text === undefined
      ? template : template.removeTitle();
    const { program: unit, plan } = reviseUnitData(revisionSource, args);
    const current = program.compositionSpec;
    // Adopt an already-materialized unit revision into the retained parent.
    const revised = new program.constructor({
      ...unit,
      semanticSpec: { ...unit.semanticSpec, title: program.semanticSpec.title },
      graphicSpec: program.graphicSpec,
      children: program.children,
      materializationConfigs: { ...unit.materializationConfigs,
        facets: program.materializationConfigs.facets,
        ...(program.titleConfig === undefined ? {} : { title: program.titleConfig }) },
      actionSequence: unit._actionSequence,
      compositionSpec: { ...current, facet: { ...current.facet,
        data: plan.replacements.get(current.facet.data) ?? current.facet.data } }
    });
    return rederiveFacet(revised, current.facet);
  });
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
