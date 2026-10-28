import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeRowKey, compareRowKeys } from "../../core/itemIdentity.js";
import { validateUserId } from "../../core/identifiers.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { groupingIdentity } from "../rowLineage.js";
import { deriveSortedRows, normalizeSortTransform } from "../sort.js";
import { normalizeTemporalValue } from "../scales/fields.js";
import { inferredGraphEdgeIdentity } from "./edgeIdentity.js";

export function normalizeGraphStructuralOptions(input, sequence) {
  ownRecord(input, "Graph structural options");
  rejectUnknownProperties(input, ["ruleId", "missing", ...(sequence ? ["lag", "maxGap", "temporalUnit"] : ["mode", "hubKey", "hubs"])], "graph structural");
  const options = Object.assign(Object.create(null), input);
  const ruleId = validateUserId(options.ruleId, "Graph ruleId"), missing = options.missing === undefined ? "error" : options.missing;
  if (!(sequence ? ["error", "omit-node"] : ["error", "omit-node", "include"]).includes(missing)) throw new Error("Unsupported graph missing policy.");
  if (sequence) {
    const lag = options.lag === undefined ? 1 : options.lag;
    if (!Number.isSafeInteger(lag) || lag < 1) throw new RangeError("Graph sequence lag must be a positive safe integer.");
    if (Object.hasOwn(options, "maxGap") && (!Number.isFinite(options.maxGap) || options.maxGap < 0)) throw new RangeError("Graph sequence maxGap must be finite and nonnegative.");
    return { ruleId, missing, lag, ...(Object.hasOwn(options, "maxGap") ? { maxGap: options.maxGap } : {}),
      ...(Object.hasOwn(options, "temporalUnit") ? { temporalUnit: options.temporalUnit } : {}) };
  }
  const mode = options.mode === undefined ? "clique" : options.mode;
  if (!["clique", "star"].includes(mode)) throw new Error("Unsupported graph group mode.");
  const hasKey = Object.hasOwn(options, "hubKey"), hasHubs = Object.hasOwn(options, "hubs");
  if ((hasKey || hasHubs) && mode !== "star" || hasKey && hasHubs) throw new Error("Graph hubs require star mode and one hub representation.");
  return { ruleId, missing, mode, ...(hasKey ? { hubKey: options.hubKey } : {}), ...(hasHubs ? { hubs: options.hubs } : {}) };
}

function prepare(keys, tuples, missing) {
  if (Array.isArray(keys)) validateGeneratedItemLimit(keys.length, "Graph structural nodes");
  ownArray(keys, "Graph structural keys"); ownArray(tuples, "Graph grouping tuples");
  if (keys.length !== tuples.length) throw new Error("Graph keys and grouping tuples must have equal length.");
  let work = keys.length * (64 + 8 * Math.ceil(Math.log2(Math.max(2, keys.length))));
  const charge = value => {
    if (typeof value === "string") work += value.length * 8;
    validateWorkLimit(work += 8, "Graph structural work");
  };
  const tokens = keys.map(key => {
    if (Array.isArray(key)) { if (key.length > 64) throw new RangeError("Graph key tuple is too wide."); ownArray(key, "Graph node key"); key.forEach(charge); }
    else charge(key);
    return encodeRowKey(key);
  });
  if (new Set(tokens).size !== tokens.length) throw new Error("Graph structural keys must be unique.");
  const groupKeys = [], groups = new Map(), sourceIndices = [], omitted = [];
  let width;
  tuples.forEach((tuple, index) => {
    if (Array.isArray(tuple) && tuple.length > 64) throw new RangeError("Graph grouping tuples cannot exceed 64 fields.");
    ownArray(tuple, "Graph grouping tuple");
    if (width !== undefined && tuple.length !== width) throw new Error("Graph grouping tuples must have consistent length.");
    width = tuple.length; tuple.forEach(charge);
    if (tuple.some(Array.isArray)) throw new TypeError("Graph group fields require scalar values.");
    const group = groupingIdentity(tuple); groupKeys.push(group);
    const absent = tuple.some(value => value === null || value === undefined);
    if (absent && missing === "error") throw new Error("Graph group contains missing values.");
    if (absent && missing === "omit-node") { omitted.push({ index, reason: "missing-group" }); return; }
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(index); sourceIndices.push(index);
  });
  return { tokens, groupKeys, groups, sourceIndices, omitted, width, work };
}

