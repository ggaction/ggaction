import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  validateKeys,
  validateNonEmptyString,
  validateNonNegativeFinite
} from "../../../core/validation.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { DEFAULT_COLORS } from "../../../theme/defaults.js";
import {
  defaultAxisPosition,
  resolveAxisLineGeometry,
  validateAxisPosition
} from "./policy.js";

const DEFAULT_STYLE = Object.freeze({ color: DEFAULT_COLORS.text, lineWidth: 1 });
const CREATE_OPTIONS = Object.freeze(["scale", "position", "color", "lineWidth"]);
const EDIT_OPTIONS = Object.freeze(["position", "color", "lineWidth"]);

function validateStyle({ color, lineWidth }) {
  validateNonEmptyString(color, "Axis line color");
  validateNonNegativeFinite(lineWidth, "Axis lineWidth");
}

function resolveGeometry(program, channel, scaleId, position) {
  const hasConsumer = program.semanticSpec.layers.some(
    layer => layer.encoding?.[channel]?.scale === scaleId
  );

  if (!hasConsumer) {
    throw new Error(
      `Axis line requires scale "${scaleId}" on the ${channel} channel.`
    );
  }

  const range = program.resolvedScales[scaleId]?.range;
  const bounds = resolveGraphicBounds(program);

  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite)) {
    throw new Error(`Axis line requires a resolved numeric scale "${scaleId}".`);
  }

  if (
    bounds === undefined ||
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
  ) {
    throw new Error("Axis line requires graphical Canvas bounds.");
  }

  return resolveAxisLineGeometry(bounds, channel, position, range);
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
      validateKeys(args, EDIT_OPTIONS, operation);
      const { graphic } = axisIds(channel);
      const line = this.graphicSpec.objects[graphic];

      if (line?.type !== "line") {
        throw new Error(`${operation} requires an existing ${channel}-axis line.`);
      }

      const previous = this.guideConfigs.axis?.[channel]?.line;
      const position = validateAxisPosition(
        channel,
        args.position ?? previous?.position ?? defaultAxisPosition(channel)
      );
      const scaleId = this.semanticSpec.guides.axis?.[channel]?.scale;
      const geometry = resolveGeometry(this, channel, scaleId, position);
      const color = args.color ?? line.properties.stroke;
      const lineWidth = args.lineWidth ?? line.properties.strokeWidth;
      validateStyle({ color, lineWidth });
      let next = this._withGuideConfig(channel, "line", {
        position,
        color,
        lineWidth
      });

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
      validateKeys(args, CREATE_OPTIONS, operation);
      const scale = validateUserId(args.scale ?? channel, "Scale id");
      const position = validateAxisPosition(
        channel,
        args.position ?? defaultAxisPosition(channel)
      );
      const color = args.color ?? DEFAULT_STYLE.color;
      const lineWidth = args.lineWidth ?? DEFAULT_STYLE.lineWidth;
      validateStyle({ color, lineWidth });
      resolveGeometry(this, channel, scale, position);
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
