import { ChartProgram } from "./ChartProgram.js";
import { BasicChartProgram } from "./BasicChartProgram.js";
import { getWrappedActionMetadata } from "./core/action.js";
import { cloneAndFreeze, isPlainObject } from "./core/immutable.js";
import { encodeValue } from "./persistence/codec.js";
import {
  findDataset,
  hasDatasetOwner,
  resolveDatasetReference
} from "./selectors/datasets.js";
import { findLayer } from "./selectors/layers.js";
import { findSemanticScale } from "./selectors/scales.js";
import { findCoordinate } from "./selectors/coordinates.js";
import { inferDatasetSchema } from "./grammar/datasetSchema.js";
import { BUILTIN_ACTION_DESCRIPTOR_RECORDS } from "./inspectionDescriptors.js";

const KINDS = new Set(["data", "mark", "scale", "coordinate", "guide"]);
const ACTION_DESCRIPTORS = new Map(BUILTIN_ACTION_DESCRIPTOR_RECORDS.map(
  ([name, options, idOptions, prerequisites, entryPoints]) => [name, {
    options: options.map(([path, required, kind, choices, unit]) => ({
      path, required, kind,
      ...(choices === null ? {} : { choices }),
      ...(unit === null ? {} : { unit })
    })),
    idOptions,
    prerequisites,
    entryPoints
  }]
));

function requireProgram(program, label = "Program") {
  if (!(program instanceof ChartProgram || program instanceof BasicChartProgram)) {
    throw new TypeError(`${label} must be a ggaction program.`);
  }
  if (program.actionStack.length !== 0) throw new Error(`${label} must have a closed action stack.`);
  return program;
}

function atChildPath(program, childPath = []) {
  if (!Array.isArray(childPath)) throw new TypeError("childPath must be an array.");
  let current = program;
  for (const id of childPath) {
    if (typeof id !== "string" || !Object.hasOwn(current.children, id)) {
      throw new Error(`Unknown program child "${String(id)}".`);
    }
    current = current.children[id];
  }
  return current;
}

function validateTarget(target) {
  if (!isPlainObject(target) || !KINDS.has(target.kind) || typeof target.id !== "string" || target.id.length === 0) {
    throw new TypeError("Inspection target requires a supported kind and non-empty id.");
  }
  return target;
}

function findResource(program, target) {
  const current = atChildPath(program, target.childPath);
  if (target.kind === "data") {
    return hasDatasetOwner(current, target.id)
      ? resolveDatasetReference(current, target.id, "Inspection target")
      : findDataset(current, target.id);
  }
  if (target.kind === "mark") return findLayer(current, target.id);
  if (target.kind === "scale") return findSemanticScale(current, target.id);
  if (target.kind === "coordinate") return findCoordinate(current, target.id);
  return current.semanticSpec.guides[target.id];
}

function resourceRef(kind, id, childPath) {
  return { kind, id, ...(childPath?.length ? { childPath: [...childPath] } : {}) };
}

export function getDatasetSchema(program, { data, childPath } = {}) {
  requireProgram(program);
  const current = atChildPath(program, childPath);
  if (typeof data !== "string" || data.length === 0) throw new TypeError("getDatasetSchema requires data.");
  const dataset = resolveDatasetReference(current, data, "Dataset schema data");
  const schema = dataset.schema ?? inferDatasetSchema(dataset.values ?? []);
  return cloneAndFreeze({ data: dataset.id, schema });
}

