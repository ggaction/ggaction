import { action } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";

const OPTIONS = Object.freeze([
  "id",
  "data",
  "orientation",
  "positionField",
  "positionFieldType",
  "intervalField",
  "coordinate",
  "positionScale",
  "intervalScale",
  "capSize",
  "stroke",
  "strokeWidth",
  "strokeDash",
  "opacity"
]);

export const createErrorBarCap = action(
  {
    op: "createErrorBarCap",
    description: "Create one fixed-pixel error-bar cap."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createErrorBarCap");
    if (!["vertical", "horizontal"].includes(args.orientation)) {
      throw new Error(`Unsupported error-bar orientation "${args.orientation}".`);
    }
    const positionChannel = args.orientation === "vertical" ? "x" : "y";
    const intervalChannel = args.orientation === "vertical" ? "y" : "x";
    const positionAction = positionChannel === "x" ? "encodeX" : "encodeY";
    const intervalAction = intervalChannel === "x" ? "encodeX" : "encodeY";

    return this
      .createRuleMark({ id: args.id, data: args.data })
      [positionAction]({
        target: args.id,
        field: args.positionField,
        fieldType: args.positionFieldType,
        coordinate: args.coordinate,
        scale: { id: args.positionScale }
      })
      [intervalAction]({
        target: args.id,
        field: args.intervalField,
        fieldType: "quantitative",
        coordinate: args.coordinate,
        scale: { id: args.intervalScale }
      })
      .encodeStroke({ target: args.id, value: args.stroke })
      .encodeStrokeWidth({ target: args.id, value: args.strokeWidth })
      .encodeStrokeDash({ target: args.id, value: args.strokeDash })
      .encodeOpacity({ target: args.id, value: args.opacity })
      .materializeRuleSpan({
        id: args.id,
        orientation: args.orientation === "vertical" ? "horizontal" : "vertical",
        size: args.capSize
      });
  }
);