function edge(keys, sourceIndex, targetIndex, ruleId, directed) {
  if (!directed && compareRowKeys(keys[sourceIndex], keys[targetIndex]) > 0) [sourceIndex, targetIndex] = [targetIndex, sourceIndex];
  return { sourceIndex, targetIndex, ...inferredGraphEdgeIdentity({ ruleId, directed, sourceKey: keys[sourceIndex], targetKey: keys[targetIndex] }), weight: 1 };
}
function finish(keys, edges, preparation, options) {
  edges.sort((a, b) => compareRowKeys(keys[a.sourceIndex], keys[b.sourceIndex]) || compareRowKeys(keys[a.targetIndex], keys[b.targetIndex]));
  return cloneAndFreeze({ edges, sourceIndices: preparation.sourceIndices, omitted: preparation.omitted, options });
}

function chargeValues(preparation, values) {
  ownArray(values, "Graph structural values");
  for (const value of values) preparation.work += typeof value === "string" ? value.length * 8 : 8;
  validateWorkLimit(preparation.work, "Graph structural work");
}

function chargeKey(preparation, key) {
  if (Array.isArray(key) && key.length > 64) throw new RangeError("Graph hub key tuple is too wide.");
  chargeValues(preparation, Array.isArray(key) ? key : [key]);
}

export function resolveGraphGroupHubs(options, preparation) {
  const hubs = new Map(), indexes = new Map(preparation.tokens.map((key, index) => [key, index]));
  if (Object.hasOwn(options, "hubKey")) {
    chargeKey(preparation, options.hubKey);
    const index = indexes.get(encodeRowKey(options.hubKey));
    if (index === undefined || !preparation.sourceIndices.includes(index)) throw new Error("Graph hub must be an included node.");
    hubs.set(preparation.groupKeys[index], index);
  }
  if (Object.hasOwn(options, "hubs")) {
    const values = options.hubs;
    if (Array.isArray(values) && values.length > preparation.groups.size) throw new RangeError("Graph hubs cannot outnumber included groups.");
    ownArray(values, "Graph hubs");
    for (const entry of values) {
      ownRecord(entry, "Graph group hub"); rejectUnknownProperties(entry, ["group", "key"], "graph group hub");
      if (!["group", "key"].every(key => Object.hasOwn(entry, key))) throw new TypeError("Graph group hubs require own group and key.");
      if (!Array.isArray(entry.group) || entry.group.length !== preparation.width) throw new Error("Graph hub grouping tuple has invalid length.");
      ownArray(entry.group, "Graph hub group");
      chargeValues(preparation, entry.group);
      chargeKey(preparation, entry.key);
      const group = groupingIdentity(entry.group), index = indexes.get(encodeRowKey(entry.key));
      if (!preparation.groups.has(group) || hubs.has(group) || !preparation.groups.get(group).includes(index)) throw new Error("Graph hubs must uniquely select a member of each named group.");
      hubs.set(group, index);
    }
  }
  return hubs;
}

