import { ownRecord } from "../core/ownData.js";
import { functionArguments, functionDescriptor, functionOptions, functionTypes } from "./expressionFunctions.js";
import { array, checkType, EXPRESSION_LIMITS, limit, name, record, scalar, valueType } from "./expressionValues.js";

const scalarTypes = ["number", "string", "boolean"];
const binaryOperations = ["add", "subtract", "multiply", "divide", "eq", "neq", "lt", "lte", "gt", "gte", "and", "or"];
const reserved = new Set(["__proto__", "prototype", "constructor"]);

function booleanType(types) {
  if (types.some(type => !["boolean", "unknown", "mixed"].includes(type))) throw new TypeError("Expression condition requires boolean.");
}

function environmentValues(environment) {
  record(environment, [], ["fields", "parameters"], "Expression environment");
  const fields = environment.fields ?? {};
  const parameters = environment.parameters ?? {};
  ownRecord(fields, "Expression fields");
  ownRecord(parameters, "Expression parameters");
  const copy = { fields: Object.create(null), parameters: Object.create(null) };
  for (const [key, definition] of Object.entries(fields)) {
    name(key, "Field name");
    record(definition, ["type"], ["optional"], "Field definition");
    if (![...scalarTypes, "array", "object", "unknown", "mixed"].includes(definition.type)) throw new TypeError("Unknown field type.");
    if (definition.optional !== undefined && typeof definition.optional !== "boolean") throw new TypeError("Field optional must be boolean.");
    copy.fields[key] = Object.freeze({ ...definition });
  }
  for (const [key, definition] of Object.entries(parameters)) {
    name(key, "Parameter id");
    record(definition, ["type", "value"], [], "Parameter definition");
    if (![...scalarTypes, "unknown", "mixed"].includes(definition.type)) throw new TypeError("Unknown parameter type.");
    scalar(definition.value, "Parameter value");
    checkType(valueType(definition.value), [definition.type, ...(definition.type === "unknown" || definition.type === "mixed" ? scalarTypes : [])], "Parameter value");
    copy.parameters[key] = Object.freeze({ ...definition });
  }
  return Object.freeze({ fields: Object.freeze(copy.fields), parameters: Object.freeze(copy.parameters) });
}

export function normalizeExpressionV2(expression, environment = {}) {
  record(expression, ["version", "registry", "root"]);
  if (expression.version !== 2 || expression.registry !== "standard@1") throw new TypeError("Unsupported expression version or registry.");
  const resolved = environmentValues(environment);
  const state = { nodes: 0, ancestors: new WeakSet(), fields: new Set(), parameters: new Set() };
  function resource(kind, id) {
    name(id, `${kind} reference`);
    if (!Object.hasOwn(resolved[kind], id)) throw new TypeError(`Unknown expression ${kind} reference.`);
    state[kind].add(id);
    return resolved[kind][id].type;
  }
  function visit(node, depth) {
    limit(depth, EXPRESSION_LIMITS.depth, "depth");
    limit(++state.nodes, EXPRESSION_LIMITS.nodes, "nodes");
    ownRecord(node, "Expression node");
    if (state.ancestors.has(node)) throw new TypeError("Expression cannot contain cycles.");
    state.ancestors.add(node);
    let result, types;
    const child = value => visit(value, depth + 1);
    if (node.type === "literal") {
      record(node, ["type", "value"]);
      scalar(node.value, "Literal");
      if (node.value === undefined) throw new TypeError("Literal cannot be missing.");
      result = { ...node }; types = [valueType(node.value)];
    } else if (node.type === "field") {
      record(node, ["type", "name"]);
      types = [resource("fields", node.name)]; result = { ...node };
    } else if (node.type === "fieldPath") {
      record(node, ["type", "root", "path"]);
      checkType(resource("fields", node.root), ["object"], "fieldPath root");
      array(node.path, EXPRESSION_LIMITS.path, "path");
      if (node.path.length === 0) throw new TypeError("fieldPath requires at least one key.");
      for (const key of node.path) {
        name(key, "fieldPath key");
        if (reserved.has(key)) throw new TypeError("fieldPath key is reserved.");
      }
      result = { ...node, path: Object.freeze([...node.path]) }; types = ["unknown"];
    } else if (node.type === "parameter") {
      record(node, ["type", "id"]);
      types = [resource("parameters", node.id)]; result = { ...node };
    } else if (node.type === "unary") {
      record(node, ["type", "op", "operand"]);
      if (!["negate", "not"].includes(node.op)) throw new TypeError("Unknown unary operation.");
      const value = child(node.operand);
      if (node.op === "not") booleanType(value.types);
      else checkType(value.types, ["number"], node.op);
      result = { ...node, operand: value.node }; types = [node.op === "not" ? "boolean" : "number"];
    } else if (node.type === "binary") {
      record(node, ["type", "op", "left", "right"]);
      if (!binaryOperations.includes(node.op)) throw new TypeError("Unknown binary operation.");
      const left = child(node.left), right = child(node.right);
      const logical = ["and", "or"].includes(node.op);
      const arithmetic = ["add", "subtract", "multiply", "divide"].includes(node.op);
      if (logical) { booleanType(left.types); booleanType(right.types); }
      else {
        checkType(left.types, arithmetic ? ["number"] : scalarTypes, node.op);
        checkType(right.types, arithmetic ? ["number"] : scalarTypes, node.op);
        if (!arithmetic && !["eq", "neq"].includes(node.op)) {
          const concrete = [...left.types, ...right.types].filter(type => scalarTypes.includes(type));
          if (new Set(concrete).size > 1) throw new TypeError("Ordering requires matching scalar types.");
        }
      }
      result = { ...node, left: left.node, right: right.node }; types = [arithmetic ? "number" : "boolean"];
    } else if (node.type === "if") {
      record(node, ["type", "condition", "then", "else"]);
      const condition = child(node.condition), yes = child(node.then), no = child(node.else);
      booleanType(condition.types);
      result = { ...node, condition: condition.node, then: yes.node, else: no.node };
      types = [...new Set([...yes.types, ...no.types])];
    } else if (node.type === "call") {
      record(node, ["type", "name", "args"], ["options"]);
      const descriptor = functionDescriptor(node.name);
      functionArguments(descriptor, node.args);
      const options = functionOptions(descriptor, node.options);
      const args = node.args.map(child);
      functionTypes(descriptor, args.map(arg => arg.types), args.map(arg => arg.node));
      result = { type: "call", name: node.name, args: Object.freeze(args.map(arg => arg.node)), ...(options === undefined ? {} : { options }) };
      types = node.name === "coalesce" ? [...new Set(args.flatMap(arg => arg.types))] : [descriptor.output];
    } else throw new TypeError("Unknown expression node type.");
    state.ancestors.delete(node);
    return { node: Object.freeze(result), types };
  }
  const root = visit(expression.root, 1);
  checkType(root.types, scalarTypes, "Expression output");
  return Object.freeze({
    expression: Object.freeze({ version: 2, registry: "standard@1", root: root.node }),
    environment: resolved, nodes: state.nodes,
    fields: Object.freeze([...state.fields]), parameters: Object.freeze([...state.parameters])
  });
}