export function describeAction(program, { action, target, options = {} } = {}) {
  requireProgram(program);
  if (typeof action !== "string" || action.length === 0) throw new TypeError("describeAction requires action.");
  if (!isPlainObject(options)) throw new TypeError("describeAction options must be a plain object.");
  let targetResource;
  if (target !== undefined) {
    validateTarget(target);
    targetResource = findResource(program, target);
    if (targetResource === undefined) {
      return cloneAndFreeze({
        version: 1, action, applicability: "incompatible", parameterDefinitions: [], requirements: [],
        checks: [{ name: "target", status: "failed", evidencePaths: [], findings: [] }],
        findings: [{ severity: "error", code: "missing-resource", reason: "target-unavailable", message: `Unknown ${target.kind} "${target.id}".`, resource: resourceRef(target.kind, target.id, target.childPath) }]
      });
    }
    if (options.target !== undefined && options.target !== target.id) {
      return cloneAndFreeze({
        version: 1, action, applicability: "incompatible", parameterDefinitions: [], requirements: [],
        checks: [{ name: "target", status: "failed", evidencePaths: ["target"], findings: [] }],
        findings: [{ severity: "error", code: "incompatible-resource", reason: "target-mismatch", message: `Inspection target "${target.id}" conflicts with options.target "${options.target}".`, resource: resourceRef(target.kind, target.id, target.childPath), optionPath: "target" }]
      });
    }
    if (action === "encodeShape" && (target.kind !== "mark" || targetResource.mark?.type !== "point")) {
      return cloneAndFreeze({
        version: 1, action, applicability: "unsupported", parameterDefinitions: [], requirements: [],
        checks: [{ name: "target", status: "not_applicable", evidencePaths: ["target"], findings: [] }],
        findings: [{ severity: "info", code: "unsupported-combination", reason: "mark-type", message: "encodeShape supports Point marks.", resource: resourceRef(target.kind, target.id, target.childPath) }]
      });
    }
  }
  const fn = program[action];
  const metadata = typeof fn === "function" ? getWrappedActionMetadata(fn) : undefined;
  if (metadata === undefined) {
    return cloneAndFreeze({
      version: 1, action, applicability: typeof fn === "function" ? "unverified" : "unsupported",
      parameterDefinitions: [], requirements: [], checks: [], findings: [{ severity: "info", code: "unsupported-format", reason: typeof fn === "function" ? "extension-unverified" : "action-unavailable", message: `Action "${action}" has no built-in inspection descriptor.` }]
    });
  }
  const descriptor = ACTION_DESCRIPTORS.get(action);
  const optionNames = metadata.options ?? descriptor?.options.map(option => option.path);
  if (optionNames === undefined) {
    return cloneAndFreeze({
      version: 1, action, applicability: "unverified", parameterDefinitions: [], requirements: [],
      checks: [{ name: "execution", status: "not_run", evidencePaths: [], findings: [] }],
      findings: [{ severity: "info", code: "unsupported-format", reason: "descriptor-unavailable", message: `Action "${action}" is registered but its static option descriptor is unavailable.` }]
    });
  }
  const unknown = Object.keys(options).find(key => !optionNames.includes(key));
  const required = descriptor?.options.filter(option => option.required).map(option => option.path) ?? [];
  const missing = required.filter(key => options[key] === undefined);
  let fieldFinding = [];
  if (targetResource !== undefined && target.kind === "mark") {
    const schema = getDatasetSchema(program, {
      data: targetResource.data,
      childPath: target.childPath
    }).schema;
    if (schema.completeness === "known") {
      const fields = new Set(schema.fields.map(field => field.name));
      fieldFinding = (descriptor?.options ?? [])
        .filter(definition => definition.kind === "field" &&
          typeof options[definition.path] === "string" &&
          !fields.has(options[definition.path]))
        .map(definition => ({
          severity: "error",
          code: "missing-resource",
          reason: "field-unavailable",
          message: `Dataset does not contain field "${options[definition.path]}".`,
          resource: resourceRef("data", targetResource.data, target.childPath),
          optionPath: definition.path
        }));
    }
  }
  const finding = unknown !== undefined
    ? [{ severity: "error", code: "invalid-option", reason: "unknown-option", message: `Unknown ${action} option "${unknown}".`, optionPath: unknown }]
    : [...missing.map(key => ({ severity: "info", code: "missing-input", reason: "required-option", message: `${action} requires option "${key}".`, optionPath: key })), ...fieldFinding];
  const applicability = unknown !== undefined || fieldFinding.length ? "incompatible" : missing.length ? "needs-input" : "supported";
  return cloneAndFreeze({
    version: 1,
    action,
    applicability,
    parameterDefinitions: descriptor?.options.map(definition => ({
      ...definition,
      active: true
    })) ?? optionNames.map(path => ({ path, kind: "object", required: false, active: true })),
    requirements: missing.map(optionPath => ({ reason: "required-option", optionPath })),
    checks: [
      { name: "option-shape", status: unknown === undefined ? "passed" : "failed", evidencePaths: Object.keys(options), findings: unknown === undefined ? [] : finding },
      { name: "execution", status: "not_run", evidencePaths: [], findings: [] }
    ],
    findings: finding
  });
}

