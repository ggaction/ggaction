import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";

const readers = new WeakMap();
const NATIVE_THEME_ACTIONS = new Set(["editLayout", "editGraphData", "editFlowData", "editHierarchyData", "editInferredGraphData", "reviseData", "editDerivedData", "editParameter", "applyDataUpdate", "filterMarks", "removeMarkFilter", "fitCanvas", "navigateProjection", "editCanvas", "applyTheme", "removeTheme"]);
const exact = (value, keys) => value !== null && typeof value === "object" &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

// Full supplies its original prepared-invocation reader. Basic imports neither
// the graph host nor a route solver, and subclasses do not inherit this binding.
export function registerNativeRouteThemeReader(ProgramClass, reader) {
  if (typeof ProgramClass !== "function" || typeof reader !== "function" || readers.has(ProgramClass)) throw new TypeError("Native route theme reader requires one exact constructor binding.");
  readers.set(ProgramClass, reader);
}

export function nativeRouteCompletionMetadata(program, context) {
  return readers.get(program.constructor)?.(program, context) ?? context.metadata;
}

// Persisted trace is inspection data only. It can never register a job, open
// an invocation, or authorize a prepared resource write.
export function nativeRouteAuthoredNode(node) {
  if (node.op !== "applyGraphEdgeRoutesUpdate" || !exact(node.args, ["prepared", "requestToken"]) || typeof node.args.requestToken !== "string") return node;
  const handle = node.args.prepared;
  if (!exact(handle, ["kind", "request", "inputHashesCount"]) || handle.kind !== "edge-route-preparation" ||
      !Number.isSafeInteger(handle.inputHashesCount) || handle.inputHashesCount < 1 ||
      !exact(handle.request, ["kind", "action", "args"]) || handle.request.kind !== "update" ||
      !NATIVE_THEME_ACTIONS.has(handle.request.action)) return node;
  if (!Array.isArray(node.children)) return node;
  const child = node.children[0];
  if (!exact(child, ["id", "op", "description", "args", "children"]) || typeof child.id !== "string" ||
      typeof child.description !== "string" || !Array.isArray(child.children) || child.op !== handle.request.action || node.children.slice(1).some(sibling => sibling?.op === child.op) ||
      canonicalJSON(encodeValue(child.args)) !== canonicalJSON(encodeValue(handle.request.args))) return node;
  return child;
}