export function inferGraphGroups(keys, tuples, input) {
  const options = normalizeGraphStructuralOptions(input, false), preparation = prepare(keys, tuples, options.missing);
  const hubs = resolveGraphGroupHubs(options, preparation);
  let count = 0, identityWork = 0;
  for (const [group, members] of preparation.groups) {
    if (options.mode === "star" && members.length > 1 && !hubs.has(group)) throw new Error("Graph star requires an explicit hub for every non-singleton group.");
    count += options.mode === "clique" ? members.length * (members.length - 1) / 2 : Math.max(0, members.length - 1);
    for (const index of members) {
      const degree = options.mode === "clique" || hubs.get(group) === index ? members.length - 1 : Math.min(1, members.length - 1);
      identityWork += preparation.tokens[index].length * degree * 8;
    }
  }
  validateGeneratedItemLimit(count, "Graph group edges");
  validateWorkLimit(preparation.work + identityWork + count * (64 + options.ruleId.length * 8 + 16 * Math.ceil(Math.log2(Math.max(2, count)))), "Graph group work");
  const edges = [];
  for (const [group, members] of preparation.groups) {
    if (options.mode === "clique") {
      for (let a = 0; a < members.length; a++) for (let b = a + 1; b < members.length; b++) edges.push(edge(keys, members[a], members[b], options.ruleId, false));
    } else for (const index of members) if (hubs.has(group) && index !== hubs.get(group)) edges.push(edge(keys, hubs.get(group), index, options.ruleId, false));
  }
  return finish(keys, edges, preparation, options);
}

export function inferGraphSequence(keys, tuples, orderValues, input) {
  const options = normalizeGraphStructuralOptions(input, true), preparation = prepare(keys, tuples, options.missing);
  ownArray(orderValues, "Graph sequence order");
  if (orderValues.length !== keys.length) throw new Error("Graph sequence order and keys must have equal length.");
  chargeValues(preparation, orderValues);
  const sort = normalizeSortTransform({ sortBy: [{ field: "value", ...(Object.hasOwn(options, "temporalUnit") ? { temporalUnit: options.temporalUnit } : {}) }] });
  const present = [], included = new Set(preparation.sourceIndices);
  orderValues.forEach((value, index) => {
    if (value === null || value === undefined) {
      if (options.missing === "error") throw new Error("Graph sequence order contains missing values.");
      if (included.delete(index)) preparation.omitted.push({ index, reason: "missing-order" });
    } else present.push({ index, value });
  });
  const ordered = deriveSortedRows(present.sort((a, b) => compareRowKeys(keys[a.index], keys[b.index])), sort);
  const numeric = new Map();
  if (Object.hasOwn(options, "maxGap")) {
    for (const { index, value } of ordered) {
      const number = Object.hasOwn(options, "temporalUnit") ? normalizeTemporalValue(value, "value", index, options.temporalUnit) : value;
      if (!Number.isFinite(number)) throw new TypeError("Graph sequence maxGap requires numeric or explicit temporal order.");
      numeric.set(index, number);
    }
  }
  const groups = new Map();
  for (const { index } of ordered) if (included.has(index)) {
    const group = preparation.groupKeys[index];
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(index);
  }
  let count = 0, identityWork = 0;
  for (const members of groups.values()) {
    count += Math.max(0, members.length - options.lag);
    for (let offset = 0; offset + options.lag < members.length; offset++) identityWork +=
      (preparation.tokens[members[offset]].length + preparation.tokens[members[offset + options.lag]].length) * 8;
  }
  validateGeneratedItemLimit(count, "Graph sequence edges");
  validateWorkLimit(preparation.work + identityWork + count * (128 + options.ruleId.length * 8), "Graph sequence work");
  const edges = [];
  for (const members of groups.values()) for (let offset = 0; offset + options.lag < members.length; offset++) {
    const source = members[offset], target = members[offset + options.lag];
    if (numeric.size && numeric.get(target) - numeric.get(source) > options.maxGap) continue;
    edges.push(edge(keys, source, target, options.ruleId, true));
  }
  preparation.sourceIndices = preparation.sourceIndices.filter(index => included.has(index));
  preparation.omitted.sort((a, b) => a.index - b.index);
  return finish(keys, edges, preparation, options);
}