function canonicalInput(value) {
  if (Array.isArray(value)) return value.map(canonicalInput);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(
    key => [key, canonicalInput(value[key])]
  ));
}

function canonical(value) {
  return JSON.stringify(encodeValue(canonicalInput(value)));
}

function resources(program, childPath = [], output = []) {
  for (const value of program.semanticSpec.datasets) output.push({ ref: resourceRef("data", value.id, childPath), value });
  for (const [orderIndex, value] of program.semanticSpec.layers.entries()) output.push({
    ref: resourceRef("mark", value.id, childPath),
    value: { semantic: value, graphic: program.graphicSpec.objects[value.id], config: program.markConfigs[value.id], orderIndex }
  });
  for (const value of program.semanticSpec.scales) output.push({ ref: resourceRef("scale", value.id, childPath), value: { semantic: value, resolved: program.resolvedScales[value.id] } });
  for (const value of program.semanticSpec.coordinates) output.push({ ref: resourceRef("coordinate", value.id, childPath), value });
  for (const [id, value] of Object.entries(program.semanticSpec.guides)) output.push({ ref: resourceRef("guide", id, childPath), value: { semantic: value, graphic: program.graphicSpec.objects[id], config: program.guideConfigs[id] } });
  if (Object.keys(program.semanticSpec.title).length) output.push({ ref: resourceRef("guide", "title", childPath), value: { semantic: program.semanticSpec.title, config: program.guideConfigs.title } });
  if (program.graphicSpec.objects.canvas !== undefined) output.push({
    ref: resourceRef("canvas", "canvas", childPath),
    value: program.graphicSpec.objects.canvas
  });
  if (Object.keys(program.compositionSpec ?? {}).length > 0) output.push({
    ref: resourceRef("composition", "layout", childPath),
    value: program.compositionSpec
  });
  for (const [id, child] of Object.entries(program.children)) resources(child, [...childPath, id], output);
  return output;
}

function refKey(ref) { return `${ref.childPath?.join("/") ?? ""}|${ref.kind}|${ref.id}`; }
function effect(kind) { return kind === "data" ? "data" : kind === "scale" ? "scale" : kind === "guide" ? "guide" : ["coordinate", "canvas", "composition"].includes(kind) ? "structure" : "style"; }
function changeEffect(a, b, kind) {
  if (kind !== "mark" || a === undefined || b === undefined) return effect(kind);
  if (a.value.orderIndex !== b.value.orderIndex) return "structure";
  if (canonical(a.value.semantic?.encoding) !== canonical(b.value.semantic?.encoding) ||
      a.value.semantic?.data !== b.value.semantic?.data) return "binding";
  if (canonical(a.value.semantic) !== canonical(b.value.semantic)) return "structure";
  return "style";
}

