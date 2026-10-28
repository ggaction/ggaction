import { encodeRowKey } from "../../core/itemIdentity.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, requireStringValue, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { stableFiniteSum } from "../numeric.js";
import { normalizeHierarchyNodes } from "./normalize.js";

const COMMON = ["format", "valueMode", "maxNodes"];
const FORMATS = {
  flat: [...COMMON, "key", "parent", "value", "forest"],
  nested: [...COMMON, "key", "children", "value", "forest"],
  groups: [...COMMON, "groupFields", "value", "missingCategory"]
};

function ownValue(row, field, required = true) {
  if (!Object.hasOwn(row, field)) {
    if (required) throw new Error(`Hierarchy source requires own field "${field}".`);
    return undefined;
  }
  return row[field];
}

// Adapters only lower authored structure to explicit nodes. Topology and value
// validation remain in normalizeHierarchyNodes; all work shares its final limit.
export function normalizeHierarchyInput(input, options) {
  ownRecord(options, "Hierarchy input options");
  const format = Object.hasOwn(options, "format") ? options.format : undefined;
  if (typeof format !== "string" || !Object.hasOwn(FORMATS, format)) throw new Error("Hierarchy input format must be flat, nested or groups.");
  rejectUnknownProperties(options, FORMATS[format], "hierarchy input");
  const read = name => Object.hasOwn(options, name) ? options[name] : undefined;
  const normalizedOptions = Object.fromEntries(["valueMode", "forest", "maxNodes"]
    .filter(name => Object.hasOwn(options, name)).map(name => [name, options[name]]));
  // Validate the shared options before inspecting or expanding input.
  normalizeHierarchyNodes([], normalizedOptions);
  const valueField = requireStringValue(read("value"), "Hierarchy value field");
  const maxNodes = read("maxNodes") ?? 10_000;
  let work = 0;
  const charge = amount => validateWorkLimit(work += amount, "Hierarchy input work");
  const array = (value, label) => {
    if (Array.isArray(value)) charge(value.length * 4);
    return ownArray(value, label);
  };
  const row = value => {
    ownRecord(value, "Hierarchy source row");
    charge(Object.keys(value).length + 4);
    return value;
  };
  if (format !== "groups" && Array.isArray(input)) {
    validateGeneratedItemLimit(input.length + (read("forest") && input.length > 0 ? 1 : 0), "Hierarchy input node count", maxNodes);
  }
  array(input, "Hierarchy input rows");
  const nodes = [];
  const push = node => {
    validateGeneratedItemLimit(nodes.length + 1, "Hierarchy input node count", maxNodes);
    charge(8);
    nodes.push(node);
  };
  if (format === "groups") {
    const fields = array(read("groupFields"), "Hierarchy groupFields");
    if (fields.length === 0) throw new Error("Hierarchy groupFields must not be empty.");
    fields.forEach(field => requireStringValue(field, "Hierarchy group field"));
    if (new Set(fields).size !== fields.length) throw new Error("Hierarchy groupFields must be unique.");
    const missingCategory = read("missingCategory") === undefined ? "error" : read("missingCategory");
    if (!["error", "include"].includes(missingCategory)) throw new Error("Unsupported hierarchy missingCategory policy.");
    if (read("valueMode") !== undefined && read("valueMode") !== "leaf-sum") {
      throw new Error("Grouped observations require leaf-sum hierarchy values.");
    }
    charge(input.length * fields.length * 8);
    const groups = new Map();
    input.forEach((source, index) => {
      row(source);
      const value = ownValue(source, valueField);
      if (!Number.isFinite(value) || value < 0) throw new TypeError("Hierarchy grouped weights must be nonnegative finite numbers.");
      const parts = [];
      let parentKey = null;
      fields.forEach((field, depth) => {
        const category = ownValue(source, field);
        if (category === null && missingCategory !== "include") throw new TypeError("Hierarchy null categories require missingCategory:include.");
        if (Array.isArray(category)) throw new TypeError("Hierarchy categories must be typed scalars.");
        if (typeof category === "string") charge(category.length);
        const token = category === null ? null : encodeRowKey(category, "Hierarchy category");
        if (token !== null) charge(token.length);
        parts.push(token);
        const key = JSON.stringify(["group-path", parts]);
        charge(key.length);
        let node = groups.get(key);
        if (!node) {
          node = { key, parentKey, sourceRows: [], values: depth === fields.length - 1 ? [] : null };
          groups.set(key, node);
          push(node);
        }
        node.sourceRows.push(index);
        if (node.values) node.values.push(value);
        parentKey = key;
      });
    });
    const explicit = nodes.map(({ key, parentKey, sourceRows, values }) => ({ key, parentKey, sourceRows,
      ...(values ? { value: stableFiniteSum(values, "Hierarchy grouped leaf total") } : {}) }));
    return normalizeHierarchyNodes(explicit, { ...normalizedOptions, forest: true }, work);
  }
  const keyField = requireStringValue(read("key"), "Hierarchy key field");
  const structuralField = requireStringValue(read(format === "flat" ? "parent" : "children"), "Hierarchy structural field");
  if (format === "flat") {
    input.forEach((source, index) => {
      row(source);
      push({ key: ownValue(source, keyField), parentKey: ownValue(source, structuralField),
        ...(Object.hasOwn(source, valueField) ? { value: source[valueField] } : {}), sourceRows: [index] });
    });
  } else {
    const seen = new WeakSet(), pending = input.map((source, index) => ({ source, index, parentKey: null })).reverse();
    while (pending.length > 0) {
      const { source, index, parentKey } = pending.pop();
      row(source);
      if (seen.has(source)) throw new Error("Nested hierarchy nodes cannot be cyclic or shared.");
      seen.add(source);
      const key = ownValue(source, keyField);
      push({ key, parentKey, ...(Object.hasOwn(source, valueField) ? { value: source[valueField] } : {}), sourceRows: [index] });
      const children = ownValue(source, structuralField, false);
      if (children !== undefined) {
        if (Array.isArray(children)) validateGeneratedItemLimit(nodes.length + pending.length + children.length, "Hierarchy input node count", maxNodes);
        array(children, "Hierarchy nested children");
        for (let child = children.length - 1; child >= 0; child--) pending.push({ source: children[child], index, parentKey: key });
      }
    }
  }
  return normalizeHierarchyNodes(nodes, normalizedOptions, work);
}
