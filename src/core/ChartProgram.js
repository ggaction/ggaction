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
import { registerMarkActions } from "../actions/marks/index.js";
import { registerScaleActions } from "../actions/scales.js";
import { registerEncodingActions } from "../actions/encodings.js";
import { registerCoordinateActions } from "../actions/coordinates.js";
import { registerGuideActions } from "../actions/guides/index.js";
import { registerTitleActions } from "../actions/titles.js";

function ownState(value) {
  return isOwned(value) ? value : cloneAndFreeze(value);
}

export class ChartProgram {
  constructor({
    semanticSpec = createEmptySemanticSpec(),
    graphicSpec = createEmptyGraphicSpec(),
    resolvedScales = {},
    guideConfigs = {},
    titleConfig,
    children = {},
    context = {},
    trace = createTraceRoot(),
    actionStack = []
  } = {}) {
    this.semanticSpec = ownState(semanticSpec);
    this.graphicSpec = ownState(graphicSpec);
    this.resolvedScales = ownState(resolvedScales);
    this.guideConfigs = ownState(guideConfigs);
    this.titleConfig = titleConfig === undefined
      ? undefined
      : ownState(titleConfig);
    this.children = ownState(children);
    this.context = ownState(context);
    this.trace = ownState(trace);
    this.actionStack = ownState(actionStack);

    Object.freeze(this);
  }

  _clone({
    semanticSpec = this.semanticSpec,
    graphicSpec = this.graphicSpec,
    resolvedScales = this.resolvedScales,
    guideConfigs = this.guideConfigs,
    titleConfig = this.titleConfig,
    children = this.children,
    context = this.context,
    trace = this.trace,
    actionStack = this.actionStack
  } = {}) {
    return new this.constructor({
      semanticSpec,
      graphicSpec,
      resolvedScales,
      guideConfigs,
      titleConfig,
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

  _withResolvedScale(id, scale) {
    if (typeof id !== "string" || id.length === 0) {
      throw new TypeError("Resolved scale id must be a non-empty string.");
    }

    if (!isPlainObject(scale)) {
      throw new TypeError("Resolved scale must be a plain object.");
    }

    const ownedScale = cloneAndFreeze(scale);

    return this._clone({
      resolvedScales: freezeOwned({
        ...this.resolvedScales,
        [id]: ownedScale
      })
    });
  }

  _withGuideConfig(channel, component, config) {
    if (config === undefined) {
      config = component;
      component = "ticks";
    }

    const owned = cloneAndFreeze(config);
    return this._clone({
      guideConfigs: freezeOwned({
        ...this.guideConfigs,
        axis: freezeOwned({
          ...this.guideConfigs.axis,
          [channel]: freezeOwned({
            ...this.guideConfigs.axis?.[channel],
            [component]: owned
          })
        })
      })
    });
  }

  _withLegendConfig(config) {
    if (!isPlainObject(config)) {
      throw new TypeError("Legend config must be a plain object.");
    }

    const owned = cloneAndFreeze(config);
    return this._clone({
      guideConfigs: freezeOwned({
        ...this.guideConfigs,
        legend: freezeOwned({
          ...this.guideConfigs.legend,
          series: owned
        })
      })
    });
  }

  _withTitleConfig(config) {
    if (!isPlainObject(config)) {
      throw new TypeError("Title config must be a plain object.");
    }

    return this._clone({ titleConfig: cloneAndFreeze(config) });
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
registerScaleActions(ChartProgram);
registerEncodingActions(ChartProgram);
registerCoordinateActions(ChartProgram);
registerGuideActions(ChartProgram);
registerTitleActions(ChartProgram);

export function chart() {
  return new ChartProgram();
}
