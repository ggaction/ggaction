import { action } from "../../../core/action.js";
import { isPlainObject } from "../../../core/immutable.js";
import { validateUserId } from "../../../core/identifiers.js";

const TOP_OPTIONS = Object.freeze([
  "scale",
  "coordinate",
  "position",
  "line",
  "ticksAndLabels",
  "title"
]);
const LINE_OPTIONS = Object.freeze(["color", "lineWidth"]);
const TICK_GROUP_OPTIONS = Object.freeze([
  "count",
  "values",
  "ticks",
  "labels"
]);
const TITLE_OPTIONS = Object.freeze([
  "text",
  "at",
  "offset",
  "rotation",
  "color",
  "fontSize",
  "fontFamily",
  "fontWeight"
]);

function validateKeys(value, supported, label) {
  for (const key of Object.keys(value)) {
    if (!supported.includes(key)) {
      throw new Error(`Unknown ${label} option "${key}".`);
    }
  }
}

function validateNested(value, supported, label) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }

  validateKeys(value, supported, label);
}

function validateArgs(args, operation) {
  validateKeys(args, TOP_OPTIONS, operation);

  if (Object.hasOwn(args, "line")) {
    validateNested(args.line, LINE_OPTIONS, `${operation}.line`);
  }

  if (Object.hasOwn(args, "ticksAndLabels")) {
    validateNested(
      args.ticksAndLabels,
      TICK_GROUP_OPTIONS,
      `${operation}.ticksAndLabels`
    );
  }

  if (Object.hasOwn(args, "title")) {
    validateNested(args.title, TITLE_OPTIONS, `${operation}.title`);
  }
}

function names(channel) {
  const prefix = channel === "x" ? "X" : "Y";
  return {
    create: `create${prefix}Axis`,
    line: `create${prefix}AxisLine`,
    ticksAndLabels: `create${prefix}AxisTicksAndLabels`,
    title: `create${prefix}AxisTitle`
  };
}

function makeCreateAxis(channel) {
  const operation = names(channel);

  return action(
    {
      op: operation.create,
      description: `Create the complete ${channel}-axis.`
    },
    function (args = {}) {
      validateArgs(args, operation.create);
      const shared = {};
      if (Object.hasOwn(args, "scale")) shared.scale = args.scale;
      if (Object.hasOwn(args, "position")) shared.position = args.position;
      let next = this;

      if (Object.hasOwn(args, "coordinate")) {
        const coordinate = validateUserId(args.coordinate, "Coordinate id");
        const scale = args.scale ?? channel;
        const exists = next.semanticSpec.coordinates.some(
          item => item.id === coordinate
        );
        const hasConsumer = next.semanticSpec.layers.some(
          layer =>
            layer.coordinate === coordinate &&
            layer.encoding?.[channel]?.scale === scale
        );

        if (!exists) {
          throw new Error(`Unknown coordinate "${coordinate}".`);
        }
        if (!hasConsumer) {
          throw new Error(
            `${operation.create} found no ${channel} encoding for coordinate "${coordinate}" and scale "${scale}".`
          );
        }

        next = next.editSemantic({
          property: `guide.axis.${channel}.coordinate`,
          value: coordinate
        });
      }

      return next[operation.line]({
        ...shared,
        ...(args.line ?? {})
      })[operation.ticksAndLabels]({
        ...shared,
        ...(args.ticksAndLabels ?? {})
      })[operation.title]({
        ...shared,
        ...(args.title ?? {})
      });
    }
  );
}

const createXAxis = makeCreateAxis("x");
const createYAxis = makeCreateAxis("y");

export function registerAxisActions(Class) {
  Class.prototype.createXAxis = createXAxis;
  Class.prototype.createYAxis = createYAxis;
}
