import { AXIS_RESOURCE_CHANNELS } from "../../../core/vocabulary.js";
import { cartesianAxisOwners, axisTargetArgs, assertCartesianAxisSideAvailable } from "../../../selectors/axes.js";
import { axisGraphicIds } from "../../../materialization/guides/resources.js";
import { defaultAxisPosition, validateAxisPosition, resolveAxisFrameConfig } from "./policy.js";
import { isSourceOwnedText } from "../../../grammar/text.js";
import { withGuideLayoutValidation } from "../../../materialization/guides/layout.js";
import { action } from "../../../core/action.js";
import { isPlainObject } from "../../../core/immutable.js";
import { validateUserId } from "../../../core/identifiers.js";
import { validateKeys, validateNonNegativeFinite } from "../../../core/validation.js";
import { hasCoordinate } from "../../../selectors/index.js";
import { validateEnabledAxisComponents } from "./components.js";
import { requireSemanticScale } from "../../../selectors/scales.js";
import { requireCoordinate } from "../../../selectors/coordinates.js";

const TOP_OPTIONS = Object.freeze([
  "id",
  "scale",
  "coordinate",
  "position",
  "line",
  "ticksAndLabels",
  "title",
  "offset", "underlay"
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
  "fontWeight",
  "alongOffset", "align", "baseline"
]);

function validateNested(value, supported, label) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }

  validateKeys(value, supported, label);
}

