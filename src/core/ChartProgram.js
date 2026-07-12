import {
  appendActionNode,
  countActionNodes,
  createActionNode
} from "./action.js";
import {
  cloneAndFreeze,
  freezeOwned,
  isOwned,
  isPlainObject
} from "./immutable.js";
import {
  createEmptyGraphicSpec,
  createEmptySemanticSpec,
  createTraceRoot
} from "./specs.js";
import { registerPrimitiveActions } from "../actions/primitives.js";
import { registerCanvasActions } from "../actions/canvas.js";
import { registerDataActions } from "../actions/data.js";
import { registerMarkActions } from "../actions/marks.js";

function ownState(value) {
  return isOwned(value) ? value : cloneAndFreeze(value);
}

export class ChartProgram {
  constructor({
    semanticSpec = createEmptySemanticSpec(),
    graphicSpec = createEmptyGraphicSpec(),
    children = {},
    context = {},
    trace = createTraceRoot(),
    actionStack = []
  } = {}) {
    this.semanticSpec = ownState(semanticSpec);
    this.graphicSpec = ownState(graphicSpec);
    this.children = ownState(children);
    this.context = ownState(context);
    this.trace = ownState(trace);
    this.actionStack = ownState(actionStack);

    Object.freeze(this);
  }

  _clone({
    semanticSpec = this.semanticSpec,
    graphicSpec = this.graphicSpec,
    children = this.children,
    context = this.context,
    trace = this.trace,
    actionStack = this.actionStack
  } = {}) {
    return new this.constructor({
      semanticSpec,
      graphicSpec,
      children,
      context,
      trace,
      actionStack
    });
  }

  _withContext(patch = {}) {
    if (!isPlainObject(patch)) {
      throw new TypeError("Context patch must be a plain object.");
    }

    const ownedPatch = cloneAndFreeze(patch);

    return this._clone({
      context: freezeOwned({
        ...this.context,
        ...ownedPatch
      })
    });
  }

  _enterAction({ op, description, args }) {
    const id = `a${countActionNodes(this.trace) + 1}`;
    const parentId = this.actionStack.at(-1) ?? this.trace.id;
    const actionNode = createActionNode({ id, op, description, args });
    const trace = appendActionNode(this.trace, parentId, actionNode);
    const actionStack = cloneAndFreeze([...this.actionStack, id]);

    return this._clone({ trace, actionStack });
  }

  _exitAction() {
    if (this.actionStack.length === 0) {
      throw new Error("Cannot exit an action when the action stack is empty.");
    }

    return this._clone({
      actionStack: cloneAndFreeze(this.actionStack.slice(0, -1))
    });
  }
}

registerPrimitiveActions(ChartProgram);
registerCanvasActions(ChartProgram);
registerDataActions(ChartProgram);
registerMarkActions(ChartProgram);

export function chart() {
  return new ChartProgram();
}
