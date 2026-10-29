import { action } from "../../core/action.js";
import { hasPlotUnderlays } from "../../materialization/plotDrawOrder.js";
import { findLayer } from "../../selectors/layers.js";
import { prepareCanvasResourceRevision, applyCanvasResourceRevision } from "./resourceRevision.js";
import {
  DEFAULT_CANVAS,
  DEFAULT_MARGIN,
  normalizeMargin,
  normalizePlotBorder,
  resolveCanvasPlot,
  validateCanvasState
} from "../../layout/canvas.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { validateOptionObject } from "../../core/validation.js";
import {
  applyMaterializationPlan,
  planCanvasRematerialization
} from "../../materialization/dependencies.js";
import {
  assertCanvasHierarchyAvailable,
  CANVAS_GRAPHIC_ID,
  findCanvasGraphic,
  PLOT_GRAPHIC_ID
} from "../../materialization/graphicHierarchy.js";

const CANVAS_OPTIONS = Object.freeze([
  "width",
  "height",
  "background",
  "margin",
  "plot",
  "plotBorder"
]);

function validateOptions(args, operation, { allowEmpty = false } = {}) {
  validateOptionObject(args, CANVAS_OPTIONS, operation, { allowEmpty });
}

function requireCanvas(program) {
  const canvas = findCanvasGraphic(program);

  if (canvas?.type !== "canvas") {
    throw new Error("editCanvas requires an existing canvas.");
  }

  return canvas;
}

function resolveCanvasState(properties, args, config = {}) {
  const baseMargin = config.margin ?? DEFAULT_MARGIN;
  const baseSize = config.size ?? { width: "explicit", height: "explicit" };
  const state = {
    width: properties.width, height: properties.height, background: properties.background,
    ...args,
    margin: Object.hasOwn(args, "margin") ? normalizeMargin(args.margin, baseMargin) : baseMargin,
    requestedMargin: Object.hasOwn(args, "margin") ? normalizeMargin(args.margin, config.requestedMargin ?? baseMargin) : config.requestedMargin ?? baseMargin,
    plotBorder: normalizePlotBorder(Object.hasOwn(args, "plotBorder") ? args.plotBorder : (config.plotBorder ?? false)),
    size: {
      width: Object.hasOwn(args, "width") ? "explicit" : baseSize.width,
      height: Object.hasOwn(args, "height") ? "explicit" : baseSize.height
    }
  };
  delete state.plot;
  const plot = resolveCanvasPlot(args, config.plot);
  if (plot !== undefined) {
    state.plot = plot;
    state.width = plot.width + state.margin.left + state.margin.right;
    state.height = plot.height + state.margin.top + state.margin.bottom;
    state.size = { width: "explicit", height: "explicit" };
  }
  validateCanvasState(state);
  return cloneAndFreeze(state);
}

function applyCanvasState(program, args, state) {
  let next = program;
  for (const property of ["width", "height", "background"]) {
    if (Object.hasOwn(args, property) || state.plot !== undefined && property !== "background") {
      next = next.editGraphics({ target: CANVAS_GRAPHIC_ID, property, value: state[property] });
    }
  }
  return next._withCanvasConfig(canvasConfig(state));
}

function canvasConfig(state) {
  return { margin: state.margin, size: state.size,
    ...(state.plot === undefined ? {} : { plot: state.plot, requestedMargin: state.requestedMargin }),
    ...(state.plotBorder === false ? {} : { plotBorder: state.plotBorder }) };
}

function previewCanvasState(program, state) {
  const canvas = program.graphicSpec.objects[CANVAS_GRAPHIC_ID];
  return { ...program, constructor: program.constructor, graphicSpec: { ...program.graphicSpec, objects: { ...program.graphicSpec.objects,
    [CANVAS_GRAPHIC_ID]: { ...canvas, properties: { ...canvas.properties, width: state.width, height: state.height, background: state.background } } } },
    materializationConfigs: { ...program.materializationConfigs, canvas: canvasConfig(state) } };
}

function assertBorderAvailable(program, state) {
  if (state.plotBorder !== false && program.materializationConfigs.canvas?.plotBorder === undefined &&
      (program.graphicSpec.objects.plotBorder !== undefined || findLayer(program, "plotBorder") !== undefined)) {
    throw new Error('Canvas plotBorder requires the reserved graphic id "plotBorder".');
  }
}

function createHierarchy(program) {
  return program.createGraphics({ id: CANVAS_GRAPHIC_ID, type: "canvas" })
    .createGraphics({ id: PLOT_GRAPHIC_ID, type: "collection", parent: CANVAS_GRAPHIC_ID });
}

function initialSize(args) {
  return Object.fromEntries(["width", "height"].map(key =>
    [key, args.plot || Object.hasOwn(args, key) ? "explicit" : "auto"]));
}

export const editCanvas = /* @__PURE__ */ action(
  {
    op: "editCanvas",
    description: "Edit canvas properties and authoring bounds."
  },
  function (args = {}) {
    validateOptions(args, "editCanvas");
    const state = resolveCanvasState(requireCanvas(this).properties, args, this.materializationConfigs.canvas);
    assertBorderAvailable(this, state);
    const changesLayout = ["width", "height", "margin", "plot"].some(key => Object.hasOwn(args, key));
    const resources = changesLayout ? prepareCanvasResourceRevision(previewCanvasState(this, state)) : undefined;
    let next = this;
    if (state.plotBorder === false && this.materializationConfigs.canvas?.plotBorder !== undefined) {
      next = next.editGraphics({ target: "plotBorder", remove: true });
    }
    next = applyCanvasState(next, args, state);
    next = applyCanvasResourceRevision(next, resources);

    if (
      changesLayout
    ) {
      next = applyMaterializationPlan(
        next,
        planCanvasRematerialization(next)
      );
    } else if (state.plotBorder !== false && Object.hasOwn(args, "plotBorder")) {
      next = next.rematerializePlotBorder();
    }

    return hasPlotUnderlays(this) || hasPlotUnderlays(next) ? next.rematerializePlotDrawOrder() : next;
  }
);

export const createCanvas = /* @__PURE__ */ action(
  {
    op: "createCanvas",
    description: "Create and configure the chart canvas."
  },
  function (args = {}) {
    validateOptions(args, "createCanvas", { allowEmpty: true });

    assertCanvasHierarchyAvailable(this);

    const plot = resolveCanvasPlot(args);
    const options = { ...DEFAULT_CANVAS, ...args };
    if (plot !== undefined) {
      delete options.width;
      delete options.height;
    }
    const next = createHierarchy(this).editCanvas(options);
    return next._withCanvasConfig({ ...next.materializationConfigs.canvas, size: initialSize(args) });
  }
);

export const createBasicCanvas = /* @__PURE__ */ action(
  {
    op: "createCanvas",
    description: "Create and configure the chart canvas."
  },
  function (args = {}) {
    validateOptions(args, "createCanvas", { allowEmpty: true });
    assertCanvasHierarchyAvailable(this);
    const state = resolveCanvasState(DEFAULT_CANVAS, args, { size: initialSize(args) });
    assertBorderAvailable(this, state);
    const next = applyCanvasState(createHierarchy(this), state, state);
    return state.plotBorder === false ? next : next.rematerializePlotBorder();
  }
);