export function validateAxisArgs(args, operation) {
  validateKeys(args, TOP_OPTIONS, operation);
  if (Object.hasOwn(args, "offset")) validateNonNegativeFinite(args.offset, "Axis frame offset");
  resolveAxisFrameConfig(undefined, args);

  validateEnabledAxisComponents(args, operation);
  if (Object.hasOwn(args, "line") && args.line !== false) {
    validateNested(args.line, LINE_OPTIONS, `${operation}.line`);
  }

  if (Object.hasOwn(args, "ticksAndLabels") && args.ticksAndLabels !== false) {
    validateNested(
      args.ticksAndLabels,
      TICK_GROUP_OPTIONS,
      `${operation}.ticksAndLabels`
    );
  }

  if (Object.hasOwn(args, "title") && args.title !== false) {
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
    withGuideLayoutValidation(function (args = {}) {
      validateAxisArgs(args, operation.create);
      const axisId = validateUserId(args.id ?? channel, "Axis id");
      if (AXIS_RESOURCE_CHANNELS.includes(axisId) && axisId !== channel) {
        throw new Error(`Axis id "${axisId}" is reserved for another axis channel.`);
      }
      const named = axisId !== channel;
      let source = this;
      if (named) {
        if (cartesianAxisOwners(this).some(owner => owner.id === axisId) ||
            axisGraphicIds(channel, axisId).some(id => this.graphicSpec.objects[id] !== undefined)) {
          throw new Error(`Axis "${axisId}" requires a missing resource and missing concrete components.`);
        }
        const layers = this.semanticSpec.layers.filter(layer => !isSourceOwnedText(layer) &&
          layer.encoding?.[channel]?.scale !== undefined &&
          (args.coordinate === undefined || layer.coordinate === args.coordinate) &&
          (args.scale === undefined || layer.encoding[channel].scale === args.scale));
        const scales = [...new Set(layers.map(layer => layer.encoding[channel].scale))];
        if (args.scale === undefined && scales.length !== 1) throw new Error("Named axes require an explicit scale when the channel binding is ambiguous.");
        const scale = args.scale ?? scales[0];
        const coordinates = [...new Set(layers.map(layer => layer.coordinate))];
        if (args.coordinate === undefined && coordinates.length !== 1) throw new Error("Named axes require an explicit coordinate when the binding is ambiguous.");
        const coordinate = args.coordinate ?? coordinates[0];
        if (requireCoordinate(this, coordinate).type !== "cartesian") throw new Error("Named Cartesian axes require a Cartesian coordinate.");
        const position = validateAxisPosition(channel, args.position ?? defaultAxisPosition(channel));
        assertCartesianAxisSideAvailable(this, { id: axisId, channel, coordinate, position });
        args = { ...args, scale, coordinate, position };
        source = source.editSemantic({ property: `guide.axis.${axisId}.channel`, value: channel })
          .editSemantic({ property: `guide.axis.${axisId}.position`, value: position })
          .editSemantic({ property: `guide.axis.${axisId}.scale`, value: scale })
          .editSemantic({ property: `guide.axis.${axisId}.coordinate`, value: coordinate });
      } else if (cartesianAxisOwners(this).some(owner => owner.named)) {
        const scale = args.scale ?? channel;
        const coordinates = [...new Set(this.semanticSpec.layers.filter(layer =>
          layer.encoding?.[channel]?.scale === scale).map(layer => layer.coordinate))];
        const coordinate = args.coordinate ?? (coordinates.length === 1 ? coordinates[0] : undefined);
        assertCartesianAxisSideAvailable(this, { id: axisId, channel, coordinate,
          position: validateAxisPosition(channel, args.position ?? defaultAxisPosition(channel)) });
        if (!cartesianAxisOwners(this).some(owner => owner.id === channel)) {
          source = source.editSemantic({ property: `guide.axis.${axisId}.scale`, value: scale });
          if (coordinate !== undefined) source = source.editSemantic({ property: `guide.axis.${axisId}.coordinate`, value: coordinate });
        }
      }
      const shared = axisTargetArgs(axisId, channel);
      if (Object.hasOwn(args, "scale")) shared.scale = args.scale;
      if (Object.hasOwn(args, "position")) shared.position = args.position;
      const frame = resolveAxisFrameConfig(source.guideConfigs.axis?.[axisId]?.frame, args);
      let next = frame === undefined
        ? source._withoutMaterializationConfig(["guides", "axis", axisId, "frame"])
        : source._withGuideConfig(axisId, "frame", frame);

      if (Object.hasOwn(args, "coordinate")) {
        const coordinate = validateUserId(args.coordinate, "Coordinate id");
        const scale = args.scale ?? channel;
        const exists = hasCoordinate(next, coordinate);
        const hasConsumer = next.semanticSpec.layers.some(
          layer =>
            !isSourceOwnedText(layer) && layer.coordinate === coordinate &&
            layer.encoding?.[channel]?.scale === scale
        );

        if (!exists) {
          throw new Error(`Unknown coordinate "${coordinate}".`);
        }
        const standalone = !hasConsumer;
        if (standalone && (!Object.hasOwn(args, "scale") ||
            next.semanticSpec.layers.some(layer => Object.values(layer.encoding ?? {}).some(encoding => encoding?.scale === scale)))) {
          throw new Error(`${operation.create} found no ${channel} encoding for coordinate "${coordinate}" and scale "${scale}"; standalone binding requires an explicit unused scale.`);
        }
        if (standalone) {
          const definition = requireSemanticScale(next, scale);
          if (!Array.isArray(definition.domain) || definition.domain.length === 0 ||
              requireCoordinate(next, coordinate).type !== "cartesian") {
            throw new Error("Standalone axes require a Cartesian coordinate and explicit nonempty scale domain.");
          }
        }

        next = next.editSemantic({
          property: `guide.axis.${axisId}.coordinate`,
          value: coordinate
        });
        if (standalone) next = next._withGuideConfig(axisId, "binding", { standalone: true })
          .editSemantic({ property: `guide.axis.${axisId}.scale`, value: scale })
          .rematerializeScale({ id: scale, guides: false, marks: false });
      }

      for (const component of ["line", "ticksAndLabels", "title"]) {
        if (args[component] !== false) {
          next = next[operation[component]]({ ...shared, ...(args[component] ?? {}) });
        }
      }
      return next;
    })
  );
}

const createXAxis = /* @__PURE__ */ makeCreateAxis("x");
const createYAxis = /* @__PURE__ */ makeCreateAxis("y");

export function registerAxisActions(Class) {
  Class.prototype.createXAxis = createXAxis;
  Class.prototype.createYAxis = createYAxis;
}
