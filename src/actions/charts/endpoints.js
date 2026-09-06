import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import { isNominalValue } from "../../grammar/scales/fields.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateOptionObject
} from "../../core/validation.js";
import { findDataset } from "../../selectors/datasets.js";
import { findSemanticScale } from "../../selectors/scales.js";
import {
  applyFacadeGuides,
  normalizeAppearance,
  normalizeFieldEncoding,
  normalizeGuides,
  omitUndefinedOptions,
  resolveFacadeData,
  resolveFacadeId,
  validateFacadeOptions
} from "./shared.js";

const COMMON_OPTIONS = Object.freeze([
  "id", "data", "coordinate", "category", "orientation", "summary", "guides", "labels"
]);
const DOT_OPTIONS = Object.freeze([...COMMON_OPTIONS, "value", "point"]);
const LOLLIPOP_OPTIONS = Object.freeze([...DOT_OPTIONS, "baseline", "stem"]);
const DUMBBELL_OPTIONS = Object.freeze([
  ...COMMON_OPTIONS, "start", "end", "startPoint", "endPoint", "connector"
]);
const CATEGORY_OPTIONS = Object.freeze(["field", "fieldType", "scale"]);
const VALUE_OPTIONS = Object.freeze(["field", "fieldType", "scale"]);
const POINT_OPTIONS = Object.freeze([
  "shape", "fill", "opacity", "stroke", "strokeWidth", "radius"
]);
const RULE_OPTIONS = Object.freeze(["stroke", "strokeWidth", "strokeDash", "opacity"]);
const LABEL_OPTIONS = Object.freeze([
  "endpoint", "field", "value", "content", "normalizeBy", "format", "layout",
  "fill", "opacity", "fontSize", "fontFamily", "fontWeight", "align", "baseline",
  "rotation", "dx", "dy"
]);
const SUMMARY_OPERATIONS = Object.freeze(["mean", "median", "sum", "min", "max"]);
const EDIT_OPTIONS = Object.freeze([
  "target", "data", "coordinate", "category", "value", "start", "end",
  "orientation", "summary", "baseline"
]);

function normalizeCategory(value, operation) {
  const category = normalizeFieldEncoding(value, `${operation} category`);
  validateOptionObject(category, CATEGORY_OPTIONS, `${operation} category`);
  validateNonEmptyString(category.field, `${operation} category field`);
  const fieldType = category.fieldType ?? "nominal";
  if (!['nominal', 'ordinal'].includes(fieldType)) {
    throw new TypeError(`${operation} category must be nominal or ordinal.`);
  }
  return { ...omitUndefinedOptions(category), fieldType };
}

function normalizeValue(value, operation, role) {
  const result = normalizeFieldEncoding(value, `${operation} ${role}`);
  validateOptionObject(result, VALUE_OPTIONS, `${operation} ${role}`);
  validateNonEmptyString(result.field, `${operation} ${role} field`);
  if (result.fieldType !== undefined && result.fieldType !== "quantitative") {
    throw new TypeError(`${operation} ${role} must be quantitative.`);
  }
  return { ...omitUndefinedOptions(result), fieldType: "quantitative" };
}

function normalizeOrientation(value, operation) {
  const orientation = value ?? "horizontal";
  if (!['horizontal', 'vertical'].includes(orientation)) {
    throw new Error(`${operation} orientation must be horizontal or vertical.`);
  }
  return orientation;
}

function normalizeSummary(value, operation) {
  if (value === undefined || value === false) return false;
  if (!SUMMARY_OPERATIONS.includes(value)) {
    throw new Error(`${operation} summary must be false or ${SUMMARY_OPERATIONS.join(", ")}.`);
  }
  return value;
}

function sameOptionValue(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => sameOptionValue(value, right[index]));
  }
  if (!isPlainObject(left) || !isPlainObject(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index]
      && sameOptionValue(left[key], right[key]));
}

function validateRows(program, data, category, measures, operation) {
  const dataset = findDataset(program, data);
  if (dataset?.values === undefined || dataset.values.length === 0) {
    throw new Error(`${operation} requires at least one source row.`);
  }
  dataset.values.forEach((row, index) => {
    if (!isNominalValue(row?.[category])) {
      throw new TypeError(`${operation} category field "${category}" has an invalid value at row ${index}.`);
    }
    for (const field of measures) {
      if (!Number.isFinite(row?.[field])) {
        throw new TypeError(`${operation} ${field} must be finite at row ${index}.`);
      }
    }
  });
}

function outputField(id, role) {
  return `__${id}_${role}`;
}

