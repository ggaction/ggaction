import { cloneAndFreeze, freezeOwned, isPlainObject } from "./immutable.js";

const metadataByWrappedAction = new WeakMap();

export function getWrappedActionMetadata(value) {
  return metadataByWrappedAction.get(value);
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

function nodeAtPath(root, path) {
  let node = root;
  for (const index of path) {
    if (!Number.isInteger(index) || index < 0 || index >= node.children.length) {
      throw new Error(`Unknown parent action path "${path.join(".")}".`);
    }
    node = node.children[index];
  }
  return node;
}

export function appendActionNodeAtPath(root, parentPath, actionNode) {
  if (!Array.isArray(parentPath)) {
    throw new TypeError("Parent action path must be an array.");
  }
  const parent = nodeAtPath(root, parentPath);
  const path = [...parentPath, parent.children.length];

  function append(node, depth) {
    if (depth === parentPath.length) {
      return freezeOwned({
        ...node,
        children: freezeOwned([...node.children, actionNode])
      });
    }
    const index = parentPath[depth];
    const children = [...node.children];
    children[index] = append(children[index], depth + 1);
    return freezeOwned({ ...node, children: freezeOwned(children) });
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
    scope
  });

  const wrappedAction = function wrappedAction(args = {}) {
    if (!isPlainObject(args)) {
      throw new TypeError("Action arguments must be a plain object.");
    }

    if (scope === "unit") this._assertUnitProgram(ownedMetadata.op);
    if (scope === "composition") this._assertCompositionProgram(ownedMetadata.op);

    const entered = this._enterAction({
      ...ownedMetadata,
      args: summarizeArgs(args)
    });
    const result = implementation.call(entered, args);

    if (!(result instanceof this.constructor)) {
      throw new TypeError(`${ownedMetadata.op} must return a ChartProgram.`);
    }

    return result._exitAction();
  };

  metadataByWrappedAction.set(wrappedAction, ownedMetadata);
  return wrappedAction;
}
