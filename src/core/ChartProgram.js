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

function ownChildPrograms(children) {
  if (!isPlainObject(children)) {
    throw new TypeError("ChartProgram children must be a plain object.");
  }
  if (isOwned(children)) return children;
  const owned = {};
  for (const [id, program] of Object.entries(children)) {
    if (typeof id !== "string" || id.length === 0) {
      throw new TypeError("ChartProgram child IDs must be non-empty strings.");
    }
    if (!(program instanceof ChartProgram)) {
      throw new TypeError(`ChartProgram child "${id}" must be a ChartProgram.`);
    }
    owned[id] = program;
  }
  return freezeOwned(owned);
}

function ownCompositionSpec(compositionSpec, children) {
  const childIds = Object.keys(children);
  if (compositionSpec === undefined) {
    if (childIds.length > 0) {
      throw new Error("ChartProgram children require a compositionSpec.");
    }
    return undefined;
  }
  if (!isPlainObject(compositionSpec)) {
    throw new TypeError("ChartProgram compositionSpec must be a plain object.");
  }
  const allowed = [
    "id", "type", "direction", "children", "columns", "gap", "align",
    "padding", "facet"
  ];
  const unknown = Object.keys(compositionSpec).find(key => !allowed.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown compositionSpec property "${unknown}".`);
  }
  if (typeof compositionSpec.id !== "string" || compositionSpec.id.length === 0) {
    throw new TypeError("compositionSpec.id must be a non-empty string.");
  }
  const facet = compositionSpec.type === "facet";
  if (compositionSpec.type !== undefined && !facet) {
    throw new Error(`Unknown compositionSpec type "${compositionSpec.type}".`);
  }
  if (facet) {
    if (compositionSpec.direction !== undefined) {
      throw new Error("Facet compositionSpec does not use direction.");
    }
  } else if (!["horizontal", "vertical"].includes(compositionSpec.direction)) {
    throw new Error("compositionSpec.direction must be horizontal or vertical.");
  }
  if (
    !Array.isArray(compositionSpec.children) ||
    compositionSpec.children.length < (facet ? 1 : 2) ||
    !compositionSpec.children.every(id => typeof id === "string" && id.length > 0)
  ) {
    throw new TypeError(
      facet
        ? "Facet compositionSpec.children requires at least one child ID."
        : "compositionSpec.children requires at least two child IDs."
    );
  }
  if (new Set(compositionSpec.children).size !== compositionSpec.children.length) {
    throw new Error("compositionSpec.children must not contain duplicate IDs.");
  }
  if (
    compositionSpec.children.length !== childIds.length ||
    compositionSpec.children.some(id => !Object.hasOwn(children, id))
  ) {
    throw new Error("compositionSpec.children must match ChartProgram children exactly.");
  }
  if (facet) {
    if (
      !Number.isInteger(compositionSpec.columns) ||
      compositionSpec.columns <= 0 ||
      compositionSpec.columns > compositionSpec.children.length
    ) {
      throw new RangeError(
        "Facet compositionSpec.columns must be a positive integer no larger than its children."
      );
    }
    if (!isPlainObject(compositionSpec.facet)) {
      throw new TypeError("Facet compositionSpec.facet must be a plain object.");
    }
    const facetKeys = ["data", "field", "values", "scales", "guides"];
    const unknownFacet = Object.keys(compositionSpec.facet).find(
      key => !facetKeys.includes(key)
    );
    if (unknownFacet !== undefined) {
      throw new Error(`Unknown compositionSpec.facet property "${unknownFacet}".`);
    }
    for (const property of ["data", "field"]) {
      if (
        typeof compositionSpec.facet[property] !== "string" ||
        compositionSpec.facet[property].length === 0
      ) {
        throw new TypeError(`compositionSpec.facet.${property} must be a non-empty string.`);
      }
    }
    const values = compositionSpec.facet.values;
    if (
      !Array.isArray(values) ||
      values.length !== compositionSpec.children.length ||
      values.some(value => !(
        typeof value === "string" ||
        typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value))
      )) ||
      new Set(values).size !== values.length
    ) {
      throw new TypeError(
        "compositionSpec.facet.values must contain one unique scalar per child."
      );
    }
    if (compositionSpec.facet.scales !== "shared") {
      throw new Error('compositionSpec.facet.scales must be "shared".');
    }
    const guides = compositionSpec.facet.guides;
    if (
      !isPlainObject(guides) ||
      Object.keys(guides).some(key => !["axes", "legend"].includes(key)) ||
      guides.axes !== "each" ||
      ![false, "shared"].includes(guides.legend)
    ) {
      throw new Error(
        'compositionSpec.facet.guides requires axes "each" and legend false or "shared".'
      );
    }
  } else if (
    compositionSpec.columns !== undefined ||
    compositionSpec.facet !== undefined
  ) {
    throw new Error("Concat compositionSpec does not accept facet properties.");
  }
  if (!Number.isFinite(compositionSpec.gap) || compositionSpec.gap < 0) {
    throw new RangeError("compositionSpec.gap must be a non-negative finite number.");
  }
  if (!["start", "center", "end"].includes(compositionSpec.align)) {
    throw new Error("compositionSpec.align must be start, center, or end.");
  }
  if (!isPlainObject(compositionSpec.padding)) {
    throw new TypeError("compositionSpec.padding must be a plain object.");
  }
  for (const side of ["top", "right", "bottom", "left"]) {
    if (!Number.isFinite(compositionSpec.padding[side]) || compositionSpec.padding[side] < 0) {
      throw new RangeError(
        `compositionSpec.padding.${side} must be a non-negative finite number.`
      );
    }
  }
  const paddingKeys = Object.keys(compositionSpec.padding);
  if (
    paddingKeys.length !== 4 ||
    paddingKeys.some(key => !["top", "right", "bottom", "left"].includes(key))
  ) {
    throw new Error("compositionSpec.padding must contain exactly four sides.");
  }
  return ownState(compositionSpec);
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
    children = {},
    compositionSpec,
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
    this.children = ownChildPrograms(children);
    this.compositionSpec = ownCompositionSpec(compositionSpec, this.children);
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
    children = this.children,
    compositionSpec = this.compositionSpec,
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
      children,
      compositionSpec,
      context,
      trace,
      actionStack,
      actionSequence
    });
  }

  _assertUnitProgram(operation) {
    if (this.compositionSpec !== undefined) {
      throw new Error(`${operation} is not available on a composition ChartProgram.`);
    }
  }

  _assertCompositionProgram(operation) {
    if (this.compositionSpec === undefined) {
      throw new Error(`${operation} requires a composition ChartProgram.`);
    }
  }

  _withCompositionState({ children, compositionSpec, graphicSpec = this.graphicSpec }) {
    return this._clone({ children, compositionSpec, graphicSpec });
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
