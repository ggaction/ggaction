import { action } from "../../core/action.js";
import {
  DEFAULT_CANVAS,
  DEFAULT_MARGIN,
  normalizeMargin,
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
  "margin"
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

function resolveCanvasState(program, args) {
  const canvas = requireCanvas(program);
  const baseMargin =
    program.materializationConfigs.canvas?.margin ?? DEFAULT_MARGIN;
  const state = {
    width: Object.hasOwn(args, "width")
      ? args.width
      : canvas.properties.width,
    height: Object.hasOwn(args, "height")
      ? args.height
      : canvas.properties.height,
    background: Object.hasOwn(args, "background")
      ? args.background
      : canvas.properties.background,
    margin: Object.hasOwn(args, "margin")
      ? normalizeMargin(args.margin, baseMargin)
      : baseMargin
  };

  validateCanvasState(state);
  return cloneAndFreeze(state);
}

export const editCanvas = action(
  {
    op: "editCanvas",
    description: "Edit canvas properties and authoring bounds."
  },
  function (args = {}) {
    validateOptions(args, "editCanvas");
    const state = resolveCanvasState(this, args);
    let next = this;

    for (const property of ["width", "height", "background"]) {
      if (Object.hasOwn(args, property)) {
        next = next.editGraphics({
          target: "canvas",
          property,
          value: state[property]
        });
      }
    }

    next = next._withCanvasConfig({ margin: state.margin });

    if (
      Object.hasOwn(args, "width") ||
      Object.hasOwn(args, "height") ||
      Object.hasOwn(args, "margin")
    ) {
      next = applyMaterializationPlan(
        next,
        planCanvasRematerialization(next)
      );
    }

    return next;
  }
);

export const createCanvas = action(
  {
    op: "createCanvas",
    description: "Create and configure the chart canvas."
  },
  function (args = {}) {
    validateOptions(args, "createCanvas", { allowEmpty: true });

    assertCanvasHierarchyAvailable(this);

    const options = {
      width: Object.hasOwn(args, "width")
        ? args.width
        : DEFAULT_CANVAS.width,
      height: Object.hasOwn(args, "height")
        ? args.height
        : DEFAULT_CANVAS.height,
      background: Object.hasOwn(args, "background")
        ? args.background
        : DEFAULT_CANVAS.background,
      margin: Object.hasOwn(args, "margin")
        ? args.margin
        : DEFAULT_CANVAS.margin
    };

    return this
      .createGraphics({ id: CANVAS_GRAPHIC_ID, type: "canvas" })
      .createGraphics({
        id: PLOT_GRAPHIC_ID,
        type: "collection",
        parent: CANVAS_GRAPHIC_ID
      })
      .editCanvas(options);
  }
);