function prepareData(program, { id, data, category, measures, summary, operation }) {
  validateRows(program, data, category.field, measures.map(item => item.field), operation);
  if (summary === false) return { program, data, measures };
  const derived = `${id}SummaryData`;
  const outputs = measures.map((item, index) => ({
    ...item,
    field: outputField(id, item.role ?? `value${index + 1}`)
  }));
  return {
    program: program.createSummaryData({
      id: derived,
      source: data,
      groupBy: category.field,
      aggregates: measures.map((item, index) => ({
        op: summary,
        field: item.field,
        as: outputs[index].field
      }))
    }),
    data: derived,
    measures: outputs
  };
}

function positionBindings(id, category, value, orientation, coordinate) {
  const categoryScale = { ...(category.scale ?? {}), id: category.scale?.id ?? `${id}Category` };
  const valueScale = { ...(value.scale ?? {}), id: value.scale?.id ?? `${id}Value` };
  const categoryBinding = {
    field: category.field,
    fieldType: category.fieldType,
    scale: categoryScale,
    ...(coordinate === undefined ? {} : { coordinate })
  };
  const valueBinding = {
    field: value.field,
    fieldType: "quantitative",
    scale: valueScale,
    ...(coordinate === undefined ? {} : { coordinate })
  };
  return orientation === "horizontal"
    ? { x: valueBinding, y: categoryBinding }
    : { x: categoryBinding, y: valueBinding };
}

function createPoint(program, { id, data, bindings, appearance }) {
  const { radius, ...style } = appearance;
  let next = program
    .createPointMark({ id, data, ...style })
    .encodeX({ target: id, ...bindings.x })
    .encodeY({ target: id, ...bindings.y });
  return radius === undefined
    ? next
    : next.encodePointRadius({ target: id, value: radius });
}

function normalizePoint(value, operation, role = "point") {
  const point = normalizeAppearance(value, POINT_OPTIONS, `${operation} ${role}`);
  if (point.radius !== undefined) {
    validateNonNegativeFinite(point.radius, `${operation} ${role} radius`);
  }
  return point;
}

function normalizeRule(value, operation, role) {
  return normalizeAppearance(value, RULE_OPTIONS, `${operation} ${role}`);
}

function createConnector(program, { id, data, bindings, end, appearance }) {
  let next = program
    .createRuleMark({ id, data, ...appearance })
    .encodeX({ target: id, ...bindings.x })
    .encodeY({ target: id, ...bindings.y });
  const valueChannel = bindings.x.fieldType === "quantitative" ? "x" : "y";
  return next[valueChannel === "x" ? "encodeX2" : "encodeY2"]({
    target: id,
    ...end,
    fieldType: "quantitative"
  });
}

function normalizeLabels(value, operation, allowEndpoint) {
  if (value === undefined || value === false) return false;
  if (!isPlainObject(value)) {
    throw new TypeError(`${operation} labels must be false or a plain object.`);
  }
  validateOptionObject(value, LABEL_OPTIONS, `${operation} labels`);
  if (!allowEndpoint && Object.hasOwn(value, "endpoint")) {
    throw new Error(`${operation} labels.endpoint is only available for Dumbbell endpoints.`);
  }
  return { ...value };
}

function labelOptions(labels, defaultField) {
  const { endpoint: _endpoint, ...options } = labels;
  const hasContent = ["field", "value", "content"].some(key => Object.hasOwn(options, key));
  return { ...options, ...(hasContent ? {} : { field: defaultField }) };
}

function attachLabels(program, id, labels, defaultField) {
  if (labels === false) return program;
  return program.createMarkLabels({
    id: `${id}Label`,
    source: id,
    ...labelOptions(labels, defaultField)
  });
}

function finish(program, { id, source, data, kind, roles, summary, orientation, options }) {
  return program._withMarkConfig(id, {
    ...program.markConfigs[id],
    endpointPlot: { kind, source, data, roles, summary, orientation, options }
  });
}

