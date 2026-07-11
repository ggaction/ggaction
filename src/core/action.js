import { cloneAndFreeze, isPlainObject } from "./immutable.js";

function summarizeObject(value) {
  const summary = {};

  for (const [key, item] of Object.entries(value)) {
    if (Array.isArray(item)) {
      summary[`${key}Count`] = item.length;
    } else if (isPlainObject(item)) {
      summary[key] = summarizeObject(item);
    } else {
      summary[key] = item;
    }
  }

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
  return Object.freeze({
    id,
    op,
    description,
    args,
    children: Object.freeze([])
  });
}

export function appendActionNode(root, parentId, actionNode) {
  function append(node) {
    if (node.id === parentId) {
      return {
        found: true,
        node: Object.freeze({
          ...node,
          children: Object.freeze([...node.children, actionNode])
        })
      };
    }

    for (let index = 0; index < node.children.length; index += 1) {
      const result = append(node.children[index]);

      if (result.found) {
        const children = [...node.children];
        children[index] = result.node;

        return {
          found: true,
          node: Object.freeze({
            ...node,
            children: Object.freeze(children)
          })
        };
      }
    }

    return { found: false, node };
  }

  const result = append(root);

  if (!result.found) {
    throw new Error(`Unknown parent action "${parentId}".`);
  }

  return result.node;
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

  return function wrappedAction(args = {}) {
    if (!isPlainObject(args)) {
      throw new TypeError("Action arguments must be a plain object.");
    }

    const entered = this._enterAction({
      ...metadata,
      args: summarizeArgs(args)
    });
    const result = implementation.call(entered, args);

    if (!(result instanceof this.constructor)) {
      throw new TypeError(`${metadata.op} must return a ChartProgram.`);
    }

    return result._exitAction();
  };
}