export function comparePrograms(before, after, { target } = {}) {
  requireProgram(before, "Before program");
  requireProgram(after, "After program");
  if (target !== undefined) validateTarget(target);
  const left = new Map(resources(before).map(item => [refKey(item.ref), item]));
  const right = new Map(resources(after).map(item => [refKey(item.ref), item]));
  const keys = [...new Set([...left.keys(), ...right.keys()])].sort();
  let changes = keys.flatMap(key => {
    const a = left.get(key); const b = right.get(key); const item = a ?? b;
    if (a !== undefined && b !== undefined && canonical(a.value) === canonical(b.value)) return [];
    const semanticRoles = item.ref.kind === "mark" && a !== undefined && b !== undefined
      ? [...new Set([...Object.keys(a.value.semantic?.encoding ?? {}), ...Object.keys(b.value.semantic?.encoding ?? {})])]
        .filter(role => canonical(a.value.semantic?.encoding?.[role]) !== canonical(b.value.semantic?.encoding?.[role]))
      : [];
    return [{ resource: item.ref, operation: a === undefined ? "add" : b === undefined ? "remove" : "modify", effect: changeEffect(a, b, item.ref.kind), roles: semanticRoles }];
  });
  if (target !== undefined) {
    const targetKeys = [before, after].flatMap(candidate => {
      const resolved = findResource(candidate, target);
      return resolved === undefined ? [] : [refKey(resourceRef(
        target.kind,
        target.kind === "data" ? resolved.id : target.id,
        target.childPath
      ))];
    });
    if (targetKeys.length === 0) throw new Error(`Unknown ${target.kind} "${target.id}" in both programs.`);
    const connected = new Set(targetKeys);
    for (const map of [left, right]) {
      let advanced = true;
      while (advanced) {
        advanced = false;
        for (const [candidateKey, candidate] of map) {
          if (connected.has(candidateKey)) continue;
          const path = canonical(candidate.ref.childPath ?? []);
          const consumes = [...connected].some(connectedKey => {
            const source = map.get(connectedKey);
            if (source === undefined || canonical(source.ref.childPath ?? []) !== path) return false;
            if (source.ref.kind === "data") {
              return candidate.ref.kind === "data"
                ? candidate.value.source === source.ref.id
                : candidate.ref.kind === "mark" && candidate.value.semantic?.data === source.ref.id;
            }
            if (source.ref.kind === "mark") {
              return (candidate.ref.kind === "mark" && candidate.value.semantic?.source === source.ref.id) ||
                (candidate.ref.kind === "guide" && (candidate.value.semantic?.target === source.ref.id || candidate.value.config?.target === source.ref.id));
            }
            if (source.ref.kind === "scale") {
              return (candidate.ref.kind === "mark" && Object.values(candidate.value.semantic?.encoding ?? {}).some(
                encoding => encoding?.scale === source.ref.id || encoding?.dimensions?.some(dimension => dimension.scale === source.ref.id)
              )) || (candidate.ref.kind === "guide" && (candidate.value.semantic?.scale === source.ref.id || candidate.value.config?.scale === source.ref.id));
            }
            return source.ref.kind === "coordinate" && candidate.ref.kind === "mark" &&
              candidate.value.semantic?.coordinate === source.ref.id;
          });
          if (consumes) { connected.add(candidateKey); advanced = true; }
        }
      }
    }
    changes = changes.filter(change => connected.has(refKey(change.resource)));
  }
  const extensionUnknown = ![ChartProgram, BasicChartProgram].includes(before.constructor) ||
    ![ChartProgram, BasicChartProgram].includes(after.constructor);
  const findings = extensionUnknown ? [{
    severity: "info", code: "unsupported-format", reason: "extension-unverified",
    message: "Extension-owned semantic equivalence could not be fully verified."
  }] : [];
  return cloneAndFreeze({
    version: 1,
    equivalence: changes.length ? "different" : extensionUnknown ? "unknown" : "equal",
    completeProgramComparison: target === undefined,
    changes,
    affected: changes.map(change => change.resource),
    findings
  });
}

