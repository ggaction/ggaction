import { validateRowReference } from "../core/rowReference.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { annotateError } from "../core/diagnostics.js";
import { contentDigest } from "../core/contentDigest.js";
import { encodeRowKey } from "../core/itemIdentity.js";
import { validateWorkLimit } from "../core/validation.js";
import { deriveFilteredRows } from "./filter.js";
import { deriveSortedRows } from "./sort.js";
import { deriveBinRows } from "./bin.js";
import { deriveBin2DRows } from "./bin2d.js";
import { deriveBoxData } from "./boxPlot.js";
import { deriveCompleteRows } from "./complete.js";
import { windowRowContributions } from "./window.js";
import { normalizedRowContributions } from "./normalize.js";
import { imputedRowContributions } from "./impute.js";

export const LINEAGE_TRANSFORMS = Object.freeze([
  "bin", "bin2d", "computed", "complete", "boxOutlier", "boxSummary", "density", "ecdf", "filter",
  "flatten", "lookup", "fold", "gradientProfile", "horizon", "interval", "impute", "markFilter",
  "normalize", "regression", "regressionStatistics", "sort", "summary", "stack", "statisticalReference", "timeUnit", "window"
]);

function fail(message) {
  return annotateError(new Error(message), { code: "ambiguous-identity" });
}

export function groupingIdentity(values) {
  return JSON.stringify(values.map(value => value === null ? ["null"] : value === undefined ? ["undefined"] : ["key", encodeRowKey(value)]));
}

export function inputRowReference(dataset, index, role = "source") {
  if (!Number.isInteger(index) || index < 0 || index >= dataset.values.length || !dataset.rowKeys?.[index]) {
    throw fail("Lineage requires an existing input row identity.");
  }
  return { data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision, rowKey: dataset.rowKeys[index], role };
}

export function derivedIdentityBase(source, ownerId, previous) {
  const logicalId = previous?.logicalId ?? `derived:${contentDigest(JSON.stringify([source.logicalId, ownerId]))}`;
  const revision = previous === undefined ? 0 : previous.revision + 1;
  if (!Number.isSafeInteger(revision)) throw annotateError(new RangeError("Derived revision space exhausted."), { code: "resource-limit", optionPath: "revision" });
  return { logicalId, revision, allocationId: `derived:${contentDigest(JSON.stringify([logicalId, revision, source.allocationId]))}` };
}

function positions(rows) {
  const result = new Map();
  rows.forEach((row, index) => {
    if (!result.has(row)) result.set(row, []);
    result.get(row).push(index);
  });
  return result;
}

function retainedIndices(source, retained) {
  const byRow = positions(source), consumed = new Map();
  return retained.map(row => {
    const used = consumed.get(row) ?? 0, index = byRow.get(row)?.[used];
    if (index === undefined) throw fail("Retained rows require explicit source correspondence.");
    consumed.set(row, used + 1);
    return index;
  });
}

function groupFields(t) {
  return [...new Set([
    ...(Array.isArray(t.groupBy) ? t.groupBy : t.groupBy === undefined ? [] : [t.groupBy]),
    ...(t.category === undefined ? [] : [t.category]),
    ...(t.placement?.split?.field === undefined ? [] : [t.placement.split.field])
  ])];
}

function memberField(rows) {
  const fields = new Set(rows.flatMap(row => Object.keys(row)));
  let name = "__lineage_members";
  while (fields.has(name)) name += "_";
  return name;
}

function eligible(row, t) {
  const weight = typeof t.weight === "string" ? t.weight : t.weight?.field;
  if (weight !== undefined && !(Number.isFinite(row[weight]) && row[weight] > 0)) return false;
  if (["density", "ecdf", "interval", "boxSummary", "gradientProfile"].includes(t.type)) return Number.isFinite(row[t.field]);
  if (t.type === "regression") return Number.isFinite(row[t.x]) && Number.isFinite(row[t.y]);
  if (t.type === "horizon") return Number.isFinite(row[t.y.field]);
  return true;
}

function groupedMapping(source, values, t, context) {
  const fields = t.type === "statisticalReference" ? (context.reference?.groupBy ? [context.reference.groupBy] : []) : groupFields(t.type === "regressionStatistics" ? source.transform[0] : t);
  const groups = new Map();
  source.values.forEach((row, index) => {
    if (!eligible(row, t)) return;
    const key = groupingIdentity(fields.map(field => row[field]));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  });
  const seen = new Set();
  return values.map(row => {
    const group = fields.map(field => row[t.type === "gradientProfile" && field === t.category ? t.as.category
      : t.type === "statisticalReference" ? "group" : field]);
    const groupKey = groupingIdentity(group);
    let role = [t.type];
    if (t.type === "summary") role.push(t.aggregates.map(item => [item.op, item.field ?? null]));
    if (t.type === "density") role.push(row[t.as[0]]);
    if (t.type === "regression") role.push(row[t.x]);
    if (t.type === "horizon") role.push(row[t.as.sign], row[t.as.band], row[t.as.segment], row[t.as.x]);
    if (t.type === "ecdf") role.push(row[t.as.value], row[t.as.cumulative] === 0 ? "baseline" : "step");
    const key = JSON.stringify([groupKey, role]);
    if (seen.has(key)) throw fail("Transform output grain does not uniquely identify its rows.");
    seen.add(key);
    return { key, indices: groups.get(groupKey) ?? [] };
  });
}

