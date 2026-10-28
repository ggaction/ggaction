import { validateKeys } from "./validation.js";
import { annotateError } from "./diagnostics.js";
import { freezeOwned, isOwned, isPlainObject } from "./immutable.js";

import { ownDataProperties } from "./ownData.js";

const metadataByWrappedAction = new WeakMap();
const implementationByWrappedAction = new WeakMap();
const sourceByEnteredAction = new WeakMap();
const summariesByArguments = new WeakMap();
let actionCompletionHook;
const targetDispatchers = new WeakMap();
const UNSCOPED_PRIMITIVES = new Set(["createGraphics", "editGraphics", "editSemantic", "createData", "applyDataUpdate", "createImageResource", "replaceImageResource", "createGraphData", "createFlowData"]);

// Prepared updates must compare their base with the caller's receiver, before
// _enterAction creates the immutable trace branch. This evidence is valid only
// during this invocation; it is never copied to program state or trace.
export function actionSource(program) {
  const source = sourceByEnteredAction.get(program);
  if (source === undefined) throw new TypeError("Action source requires an active wrapped invocation.");
  return source;
}

// Internal source writers retain payloads in semantic state, while their
// primitive trace records only a bounded description of that exact argument.
// This authority is transient and never becomes an action option.
export function withActionArgumentSummary(args, summary, operation) {
  ownDataProperties(args, "Action arguments");
  const previous = summariesByArguments.get(args);
  summariesByArguments.set(args, summarizeArgs(summary));
  try { return operation(args); }
  finally {
    if (previous === undefined) summariesByArguments.delete(args);
    else summariesByArguments.set(args, previous);
  }
}
export function registerActionTargetDispatcher(ProgramClass, dispatcher) {
  targetDispatchers.set(ProgramClass, dispatcher);
}
function targetDispatcher(ProgramClass) {
  for (let owner = ProgramClass; owner; owner = Object.getPrototypeOf(owner)) {
    if (targetDispatchers.has(owner)) return targetDispatchers.get(owner);
  }
}


export function supportsScopedActionTargets(ProgramClass, operation) {
  return !UNSCOPED_PRIMITIVES.has(operation) && targetDispatcher(ProgramClass) !== undefined;
}

export function setActionCompletionHook(hook) {
  if (hook !== undefined && typeof hook !== "function") {
    throw new TypeError("Action completion hook must be a function.");
  }
  actionCompletionHook = hook;
}

export function getWrappedActionMetadata(value) {
  return metadataByWrappedAction.get(value);
}

export function invokeWrappedActionImplementation(value, program, args = {}) {
  const implementation = implementationByWrappedAction.get(value);
  if (implementation === undefined) {
    throw new TypeError("Expected an action created by action().");
  }
  return implementation.call(program, args);
}

function referenceType(value) {
  for (let owner = value; owner !== null; owner = Object.getPrototypeOf(owner)) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, "constructor");
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, "value")) return "object";
      return Object.getOwnPropertyDescriptor(descriptor.value ?? {}, "name")?.value ?? "object";
    }
  }
  return "object";
}

function summarizeObject(value) {
  const summary = {};
  const ancestors = new WeakSet();
  const completed = new WeakMap();
  const stack = [{ value, summary, entries: undefined, index: 0 }];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.entries === undefined) {
      if (ancestors.has(frame.value)) throw new TypeError("Action arguments must not contain circular references.");
      ancestors.add(frame.value);
      frame.entries = Object.entries(Object.getOwnPropertyDescriptors(frame.value)).filter(([, descriptor]) => descriptor.enumerable);
    }
    if (frame.index === frame.entries.length) {
      freezeOwned(frame.summary);
      completed.set(frame.value, frame.summary);
      ancestors.delete(frame.value);
      stack.pop();
      continue;
    }
    const [key, descriptor] = frame.entries[frame.index++];
    const item = descriptor.value;
    let target = key, result;
    if (!Object.hasOwn(descriptor, "value")) { target = `${key}Type`; result = "accessor"; }
    else if (Array.isArray(item)) { target = `${key}Count`; result = item.length; }
    else if (isPlainObject(item)) {
      result = completed.get(item);
      if (result === undefined) {
        result = {};
        stack.push({ value: item, summary: result, entries: undefined, index: 0 });
      }
    } else if (typeof item === "function") { target = `${key}Type`; result = "function"; }
    else if (item !== null && typeof item === "object") { target = `${key}Type`; result = referenceType(item); }
    else result = item;
    Object.defineProperty(frame.summary, target, { value: result, enumerable: true, configurable: true, writable: true });
  }
  return summary;
}

export function summarizeArgs(args) {
  if (!isPlainObject(args)) {
    throw new TypeError("Action arguments must be a plain object.");
  }

  return summarizeObject(args);
}

export function countActionNodes(node) {
  return node.children.reduce(
    (count, child) => count + 1 + countActionNodes(child),
    0
  );
}

export function createActionNode({ id, op, description, args }) {
  return freezeOwned({
    id,
    op,
    description,
    args,
    children: freezeOwned([])
  });
}

// Persistent child tails make appending the active (last) branch independent
// of sibling count. The public children property remains a stable frozen Array.
const childLists = new WeakMap();

function childList(node) {
  let list = childLists.get(node);
  if (list !== undefined) return list;
  let tail;
  for (const child of node.children) tail = { value: child, previous: tail };
  list = { tail, length: node.children.length };
  if (isOwned(node)) childLists.set(node, list);
  return list;
}