function itemBounds(properties, type) {
  if (!isPlainObject(properties)) return null;
  if (type === "circle") {
    if (!Number.isFinite(properties.x) || !Number.isFinite(properties.y) ||
        !Number.isFinite(properties.radius) || properties.radius < 0) return null;
    return { x: properties.x - properties.radius, y: properties.y - properties.radius,
      width: properties.radius * 2, height: properties.radius * 2 };
  }
  if (type === "rect") {
    if (![properties.x, properties.y, properties.width, properties.height].every(Number.isFinite)) return null;
    return { x: Math.min(properties.x, properties.x + properties.width),
      y: Math.min(properties.y, properties.y + properties.height),
      width: Math.abs(properties.width), height: Math.abs(properties.height) };
  }
  if (type === "path" && Array.isArray(properties.commands)) {
    const points = properties.commands.flatMap(command =>
      Number.isFinite(command.x) && Number.isFinite(command.y) ? [[command.x, command.y]] : []
    );
    if (points.length === 0) return null;
    const xs = points.map(point => point[0]);
    const ys = points.map(point => point[1]);
    return { x: Math.min(...xs), y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }
  if ([properties.x1, properties.y1, properties.x2, properties.y2].every(Number.isFinite)) {
    return { x: Math.min(properties.x1, properties.x2), y: Math.min(properties.y1, properties.y2),
      width: Math.abs(properties.x2 - properties.x1), height: Math.abs(properties.y2 - properties.y1) };
  }
  return null;
}

function inspectMark(program, layer, childPath) {
  const graphic = program.graphicSpec.objects[layer.id];
  const dataset = findDataset(program, layer.data);
  const boundedTypes = new Set(["circle", "rect", "line", "path"]);
  const items = graphic?.items ?? (graphic?.properties ? [{ properties: graphic.properties }] : []);
  const concreteTypes = items.map(item => item.type ?? graphic?.type);
  const logicalSupported = graphic !== undefined && concreteTypes.every(type =>
    boundedTypes.has(type) || type === "text"
  );
  const geometrySupported = logicalSupported && concreteTypes.every(type => boundedTypes.has(type));
  const opacityZero = items.filter(item => item.properties.opacity === 0).length;
  const zeroSize = items.filter(item => { const b = itemBounds(item.properties, item.type ?? graphic?.type); return b !== null && b.width === 0 && b.height === 0; }).length;
  const bounds = items.map(item => itemBounds(item.properties, item.type ?? graphic?.type)).filter(Boolean);
  const canvas = program.graphicSpec.objects.canvas?.properties;
  const outside = Number.isFinite(canvas?.width) && Number.isFinite(canvas?.height)
    ? bounds.filter(bound => bound.x + bound.width < 0 || bound.y + bound.height < 0 ||
        bound.x > canvas.width || bound.y > canvas.height).length
    : null;
  const union = bounds.length === 0 ? null : {
    x: Math.min(...bounds.map(item => item.x)), y: Math.min(...bounds.map(item => item.y)),
    width: Math.max(...bounds.map(item => item.x + item.width)) - Math.min(...bounds.map(item => item.x)),
    height: Math.max(...bounds.map(item => item.y + item.height)) - Math.min(...bounds.map(item => item.y))
  };
  const grain = ["line", "area"].includes(layer.mark?.type) ? "series" : "item";
  return {
    owner: resourceRef("mark", layer.id, childPath), grain,
    rawRows: dataset?.values?.length ?? null,
    logicalDataItems: logicalSupported ? items.length : null,
    drawablePrimitives: logicalSupported ? items.length : null,
    visibleCandidates: geometrySupported ? Math.max(0, items.length - new Set([
      ...items.map((item, index) => item.properties.opacity === 0 ? index : -1),
      ...items.map((item, index) => { const b = itemBounds(item.properties, item.type ?? graphic?.type); return b !== null && b.width === 0 && b.height === 0 ? index : -1; }),
      ...(outside === null ? [] : items.map((item, index) => { const b = itemBounds(item.properties, item.type ?? graphic?.type); return b !== null && (b.x + b.width < 0 || b.y + b.height < 0 || b.x > canvas.width || b.y > canvas.height) ? index : -1; }))
    ].filter(index => index >= 0)).size) : null,
    flags: [
      { reason: "opacity-zero", count: opacityZero },
      { reason: "zero-size", count: zeroSize },
      { reason: "outside-clip", count: outside },
      { reason: "missing-skipped", count: layer.mark?.missing === "skip" && dataset?.values
        ? Math.max(0, dataset.values.length - items.length) : null }
    ],
    bounds: union,
    sourceRefs: dataset === undefined ? [] : [resourceRef("data", dataset.id, childPath)],
    checks: [
      { name: "concrete-structure", status: graphic === undefined ? "failed" : logicalSupported ? "passed" : "not_applicable", evidencePaths: [layer.id], findings: [] },
      { name: "pixel-visibility", status: "not_run", evidencePaths: [], findings: [] }
    ]
  };
}

function inspectGuide(program, id, childPath) {
  const markIds = new Set(program.semanticSpec.layers.map(layer => layer.id));
  const pattern = id === "axis" ? /axis/iu
    : id === "grid" ? /grid/iu
      : id === "legend" ? /legend/iu
        : id === "title" ? /title|subtitle/iu
          : new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "iu");
  const graphicIds = Object.keys(program.graphicSpec.objects).filter(candidate =>
    candidate !== "canvas" && !candidate.startsWith("plot-") &&
    !markIds.has(candidate) && pattern.test(candidate)
  );
  const items = graphicIds.flatMap(candidate => {
    const graphic = program.graphicSpec.objects[candidate];
    if (Array.isArray(graphic?.items)) return graphic.items;
    return graphic?.properties === undefined ? [] : [{ properties: graphic.properties }];
  });
  const semantic = id === "title"
    ? program.semanticSpec.title
    : program.semanticSpec.guides[id];
  const sourceRefs = [];
  function collectRefs(value) {
    if (!isPlainObject(value)) return;
    if (typeof value.scale === "string") sourceRefs.push(resourceRef("scale", value.scale, childPath));
    if (typeof value.coordinate === "string") sourceRefs.push(resourceRef("coordinate", value.coordinate, childPath));
    for (const child of Object.values(value)) collectRefs(child);
  }
  collectRefs(semantic);
  return {
    owner: resourceRef("guide", id, childPath),
    grain: "unknown",
    rawRows: null,
    logicalDataItems: items.length,
    drawablePrimitives: items.length,
    visibleCandidates: null,
    flags: [
      { reason: "opacity-zero", count: null },
      { reason: "zero-size", count: null },
      { reason: "outside-clip", count: null },
      { reason: "missing-skipped", count: null }
    ],
    bounds: null,
    sourceRefs: [...new Map(sourceRefs.map(ref => [refKey(ref), ref])).values()],
    checks: [
      { name: "concrete-structure", status: graphicIds.length > 0 ? "passed" : "not_applicable", evidencePaths: graphicIds, findings: [] },
      { name: "pixel-visibility", status: "not_run", evidencePaths: [], findings: [] }
    ]
  };
}