function stackContributions(rows, transform) {
  const groups = new Map();
  rows.forEach((row, index) => {
    const key = groupingIdentity([row[transform.category]]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  });
  return rows.map(row => groups.get(groupingIdentity([row[transform.category]])));
}

function transformMapping(source, values, t, context) {
  const preserve = indices => indices.map(index => ({ key: source.rowKeys[index], indices: [index] }));
  if (["computed", "timeUnit", "lookup", "stack", "window", "normalize", "impute"].includes(t.type)) {
    if (values.length !== source.values.length) throw fail("Row-preserving transform changed its row count.");
    const contributions = t.type === "window" ? windowRowContributions(source.values, t)
      : t.type === "normalize" ? normalizedRowContributions(source.values, t)
        : t.type === "impute" ? imputedRowContributions(source.values, t)
          : t.type === "stack" ? stackContributions(source.values, t) : undefined;
    return preserve(values.map((_, index) => index)).map((item, index) => contributions ? { ...item, indices: contributions[index] } : item);
  }
  if (t.type === "filter" || t.type === "sort") {
    return preserve(retainedIndices(source.values, (t.type === "filter" ? deriveFilteredRows : deriveSortedRows)(source.values, t)));
  }
  if (t.type === "markFilter") return preserve(context.indices ?? retainedIndices(source.values, values));
  if (t.type === "fold") return source.values.flatMap((_, index) => t.fields.map(field => ({
    key: JSON.stringify([source.rowKeys[index], "fold", field]), indices: [index]
  })));
  if (t.type === "flatten") return source.values.flatMap((row, index) => {
    const length = Math.max(0, ...t.fields.map(field => row[field]?.length ?? 0));
    // The current flatten API has no element key declaration. Every replacement
    // snapshot gets a new element namespace, even when lengths/values agree.
    return Array.from({ length }, (_, element) => ({ key: JSON.stringify([
      source.rowKeys[index], "flatten", t.fields, source.allocationId, element
    ]), indices: [index] }));
  });
  if (t.type === "complete") {
    const field = memberField(source.values);
    const completed = deriveCompleteRows(source.values, { ...t, members: field });
    return completed.map(row => ({
      key: row[field].length ? source.rowKeys[row[field][0]] : JSON.stringify(["complete", groupingIdentity([...t.groupBy, t.key].map(key => row[key]))]),
      indices: row[field]
    }));
  }
  if (t.type === "bin") {
    const field = memberField(source.values);
    const result = deriveBinRows(source.values, { ...t, members: true, as: { ...t.as, members: field } });
    return result.values.map(row => ({ key: JSON.stringify(["bin", t.field, row[t.as.lower], row[t.as.upper]]),
      indices: retainedIndices(source.values, row[field]) }));
  }
  if (t.type === "bin2d") {
    const field = memberField(source.values);
    return deriveBin2DRows(source.values, { ...t, members: true, as: { ...t.as, members: field } }).values.map(row => ({
      key: JSON.stringify(["bin2d", t.x, t.y, ...["x0", "x1", "y0", "y1"].map(role => row[t.as[role]])]), indices: row[field]
    }));
  }
  if (t.type === "boxSummary" && t.method === "precomputed") return preserve(source.values.map((_, index) => index));
  if (t.type === "boxOutlier" && t.method === "precomputed") return [];
  if (t.type === "boxOutlier") {
    const summaries = deriveBoxData(source.values, { ...t, type: "boxSummary" }).summaries;
    const groups = new Map(summaries.map(row => [groupingIdentity([row[t.category]]), row]));
    return preserve(source.values.flatMap((row, index) => {
      const group = groups.get(groupingIdentity([row[t.category]]));
      return group && row[t.category] !== "" && Number.isFinite(row[t.field]) && (row[t.field] < group[t.as.lowerWhisker] || row[t.field] > group[t.as.upperWhisker]) ? [index] : [];
    }));
  }
  return groupedMapping(source, values, t, context);
}

export function deriveRowLineage(source, values, transform, context = {}) {
  if (!LINEAGE_TRANSFORMS.includes(transform.type)) throw annotateError(new Error("Transform requires an explicit lineage adapter."), { code: "unsupported-format" });
  const mapping = transformMapping(source, values, transform, context);
  if (mapping.length !== values.length) throw fail("Transform lineage does not match its output row count.");
  const rowKeys = mapping.map(item => item.key);
  if (new Set(rowKeys).size !== rowKeys.length) throw fail("Transform output contains duplicate row identities.");
  const entries = [], rowRefs = [], shared = new Map();
  let work = 0;
  const right = context.lookup;
  const rightIndex = right === undefined ? undefined : new Map(right.values.flatMap((row, index) =>
    row[transform.lookup.key] == null ? [] : [[encodeRowKey(row[transform.lookup.key]), index]]));
  for (const item of mapping) {
    work += item.indices.length;
    validateWorkLimit(work, "Row lineage work");
    const refs = transform.type === "statisticalReference" && context.referenceRows !== undefined
      ? context.referenceRows[rowRefs.length]
      : item.indices.map(index => inputRowReference(source, index, transform.type === "lookup" ? "left" : "source"));
    if (!Array.isArray(refs)) throw fail("Statistical reference lineage is unavailable.");
    if (rightIndex) {
      const value = source.values[item.indices[0]][transform.field];
      const index = value == null ? undefined : rightIndex.get(encodeRowKey(value));
      if (index !== undefined) refs.push(inputRowReference(right, index, "right"));
    }
    const identity = JSON.stringify(refs);
    if (!shared.has(identity)) { shared.set(identity, entries.length); entries.push(refs); }
    rowRefs.push(shared.get(identity));
  }
  return cloneAndFreeze({ rowKeys, lineage: { entries, rowRefs } });
}

export function validateDatasetLineage(datasets) {
  const byId = new Map(datasets.map(dataset => [dataset.id, dataset]));
  const indices = new Map(datasets.filter(dataset => Array.isArray(dataset.values)).map(dataset => [dataset.id, new Set(dataset.rowKeys)]));
  const dependencies = new Map();
  let work = 0;
  for (const dataset of datasets) {
    if (dataset.source === undefined) continue;
    if (typeof dataset.logicalId !== "string" || !dataset.logicalId || typeof dataset.allocationId !== "string" || !dataset.allocationId ||
        !Number.isSafeInteger(dataset.revision) || dataset.revision < 0) throw fail("Derived dataset identity is invalid.");
    if (dataset.values === undefined) continue;
    if (!Array.isArray(dataset.rowKeys) || dataset.rowKeys.length !== dataset.values.length ||
        dataset.rowKeys.some(key => typeof key !== "string" || !key) || new Set(dataset.rowKeys).size !== dataset.rowKeys.length) {
      throw fail("Derived row identities must be unique and match the row count.");
    }
    const lineage = dataset.lineage;
    if (!isPlainObject(lineage) || Object.keys(lineage).length !== 2 || !Array.isArray(lineage.entries) ||
        !Array.isArray(lineage.rowRefs) || lineage.rowRefs.length !== dataset.values.length) throw fail("Invalid row lineage table.");
    const used = new Set();
    for (const index of lineage.rowRefs) {
      if (!Number.isInteger(index) || index < 0 || index >= lineage.entries.length) throw fail("Row lineage table reference is out of range.");
      used.add(index);
    }
    if (used.size !== lineage.entries.length) throw fail("Row lineage table contains unused entries.");
    const edges = new Set();
    for (const entry of lineage.entries) {
      if (!Array.isArray(entry)) throw fail("Lineage entries must contain input row references.");
      const unique = new Set();
      work += entry.length; validateWorkLimit(work, "Row lineage validation work");
      for (const ref of entry) {
        validateRowReference(ref);
        const input = byId.get(ref.data);
        if (!input || input.logicalId !== ref.logicalDataId || input.revision !== ref.revision || !indices.get(ref.data)?.has(ref.rowKey)) {
          throw fail("Input row reference does not match the stored dataset revision.");
        }
        const key = JSON.stringify([ref.data, ref.rowKey, ref.role]);
        if (unique.has(key)) throw fail("Duplicate lineage contribution.");
        unique.add(key); edges.add(ref.data);
      }
    }
    dependencies.set(dataset.id, edges);
  }
  const visited = new Set(), active = new Set();
  for (const root of dependencies.keys()) {
    const stack = [{ id: root, done: false }];
    while (stack.length) {
      const { id, done } = stack.pop();
      if (visited.has(id)) continue;
      if (done) { active.delete(id); visited.add(id); continue; }
      if (active.has(id)) throw annotateError(new Error("Cyclic row lineage."), { code: "cyclic-dependency" });
      active.add(id); stack.push({ id, done: true });
      for (const parent of dependencies.get(id) ?? []) stack.push({ id: parent, done: false });
    }
  }
}