function readChildren() {
  const list = childLists.get(this);
  if (list.children === undefined) {
    const values = new Array(list.length);
    let item = list.tail;
    for (let index = list.length - 1; index >= 0; index -= 1) {
      values[index] = item.value;
      item = item.previous;
    }
    list.children = freezeOwned(values);
  }
  return list.children;
}

function withChildList(node, list) {
  // Keep one accessor identity across revisions. A new getter closure and
  // nonconfigurable descriptors per append force dictionary-shaped objects;
  // freezing those dominates long nested materialization traces in V8.
  // Copy data properties without evaluating the lazy children array.
  const next = Object.fromEntries(Object.keys(node)
    .filter(key => key !== "children").map(key => [key, node[key]]));
  Object.defineProperty(next, "children", { enumerable: true, get: readChildren });
  childLists.set(next, list);
  return freezeOwned(next);
}

function childAt(node, index) {
  const list = childList(node);
  return index === list.length - 1 ? list.tail.value : node.children[index];
}

function nodeAtPath(root, path) {
  let node = root;
  for (const index of path) {
    if (!Number.isInteger(index) || index < 0 || index >= childList(node).length) {
      throw new Error(`Unknown parent action path "${path.join(".")}".`);
    }
    node = childAt(node, index);
  }
  return node;
}

export function appendActionNodeAtPath(root, parentPath, actionNode) {
  if (!Array.isArray(parentPath)) {
    throw new TypeError("Parent action path must be an array.");
  }
  const parent = nodeAtPath(root, parentPath);
  const path = [...parentPath, childList(parent).length];

  function append(node, depth) {
    const list = childList(node);
    if (depth === parentPath.length) {
      return withChildList(node, {
        tail: { value: actionNode, previous: list.tail }, length: list.length + 1
      });
    }
    const index = parentPath[depth];
    const child = append(childAt(node, index), depth + 1);
    if (index === list.length - 1) {
      return withChildList(node, {
        tail: { value: child, previous: list.tail.previous }, length: list.length
      });
    }
    // Restored/extension traces may address an older sibling explicitly.
    let tail;
    for (let position = 0; position < list.length; position += 1) {
      tail = { value: position === index ? child : node.children[position], previous: tail };
    }
    return withChildList(node, { tail, length: list.length });
  }

  return { root: append(root, 0), path };
}

export function action(metadata, implementation) {
  if (!isPlainObject(metadata)) {
    throw new TypeError("Action metadata must be a plain object.");
  }

  if (typeof metadata.op !== "string" || metadata.op.length === 0) {
    throw new TypeError("Action metadata requires a non-empty op.");
  }

  if (
    typeof metadata.description !== "string" ||
    metadata.description.length === 0
  ) {
    throw new TypeError("Action metadata requires a non-empty description.");
  }

  if (typeof implementation !== "function") {
    throw new TypeError("Action implementation must be a function.");
  }

  const scope = metadata.scope ?? "unit";
  if (!["unit", "composition", "any"].includes(scope)) {
    throw new Error(`Unknown action scope "${scope}".`);
  }

  const ownedMetadata = freezeOwned({
    op: metadata.op,
    description: metadata.description,
    scope,
    ...(Array.isArray(metadata.options) ? { options: [...metadata.options] } : {})
  });

  const wrappedAction = function wrappedAction(args = {}) {
    try {
      if (!isPlainObject(args)) {
        throw new TypeError("Action arguments must be a plain object.");
      }
  
      ownDataProperties(args, "Action arguments");
      const scoped = isPlainObject(args.target) || Array.isArray(args.target);
      const dispatch = scoped && !UNSCOPED_PRIMITIVES.has(ownedMetadata.op) ? targetDispatcher(this.constructor) : undefined;
      if (!dispatch && scope === "unit") this._assertUnitProgram(ownedMetadata.op);
      if (!dispatch && scope === "composition") this._assertCompositionProgram(ownedMetadata.op);
  
      const summarizedArgs = summariesByArguments.get(args) ?? summarizeArgs(args);
      const entered = this._enterAction({
        ...ownedMetadata,
        args: summarizedArgs
      });
      sourceByEnteredAction.set(entered, this);
      try {
        let result = dispatch ? dispatch(entered, wrappedAction, args) : implementation.call(entered, args);
  
        if (!(result instanceof this.constructor)) {
          throw new TypeError(`${ownedMetadata.op} must return a ChartProgram.`);
        }

        if (this.actionStack.length === 0 && actionCompletionHook !== undefined) {
          result = actionCompletionHook(result, {
            source: this,
            metadata: ownedMetadata,
            args: summarizedArgs
          });
          if (!(result instanceof this.constructor)) {
            throw new TypeError("Action completion hook must return a ChartProgram.");
          }
        }

        return result._exitAction();
      } finally {
        sourceByEnteredAction.delete(entered);
      }
    } catch (error) {
      throw annotateError(error, { code: "action-failed", operation: ownedMetadata.op });
    }
  };

  metadataByWrappedAction.set(wrappedAction, ownedMetadata);
  implementationByWrappedAction.set(wrappedAction, implementation);
  return wrappedAction;
}

// Private built-in convenience: action() owns the object boundary and trace,
// while each definition supplies its closed option vocabulary exactly once.
export function closedAction(metadata, options, implementation) {
  return action({ ...metadata, options }, function (args = {}) {
    if (options !== undefined) validateKeys(args, options, metadata.op);
    return implementation.call(this, args);
  });
}