export function inspectProgram(program, { target } = {}) {
  requireProgram(program);
  if (target !== undefined) validateTarget(target);
  const views = [];
  function visit(current, path = []) {
    const visited = new Set();
    const active = new Set();
    function validateGraphic(id) {
      if (active.has(id)) throw new Error(`Graphic hierarchy contains a cycle at "${id}".`);
      if (visited.has(id)) throw new Error(`Graphic "${id}" is referenced more than once.`);
      const object = current.graphicSpec.objects[id];
      if (object === undefined) throw new Error(`Graphic hierarchy references missing object "${id}".`);
      visited.add(id); active.add(id);
      for (const child of object.children ?? []) validateGraphic(child);
      active.delete(id);
    }
    for (const id of current.graphicSpec.order) validateGraphic(id);
    for (const layer of current.semanticSpec.layers) views.push(inspectMark(current, layer, path));
    for (const id of Object.keys(current.semanticSpec.guides)) {
      views.push(inspectGuide(current, id, path));
    }
    if (Object.keys(current.semanticSpec.title).length > 0) {
      views.push(inspectGuide(current, "title", path));
    }
    for (const [id, child] of Object.entries(current.children)) visit(child, [...path, id]);
  }
  visit(program);
  let filtered = views;
  if (target !== undefined) {
    const current = atChildPath(program, target.childPath);
    const targetResource = findResource(program, target);
    if (targetResource === undefined) {
      throw new Error(`Unknown ${target.kind} "${target.id}".`);
    }
    filtered = views.filter(view => {
      if (canonical(view.owner.childPath ?? []) !== canonical(target.childPath ?? [])) return false;
      if (target.kind === "mark") return view.owner.id === target.id;
      const layer = findLayer(current, view.owner.id);
      if (target.kind === "data") return layer?.data === targetResource.id;
      if (target.kind === "coordinate") return layer?.coordinate === target.id;
      if (target.kind === "scale") return Object.values(layer?.encoding ?? {}).some(
        encoding => encoding?.scale === target.id || encoding?.dimensions?.some(dimension => dimension.scale === target.id)
      );
      if (target.kind === "guide") return view.owner.kind === "guide" && view.owner.id === target.id;
      return false;
    });
  }
  const calculations = [];
  function collectCalculations(current, path = []) {
    for (const family of Object.values(current.materializationConfigs.calculations ?? {})) {
      if (!isPlainObject(family)) continue;
      for (const report of Object.values(family)) {
        calculations.push(path.length === 0 ? report : { ...report, childPath: path });
      }
    }
    for (const [id, child] of Object.entries(current.children)) {
      collectCalculations(child, [...path, id]);
    }
  }
  collectCalculations(program);
  const unsupported = filtered.filter(view => view.logicalDataItems === null).map(view => view.owner);
  return cloneAndFreeze({
    version: 1, views: filtered,
    calculations,
    checks: [{ name: "pixel-visibility", status: "not_run", evidencePaths: [], findings: [] }],
    findings: [], coverage: { partial: filtered.some(view => view.checks.some(check => check.status !== "passed")), unsupported }
  });
}