export const createDotPlot = action(
  { op: "createDotPlot", description: "Create raw or explicitly summarized categorical dots." },
  function (args = {}) {
    const operation = "createDotPlot";
    validateFacadeOptions(args, DOT_OPTIONS, operation);
    const id = resolveFacadeId(this, args.id, { defaultId: "dotPlot", operation });
    const source = resolveFacadeData(this, args.data, operation);
    const category = normalizeCategory(args.category, operation);
    const value = normalizeValue(args.value, operation, "value");
    const orientation = normalizeOrientation(args.orientation, operation);
    const summary = normalizeSummary(args.summary, operation);
    const point = normalizePoint(args.point, operation);
    const guides = normalizeGuides(args.guides, operation);
    const labels = normalizeLabels(args.labels, operation, false);
    const prepared = prepareData(this, {
      id, data: source, category, measures: [{ ...value, role: "value" }], summary, operation
    });
    const finalValue = prepared.measures[0];
    const bindings = positionBindings(id, category, finalValue, orientation, args.coordinate);
    let next = createPoint(prepared.program, { id, data: prepared.data, bindings, appearance: point });
    next = attachLabels(next, id, labels, finalValue.field);
    next = applyFacadeGuides(next, guides, id, guides);
    return finish(next, {
      id, source, data: prepared.data, kind: "dot", roles: { category, value }, summary, orientation,
      options: { id, data: source, coordinate: args.coordinate, category, value, orientation,
        summary, point, guides, labels }
    });
  }
);

export const createLollipopPlot = action(
  { op: "createLollipopPlot", description: "Create categorical value points with baseline stems." },
  function (args = {}) {
    const operation = "createLollipopPlot";
    validateFacadeOptions(args, LOLLIPOP_OPTIONS, operation);
    const id = resolveFacadeId(this, args.id, { defaultId: "lollipopPlot", operation });
    const source = resolveFacadeData(this, args.data, operation);
    const category = normalizeCategory(args.category, operation);
    const value = normalizeValue(args.value, operation, "value");
    const orientation = normalizeOrientation(args.orientation, operation);
    const summary = normalizeSummary(args.summary, operation);
    const baseline = args.baseline ?? 0;
    if (!Number.isFinite(baseline)) throw new TypeError(`${operation} baseline must be finite.`);
    const point = normalizePoint(args.point, operation);
    const stem = normalizeRule(args.stem, operation, "stem");
    const guides = normalizeGuides(args.guides, operation);
    const labels = normalizeLabels(args.labels, operation, false);
    const prepared = prepareData(this, {
      id, data: source, category, measures: [{ ...value, role: "value" }], summary, operation
    });
    const finalValue = prepared.measures[0];
    const bindings = positionBindings(id, category, finalValue, orientation, args.coordinate);
    const stemId = `${id}Stem`;
    let next = prepared.program;
    next = createConnector(next, {
      id: stemId,
      data: prepared.data,
      bindings,
      end: { datum: baseline },
      appearance: stem
    });
    next = createPoint(next, { id, data: prepared.data, bindings, appearance: point });
    next = attachLabels(next, id, labels, finalValue.field);
    next = applyFacadeGuides(next, guides, id, guides);
    return finish(next, {
      id, source, data: prepared.data, kind: "lollipop",
      roles: { category, value, baseline, stemId }, summary, orientation,
      options: { id, data: source, coordinate: args.coordinate, category, value, orientation,
        summary, baseline, point, stem, guides, labels }
    });
  }
);

export const createDumbbellPlot = action(
  { op: "createDumbbellPlot", description: "Create two categorical endpoints joined by a connector." },
  function (args = {}) {
    const operation = "createDumbbellPlot";
    validateFacadeOptions(args, DUMBBELL_OPTIONS, operation);
    const id = resolveFacadeId(this, args.id, { defaultId: "dumbbellPlot", operation });
    const source = resolveFacadeData(this, args.data, operation);
    const category = normalizeCategory(args.category, operation);
    const start = normalizeValue(args.start, operation, "start");
    const end = normalizeValue(args.end, operation, "end");
    if (start.field === end.field) throw new Error(`${operation} start and end fields must be distinct.`);
    if (start.scale !== undefined && end.scale !== undefined
      && !sameOptionValue(start.scale, end.scale)) {
      throw new Error(`${operation} start and end must use the same quantitative scale.`);
    }
    const orientation = normalizeOrientation(args.orientation, operation);
    const summary = normalizeSummary(args.summary, operation);
    const startPoint = normalizePoint(args.startPoint, operation, "startPoint");
    const endPoint = normalizePoint(args.endPoint, operation, "endPoint");
    const connector = normalizeRule(args.connector, operation, "connector");
    const guides = normalizeGuides(args.guides, operation);
    const labels = normalizeLabels(args.labels, operation, true);
    const sharedScale = start.scale ?? end.scale;
    const prepared = prepareData(this, {
      id, data: source, category,
      measures: [
        { ...start, scale: sharedScale, role: "start" },
        { ...end, scale: sharedScale, role: "end" }
      ],
      summary, operation
    });
    const [finalStart, finalEnd] = prepared.measures;
    const startBindings = positionBindings(id, category, finalStart, orientation, args.coordinate);
    const endBindings = positionBindings(id, category, finalEnd, orientation, args.coordinate);
    const connectorId = `${id}Connector`;
    const startId = `${id}Start`;
    let next = createConnector(prepared.program, {
      id: connectorId,
      data: prepared.data,
      bindings: startBindings,
      end: { field: finalEnd.field },
      appearance: connector
    });
    next = createPoint(next, {
      id: startId, data: prepared.data, bindings: startBindings, appearance: startPoint
    });
    next = createPoint(next, {
      id, data: prepared.data, bindings: endBindings, appearance: endPoint
    });
    if (labels !== false) {
      const endpoint = labels.endpoint ?? "end";
      if (!['start', 'end', 'both'].includes(endpoint)) {
        throw new Error(`${operation} labels.endpoint must be start, end, or both.`);
      }
      for (const [role, target] of [["start", startId], ["end", id]]) {
        if (endpoint !== "both" && endpoint !== role) continue;
        next = next.createMarkLabels({
          id: endpoint === "both" ? `${target}Label` : `${id}Label`,
          source: target,
          ...labelOptions(labels, role === "start" ? finalStart.field : finalEnd.field)
        });
      }
    }
    next = applyFacadeGuides(next, guides, id, guides);
    return finish(next, {
      id, source, data: prepared.data, kind: "dumbbell",
      roles: { category, start, end, startId, connectorId }, summary, orientation,
      options: { id, data: source, coordinate: args.coordinate, category, start, end, orientation,
        summary, startPoint, endPoint, connector, guides, labels }
    });
  }
);

