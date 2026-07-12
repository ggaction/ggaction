import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";

const DEFAULT_STYLE = Object.freeze({ color: "#334155", lineWidth: 1 });
const CREATE_OPTIONS = Object.freeze(["scale", "position", "color", "lineWidth"]);
const EDIT_OPTIONS = Object.freeze(["position", "color", "lineWidth"]);

function validateOptions(args, supported, operation) {
  for (const key of Object.keys(args)) {
    if (!supported.includes(key)) {
      throw new Error(`Unknown ${operation} option "${key}".`);
    }
  }
}

function validatePosition(channel, position) {
  const supported = channel === "x" ? "bottom" : "left";

  if (position !== supported) {
    throw new Error(`Unsupported ${channel}-axis position "${position}".`);
  }

  return position;
}

function validateStyle({ color, lineWidth }) {
  if (typeof color !== "string" || color.length === 0) {
    throw new TypeError("Axis line color must be a non-empty string.");
  }

  if (!Number.isFinite(lineWidth) || lineWidth < 0) {
    throw new RangeError("Axis lineWidth must be a non-negative finite number.");
  }
}

function resolveGeometry(program, channel, scaleId) {
  const hasConsumer = program.semanticSpec.layers.some(
    layer => layer.encoding?.[channel]?.scale === scaleId
  );

  if (!hasConsumer) {
    throw new Error(
      `Axis line requires scale "${scaleId}" on the ${channel} channel.`
    );
  }

  const range = program.resolvedScales[scaleId]?.range;
  const bounds = program.context.currentGraphicBounds;

  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite)) {
    throw new Error(`Axis line requires a resolved numeric scale "${scaleId}".`);
  }

  if (
    bounds === undefined ||
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
  ) {
    throw new Error("Axis line requires graphical Canvas bounds.");
  }

  return channel === "x"
    ? { x1: range[0], y1: bounds.y + bounds.height, x2: range[1], y2: bounds.y + bounds.height }
    : { x1: bounds.x, y1: range[0], x2: bounds.x, y2: range[1] };
}

function axisIds(channel) {
  return {
    graphic: `${channel}AxisLine`,
    guidePath: `guide.axis.${channel}.scale`
  };
}

function createEditAxisLine(channel) {
  const operation = channel === "x" ? "editXAxisLine" : "editYAxisLine";

  return action(
    { op: operation, description: `Edit the concrete ${channel}-axis line.` },
    function (args = {}) {
      validateOptions(args, EDIT_OPTIONS, operation);
      validatePosition(channel, args.position ?? (channel === "x" ? "bottom" : "left"));
      const { graphic } = axisIds(channel);
      const line = this.graphicSpec.objects[graphic];

      if (line?.type !== "line") {
        throw new Error(`${operation} requires an existing ${channel}-axis line.`);
      }

      const scaleId = this.semanticSpec.guides.axis?.[channel]?.scale;
      const geometry = resolveGeometry(this, channel, scaleId);
      const color = args.color ?? line.properties.stroke;
      const lineWidth = args.lineWidth ?? line.properties.strokeWidth;
      validateStyle({ color, lineWidth });
      let next = this;

      for (const property of ["x1", "y1", "x2", "y2"]) {
        next = next.editGraphics({ target: graphic, property, value: geometry[property] });
      }

      return next
        .editGraphics({ target: graphic, property: "stroke", value: color })
        .editGraphics({ target: graphic, property: "strokeWidth", value: lineWidth });
    }
  );
}

const editXAxisLine = createEditAxisLine("x");
const editYAxisLine = createEditAxisLine("y");

function createAxisLine(channel) {
  const operation = channel === "x" ? "createXAxisLine" : "createYAxisLine";
  const editOperation = channel === "x" ? "editXAxisLine" : "editYAxisLine";

  return action(
    { op: operation, description: `Create the concrete ${channel}-axis line.` },
    function (args = {}) {
      validateOptions(args, CREATE_OPTIONS, operation);
      const scale = validateUserId(args.scale ?? channel, "Scale id");
      const position = validatePosition(
        channel,
        args.position ?? (channel === "x" ? "bottom" : "left")
      );
      const color = args.color ?? DEFAULT_STYLE.color;
      const lineWidth = args.lineWidth ?? DEFAULT_STYLE.lineWidth;
      validateStyle({ color, lineWidth });
      resolveGeometry(this, channel, scale);
      const { graphic, guidePath } = axisIds(channel);

      if (this.graphicSpec.objects[graphic] !== undefined) {
        throw new Error(`${operation} requires a missing ${channel}-axis line.`);
      }

      return this
        .editSemantic({ property: guidePath, value: scale })
        .createGraphics({ id: graphic, type: "line" })
        [editOperation]({ position, color, lineWidth });
    }
  );
}

const createXAxisLine = createAxisLine("x");
const createYAxisLine = createAxisLine("y");

export function registerAxisLineActions(ProgramClass) {
  ProgramClass.prototype.editXAxisLine = editXAxisLine;
  ProgramClass.prototype.editYAxisLine = editYAxisLine;
  ProgramClass.prototype.createXAxisLine = createXAxisLine;
  ProgramClass.prototype.createYAxisLine = createYAxisLine;
}
