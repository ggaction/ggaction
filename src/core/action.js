import { validateKeys } from "./validation.js";
import { annotateError } from "./diagnostics.js";
import { cloneAndFreeze, freezeOwned, isOwned, isPlainObject } from "./immutable.js";

const metadataByWrappedAction = new WeakMap();
const implementationByWrappedAction = new WeakMap();
let actionCompletionHook;

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

function summarizeObject(value, ancestors = new WeakSet()) {
  if (ancestors.has(value)) {
    throw new TypeError("Action arguments must not contain circular references.");
  }
  ancestors.add(value);
  const summary = {};

  for (const [key, item] of Object.entries(value)) {
    if (Array.isArray(item)) {
      summary[`${key}Count`] = item.length;
    } else if (isPlainObject(item)) {
      summary[key] = summarizeObject(item, ancestors);
    } else if (typeof item === "function") {
      summary[`${key}Type`] = "function";
    } else if (item !== null && typeof item === "object") {
      summary[`${key}Type`] = item.constructor?.name ?? "object";
    } else {
      summary[key] = item;
    }
  }

  ancestors.delete(value);
  return summary;
}

export function summarizeArgs(args) {
  if (!isPlainObject(args)) {
    throw new TypeError("Action arguments must be a plain object.");
  }

  return cloneAndFreeze(summarizeObject(args));
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

function withChildList(node, list) {
  let children;
  const next = {};
  for (const key of Object.keys(node)) {
    if (key !== "children") Object.defineProperty(next, key, {
      value: node[key], enumerable: true
    });
  }
  Object.defineProperty(next, "children", {
    enumerable: true,
    get() {
      if (children === undefined) {
        const values = new Array(list.length);
        let item = list.tail;
        for (let index = list.length - 1; index >= 0; index -= 1) {
          values[index] = item.value;
          item = item.previous;
        }
        children = freezeOwned(values);
      }
      return children;
    }
  });
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
  
      if (scope === "unit") this._assertUnitProgram(ownedMetadata.op);
      if (scope === "composition") this._assertCompositionProgram(ownedMetadata.op);
  
      const summarizedArgs = summarizeArgs(args);
      const entered = this._enterAction({
        ...ownedMetadata,
        args: summarizedArgs
      });
      let result = implementation.call(entered, args);
  
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
