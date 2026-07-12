import { action } from "../../core/action.js";
import {
  createGraphicBounds,
  DEFAULT_CANVAS,
  DEFAULT_MARGIN,
  normalizeMargin,
  validateCanvasState
} from "../../core/canvasLayout.js";
import { cloneAndFreeze } from "../../core/immutable.js";

const CANVAS_OPTIONS = Object.freeze([
  "width",
  "height",
  "background",
  "margin"
]);

function validateOptions(args, operation, { allowEmpty = false } = {}) {
  const keys = Object.keys(args);

  if (!allowEmpty && keys.length === 0) {
    throw new TypeError(`${operation} requires at least one option.`);
  }

  for (const key of keys) {
    if (!CANVAS_OPTIONS.includes(key)) {
      throw new Error(`Unknown ${operation} option "${key}".`);
    }
  }
}

function requireCanvas(program) {
  const canvas = program.graphicSpec.objects.canvas;

  if (canvas?.type !== "canvas") {
    throw new Error("editCanvas requires an existing canvas.");
  }

  return canvas;
}

function resolveCanvasState(program, args) {
  const canvas = requireCanvas(program);
  const baseMargin = program.context.currentMargin ?? DEFAULT_MARGIN;
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

function usesPositionalScale(program, id) {
  return program.semanticSpec.layers.some(layer =>
    ["x", "y"].some(channel => layer.encoding?.[channel]?.scale === id)
  );
}

function rematerializePositionScales(program) {
  let next = program;

  for (const scale of program.semanticSpec.scales) {
    if (
      (scale.range === "auto" ||
        program.semanticSpec.guides.axis?.x?.scale === scale.id ||
        program.semanticSpec.guides.axis?.y?.scale === scale.id ||
        program.semanticSpec.guides.grid?.horizontal?.scale === scale.id ||
        program.semanticSpec.guides.grid?.vertical?.scale === scale.id) &&
      program.resolvedScales[scale.id] !== undefined &&
      usesPositionalScale(program, scale.id)
    ) {
      next = next.rematerializeScale({ id: scale.id });
    }
  }

  return next;
}

function rematerializeCompleteLineMarks(program) {
  let next = program;

  for (const layer of program.semanticSpec.layers) {
    if (
      layer.mark?.type === "line" &&
      layer.encoding?.x?.scale !== undefined &&
      layer.encoding?.y?.scale !== undefined &&
      layer.encoding.y.aggregate === "mean"
    ) {
      next = next.rematerializeLineMark({ id: layer.id });
    }
  }

  return next;
}

function rematerializeCompleteBarMarks(program) {
  let next = program;

  for (const layer of program.semanticSpec.layers) {
    if (
      layer.mark?.type === "bar" &&
      layer.encoding?.x?.bin !== undefined &&
      layer.encoding?.y?.aggregate === "count" &&
      layer.encoding.y.stack === "zero"
    ) {
      next = next.rematerializeBarMark({ id: layer.id });
    }
  }

  return next;
}

function rematerializeLegend(program) {
  if (
    (program.semanticSpec.guides.legend?.series === undefined ||
      program.guideConfigs.legend?.series === undefined) &&
    (program.semanticSpec.guides.legend?.color === undefined ||
      program.guideConfigs.legend?.color === undefined)
  ) {
    return program;
  }

  return program.rematerializeLegend();
}

function rematerializeTitle(program) {
  if (
    program.semanticSpec.title.text === undefined ||
    program.titleConfig === undefined
  ) {
    return program;
  }

  return program.rematerializeTitle();
}

const editCanvas = action(
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

    next = next._withContext({
      currentMargin: state.margin,
      currentGraphicBounds: createGraphicBounds(state)
    });

    if (
      Object.hasOwn(args, "width") ||
      Object.hasOwn(args, "height") ||
      Object.hasOwn(args, "margin")
    ) {
      next = rematerializePositionScales(next);
      next = rematerializeCompleteLineMarks(next);
      next = rematerializeCompleteBarMarks(next);
      next = rematerializeLegend(next);
      next = rematerializeTitle(next);
    }

    return next;
  }
);

const createCanvas = action(
  {
    op: "createCanvas",
    description: "Create and configure the chart canvas."
  },
  function (args = {}) {
    validateOptions(args, "createCanvas", { allowEmpty: true });

    const existingCanvas = Object.values(this.graphicSpec.objects).find(
      graphic => graphic.type === "canvas"
    );

    if (existingCanvas) {
      throw new Error("createCanvas requires a program without a canvas.");
    }

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

    return this.createGraphics({ id: "canvas", type: "canvas" }).editCanvas(
      options
    );
  }
);

export function registerCanvasActions(ProgramClass) {
  ProgramClass.prototype.editCanvas = editCanvas;
  ProgramClass.prototype.createCanvas = createCanvas;
}
