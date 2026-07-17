import {
  appendActionNodeAtPath,
  countActionNodes,
  createActionNode
} from "./action.js";
import {
  cloneAndFreeze,
  freezeOwned,
  isOwned,
  isPlainObject,
  removeOwnedPath
} from "./immutable.js";
import {
  createEmptyGraphicSpec,
  createEmptySemanticSpec,
  createTraceRoot
} from "./specs.js";
import { LEGEND_CONFIG_KINDS } from "./vocabulary.js";

function ownState(value) {
  return isOwned(value) ? value : cloneAndFreeze(value);
}

function createMaterializationConfigs(
  markConfigs,
  guideConfigs,
  titleConfig,
  canvasConfig
) {
  return cloneAndFreeze({
    marks: markConfigs,
    guides: guideConfigs,
    ...(canvasConfig === undefined ? {} : { canvas: canvasConfig }),
    ...(titleConfig === undefined ? {} : { title: titleConfig })
  });
}

function updateConfigPath(value, path, config) {
  if (path.length === 0) return cloneAndFreeze(config);
  const [key, ...rest] = path;
  return freezeOwned({
    ...value,
    [key]: updateConfigPath(value?.[key] ?? {}, rest, config)
  });
}

export class ChartProgram {
  constructor({
    semanticSpec = createEmptySemanticSpec(),
    graphicSpec = createEmptyGraphicSpec(),
    resolvedScales = {},
    materializationConfigs,
    markConfigs = {},
    guideConfigs = {},
    titleConfig,
    canvasConfig,
    context = {},
    trace = createTraceRoot(),
    actionStack = [],
    actionSequence
  } = {}) {
    this.semanticSpec = ownState(semanticSpec);
    this.graphicSpec = ownState(graphicSpec);
    this.resolvedScales = ownState(resolvedScales);
    this.materializationConfigs = materializationConfigs === undefined
      ? createMaterializationConfigs(
          markConfigs,
          guideConfigs,
          titleConfig,
          canvasConfig
        )
      : ownState(materializationConfigs);
    this.context = ownState(context);
    this.trace = ownState(trace);
    this.actionStack = ownState(actionStack);
    Object.defineProperty(this, "_actionSequence", {
      value: actionSequence ?? countActionNodes(this.trace),
      enumerable: false
    });

    Object.freeze(this);
  }

  get markConfigs() {
    return this.materializationConfigs.marks;
  }

  get guideConfigs() {
    return this.materializationConfigs.guides;
  }

  get titleConfig() {
    return this.materializationConfigs.title;
  }

  _withSelectionConfig(id, config) {
    if (typeof id !== "string" || id.length === 0) {
      throw new TypeError("Selection config id must be a non-empty string.");
    }
    if (!isPlainObject(config)) {
      throw new TypeError("Selection config must be a plain object.");
    }
    return this._withMaterializationConfig(["selections", id], config);
  }

  _withHighlightConfig(id, config) {
    if (typeof id !== "string" || id.length === 0) {
      throw new TypeError("Highlight config id must be a non-empty string.");
    }
    if (!isPlainObject(config)) {
      throw new TypeError("Highlight config must be a plain object.");
    }
    return this._withMaterializationConfig(["highlights", id], config);
  }

  _clone({
    semanticSpec = this.semanticSpec,
    graphicSpec = this.graphicSpec,
    resolvedScales = this.resolvedScales,
    materializationConfigs = this.materializationConfigs,
    context = this.context,
    trace = this.trace,
    actionStack = this.actionStack,
    actionSequence = this._actionSequence
  } = {}) {
    return new this.constructor({
      semanticSpec,
      graphicSpec,
      resolvedScales,
      materializationConfigs,
      context,
      trace,
      actionStack,
      actionSequence
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

  _withMarkConfig(id, config) {
    if (typeof id !== "string" || id.length === 0) {
      throw new TypeError("Mark config id must be a non-empty string.");
    }
    if (!isPlainObject(config)) {
      throw new TypeError("Mark config must be a plain object.");
    }

    return this._withMaterializationConfig(["marks", id], config);
  }

  _withCanvasConfig(config) {
    if (!isPlainObject(config)) {
      throw new TypeError("Canvas config must be a plain object.");
    }
    return this._withMaterializationConfig(["canvas"], config);
  }

  _withMaterializationConfig(path, config) {
    if (
      !Array.isArray(path) ||
      path.length === 0 ||
      !path.every(key => typeof key === "string" && key.length > 0)
    ) {
      throw new TypeError("Materialization config path must contain names.");
    }
    if (!isPlainObject(config)) {
      throw new TypeError("Materialization config must be a plain object.");
    }
    return this._clone({
      materializationConfigs: updateConfigPath(
        this.materializationConfigs,
        path,
        config
      )
    });
  }

  _withoutMaterializationConfig(path) {
    if (
      !Array.isArray(path) ||
      path.length === 0 ||
      !path.every(key => typeof key === "string" && key.length > 0)
    ) {
      throw new TypeError("Materialization config path must contain names.");
    }
    const removed = removeOwnedPath(this.materializationConfigs, path);
    if (!removed.removed) return this;
    return this._clone({
      materializationConfigs: freezeOwned({
        ...removed.value,
        marks: removed.value.marks ?? freezeOwned({}),
        guides: removed.value.guides ?? freezeOwned({})
      })
    });
  }

  _withGuideConfig(channel, component, config) {
    if (config === undefined) {
      config = component;
      component = "ticks";
    }

    return this._withMaterializationConfig(
      ["guides", "axis", channel, component],
      config
    );
  }

  _withLegendConfig(kind, config) {
    if (config === undefined) {
      config = kind;
      kind = "series";
    }
    if (!LEGEND_CONFIG_KINDS.includes(kind)) {
      throw new Error(`Unknown legend kind "${kind}".`);
    }
    if (!isPlainObject(config)) {
      throw new TypeError("Legend config must be a plain object.");
    }

    return this._withMaterializationConfig(
      ["guides", "legend", kind],
      config
    );
  }

  _withGridConfig(direction, config) {
    if (!["horizontal", "vertical", "theta", "radial"].includes(direction)) {
      throw new Error(`Unknown grid direction "${direction}".`);
    }
    if (!isPlainObject(config)) {
      throw new TypeError("Grid config must be a plain object.");
    }

    return this._withMaterializationConfig(
      ["guides", "grid", direction],
      config
    );
  }

  _withTitleConfig(config) {
    if (!isPlainObject(config)) {
      throw new TypeError("Title config must be a plain object.");
    }

    return this._withMaterializationConfig(["title"], config);
  }

  _enterAction({ op, description, args }) {
    const actionSequence = this._actionSequence + 1;
    const id = `a${actionSequence}`;
    const parentPath = this.actionStack.at(-1)?.path ?? [];
    const actionNode = createActionNode({ id, op, description, args });
    const appended = appendActionNodeAtPath(
      this.trace,
      parentPath,
      actionNode
    );
    const actionStack = cloneAndFreeze([
      ...this.actionStack,
      { id, path: appended.path }
    ]);

    return this._clone({
      trace: appended.root,
      actionStack,
      actionSequence
    });
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

export function chart() {
  return new ChartProgram();
}