function resolveEndpointOwner(program, requested) {
  const eligible = program.semanticSpec.layers.filter(
    layer => program.markConfigs[layer.id]?.endpointPlot !== undefined
  );
  if (requested !== undefined) {
    const id = validateUserId(requested, "Endpoint-plot owner id");
    const owner = eligible.find(layer => layer.id === id);
    if (owner === undefined) throw new Error(`Unknown endpoint-plot owner "${id}".`);
    return owner;
  }
  const current = eligible.find(layer => layer.id === program.context.currentMark);
  if (current !== undefined) return current;
  if (eligible.length === 1) return eligible[0];
  if (eligible.length === 0) throw new Error("editEndpointPlot requires an endpoint plot.");
  throw new Error("editEndpointPlot target is ambiguous; provide target.");
}

const KIND_METHOD = Object.freeze({
  dot: "createDotPlot",
  lollipop: "createLollipopPlot",
  dumbbell: "createDumbbellPlot"
});
const KIND_ROLES = Object.freeze({
  dot: new Set(["data", "coordinate", "category", "value", "orientation", "summary"]),
  lollipop: new Set([
    "data", "coordinate", "category", "value", "orientation", "summary", "baseline"
  ]),
  dumbbell: new Set([
    "data", "coordinate", "category", "start", "end", "orientation", "summary"
  ])
});

function reviseRequestedScales(program, ownerId, revised, changes) {
  let next = program;
  for (const role of ["category", "value", "start", "end"]) {
    if (!changes.includes(role) || !isPlainObject(revised[role]?.scale)) continue;
    const requested = revised[role].scale;
    const fallback = role === "category" ? `${ownerId}Category` : `${ownerId}Value`;
    const id = requested.id ?? fallback;
    if (findSemanticScale(next, id) === undefined) continue;
    const { id: _id, ...definition } = requested;
    void _id;
    if (Object.keys(definition).length > 0) {
      next = next.editScale({ id, ...definition });
    }
  }
  return next;
}

export const editEndpointPlot = action(
  { op: "editEndpointPlot", description: "Atomically revise an endpoint plot's semantic roles." },
  function (args = {}) {
    validateFacadeOptions(args, EDIT_OPTIONS, "editEndpointPlot");
    const changes = Object.keys(args).filter(key => key !== "target");
    if (changes.length === 0) {
      throw new Error("editEndpointPlot requires at least one endpoint-plot option.");
    }
    const owner = resolveEndpointOwner(this, args.target);
    const current = this.markConfigs[owner.id].endpointPlot;
    const allowed = KIND_ROLES[current.kind];
    const invalid = changes.find(key => !allowed.has(key));
    if (invalid !== undefined) {
      throw new Error(`editEndpointPlot ${invalid} is not available for ${current.kind} plots.`);
    }
    const revised = { ...current.options };
    for (const key of changes) revised[key] = args[key];
    let next = this.removeMark({ target: owner.id });
    next = reviseRequestedScales(next, owner.id, revised, changes);
    return next[KIND_METHOD[current.kind]](revised);
  }
);
