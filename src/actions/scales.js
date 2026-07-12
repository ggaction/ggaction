import { action } from "../core/action.js";
import { validateUserId } from "../core/identifiers.js";
import {
  mapLinearValues,
  mapOrdinalValues,
  readNominalField,
  readQuantitativeField,
  resolveColorRange,
  resolveOrdinalDomain,
  resolveScaleDomain,
  resolveScaleRange,
  validateScaleDomain,
  validateScaleRange,
  validateScaleType,
  validateOrdinalDomain,
  validateColorRange,
  validateLinearScaleType,
  validateOrdinalScaleType
} from "../core/scale.js";

const CREATE_SCALE_OPTIONS = Object.freeze(["id", "type", "domain", "range"]);
const REMATERIALIZE_SCALE_OPTIONS = Object.freeze(["id"]);

function validateOptions(args, supported, operation) {
  for (const key of Object.keys(args)) {
    if (!supported.includes(key)) {
      throw new Error(`Unknown ${operation} option "${key}".`);
    }
  }
}

function sameScaleSetting(left, right) {
  if (left === right) {
    return true;
  }

  if (!Array.isArray(left) || !Array.isArray(right)) {
    return left?.palette !== undefined && left.palette === right?.palette;
  }

  return left.length === right.length && left.every((value, i) => value === right[i]);
}

function assertEquivalentScale(existing, expected) {
  if (
    existing.type !== expected.type ||
    !sameScaleSetting(existing.domain, expected.domain) ||
    !sameScaleSetting(existing.range, expected.range)
  ) {
    throw new Error(`Scale "${existing.id}" already exists with a different definition.`);
  }
}

function findScale(program, id) {
  const scale = program.semanticSpec.scales.find(item => item.id === id);

  if (scale === undefined) {
    throw new Error(`Unknown scale "${id}".`);
  }

  return scale;
}

function findScaleConsumers(program, id) {
  const consumers = [];

  for (const layer of program.semanticSpec.layers) {
    for (const channel of ["x", "y", "color"]) {
      const encoding = layer.encoding?.[channel];

      if (encoding?.scale === id) {
        consumers.push({ layer, channel, encoding });
      }
    }
  }

  return consumers;
}

function resolveConsumerValues(program, consumer) {
  const dataset = program.semanticSpec.datasets.find(
    item => item.id === consumer.layer.data
  );

  if (dataset === undefined) {
    throw new Error(
      `Mark "${consumer.layer.id}" references unknown dataset "${consumer.layer.data}".`
    );
  }

  if (consumer.channel === "color") {
    if (consumer.encoding.fieldType !== "nominal") {
      throw new Error(
        `Color scale materialization requires a nominal encoding on mark "${consumer.layer.id}".`
      );
    }

    return readNominalField(dataset.values, consumer.encoding.field);
  }

  if (consumer.encoding.fieldType !== "quantitative") {
    throw new Error(
      `Scale materialization requires a quantitative encoding on mark "${consumer.layer.id}".`
    );
  }

  return readQuantitativeField(dataset.values, consumer.encoding.field);
}

const createScale = action(
  {
    op: "createScale",
    description: "Create a named semantic scale."
  },
  function (args = {}) {
    validateOptions(args, CREATE_SCALE_OPTIONS, "createScale");
    const id = validateUserId(args.id, "Scale id");
    const type = validateScaleType(args.type ?? "linear");
    const definition = {
      type,
      domain:
        type === "linear"
          ? validateScaleDomain(args.domain ?? "auto")
          : validateOrdinalDomain(args.domain ?? "auto"),
      range:
        type === "linear"
          ? validateScaleRange(args.range ?? "auto")
          : validateColorRange(args.range ?? "auto")
    };
    const existing = this.semanticSpec.scales.find(item => item.id === id);

    if (existing !== undefined) {
      assertEquivalentScale(existing, definition);
      return this;
    }

    return this
      .editSemantic({ property: `scale[${id}].type`, value: definition.type })
      .editSemantic({ property: `scale[${id}].domain`, value: definition.domain })
      .editSemantic({ property: `scale[${id}].range`, value: definition.range });
  }
);

const rematerializeScale = action(
  {
    op: "rematerializeScale",
    description: "Recompute every concrete consumer of a scale."
  },
  function (args = {}) {
    validateOptions(
      args,
      REMATERIALIZE_SCALE_OPTIONS,
      "rematerializeScale"
    );
    const id = validateUserId(args.id, "Scale id");
    const scale = findScale(this, id);
    const consumers = findScaleConsumers(this, id);

    if (consumers.length === 0) {
      throw new Error(`Scale "${id}" has no supported consumers.`);
    }

    const channels = new Set(consumers.map(consumer => consumer.channel));

    if (channels.size !== 1) {
      throw new Error(`Scale "${id}" cannot be shared across channels.`);
    }

    const channel = consumers[0].channel;
    const valuesByConsumer = consumers.map(consumer => ({
      consumer,
      values: resolveConsumerValues(this, consumer)
    }));
    const allValues = valuesByConsumer.flatMap(item => item.values);
    const isColor = channel === "color";
    const domain = isColor
      ? resolveOrdinalDomain(scale.domain, allValues)
      : resolveScaleDomain(scale.domain, allValues);
    const range = isColor
      ? resolveColorRange(scale.range)
      : resolveScaleRange(
          scale.range,
          channel,
          this.context.currentGraphicBounds
        );
    let next = this._withResolvedScale(id, {
      type: isColor
        ? validateOrdinalScaleType(scale.type)
        : validateLinearScaleType(scale.type),
      domain,
      range
    });

    for (const { consumer, values } of valuesByConsumer) {
      next = next.editGraphics({
        target: consumer.layer.id,
        property: isColor ? "fill" : channel,
        value: isColor
          ? mapOrdinalValues(values, domain, range)
          : mapLinearValues(values, domain, range)
      });
    }

    if (next.graphicSpec.objects.xAxisLine && next.semanticSpec.guides.axis?.x?.scale === id) {
      next = next.editXAxisLine();
    }

    if (next.graphicSpec.objects.yAxisLine && next.semanticSpec.guides.axis?.y?.scale === id) {
      next = next.editYAxisLine();
    }

    if (next.guideConfigs.axis?.x?.ticks?.scale === id) next = next.editXAxisTicks();
    if (next.guideConfigs.axis?.y?.ticks?.scale === id) next = next.editYAxisTicks();

    return next;
  }
);

export function registerScaleActions(ProgramClass) {
  ProgramClass.prototype.createScale = createScale;
  ProgramClass.prototype.rematerializeScale = rematerializeScale;
}
