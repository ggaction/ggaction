import { action } from "../core/action.js";
import {
  countHistogramBins,
  resolveHistogramBins
} from "../core/histogram.js";
import { validateUserId } from "../core/identifiers.js";
import { deriveLineSeries } from "../core/lineSeries.js";
import {
  mapLinearValues,
  mapOrdinalValues,
  readNominalField,
  readQuantitativeField,
  readTemporalField,
  resolveColorRange,
  resolveContinuousDomain,
  resolveOrdinalDomain,
  resolveScaleRange,
  resolveStrokeDashRange,
  validateScaleDomain,
  validateScaleRange,
  validateScaleType,
  validateOrdinalDomain,
  validateOrdinalRange,
  validateLinearScaleType,
  validateTimeScaleType,
  validateOrdinalScaleType
} from "../core/scale.js";

const CREATE_SCALE_OPTIONS = Object.freeze([
  "id",
  "type",
  "domain",
  "range",
  "nice",
  "zero"
]);
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

  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every(
      (value, index) => sameScaleSetting(value, right[index])
    );
  }

  if (!Array.isArray(left) && !Array.isArray(right)) {
    return left?.palette !== undefined && left.palette === right?.palette;
  }

  return false;
}

function assertEquivalentScale(existing, expected) {
  if (
    existing.type !== expected.type ||
    !sameScaleSetting(existing.domain, expected.domain) ||
    !sameScaleSetting(existing.range, expected.range) ||
    existing.nice !== expected.nice ||
    existing.zero !== expected.zero
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
    for (const channel of ["x", "y", "color", "strokeDash"]) {
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

  if (consumer.channel === "color" || consumer.channel === "strokeDash") {
    if (
      consumer.channel === "strokeDash" &&
      consumer.layer.mark?.type !== "line"
    ) {
      throw new Error("strokeDash scale materialization currently requires a line mark.");
    }

    if (consumer.encoding.fieldType !== "nominal") {
      throw new Error(
        `${consumer.channel} scale materialization requires a nominal encoding on mark "${consumer.layer.id}".`
      );
    }

    return readNominalField(dataset.values, consumer.encoding.field);
  }

  if (
    consumer.layer.mark?.type === "line" &&
    consumer.layer.encoding?.y?.aggregate === "mean"
  ) {
    const derived = deriveLineSeries(dataset.values, consumer.layer);
    return consumer.channel === "x" ? derived.xValues : derived.yValues;
  }

  if (consumer.encoding.fieldType === "temporal") {
    return readTemporalField(dataset.values, consumer.encoding.field);
  }

  if (consumer.encoding.fieldType !== "quantitative") {
    throw new Error(
      `Scale materialization requires a quantitative encoding on mark "${consumer.layer.id}".`
    );
  }

  return readQuantitativeField(dataset.values, consumer.encoding.field);
}

function resolveHistogramCountValues(program, consumer) {
  const xEncoding = consumer.layer.encoding?.x;
  const xScale = xEncoding?.scale === undefined
    ? undefined
    : findScale(program, xEncoding.scale);
  const dataset = program.semanticSpec.datasets.find(
    item => item.id === consumer.layer.data
  );

  if (xEncoding?.bin === undefined || xScale === undefined) {
    throw new Error(
      `Histogram mark "${consumer.layer.id}" requires a binned x scale.`
    );
  }
  if (dataset === undefined) {
    throw new Error(
      `Histogram mark "${consumer.layer.id}" requires an existing dataset.`
    );
  }

  const xValues = readQuantitativeField(dataset.values, xEncoding.field);
  const bins = resolveHistogramBins({
    values: xValues,
    maxBins: xEncoding.bin.maxBins,
    domain: xScale.domain,
    nice: xScale.nice ?? true,
    zero: xScale.zero ?? false
  });
  return countHistogramBins(xValues, bins.boundaries);
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
        type !== "ordinal"
          ? validateScaleDomain(args.domain ?? "auto")
          : validateOrdinalDomain(args.domain ?? "auto"),
      range:
        type !== "ordinal"
          ? validateScaleRange(args.range ?? "auto")
          : validateOrdinalRange(args.range ?? "auto")
    };

    if (args.nice !== undefined) {
      if (typeof args.nice !== "boolean") {
        throw new TypeError("Scale nice must be a boolean.");
      }
      if (type === "ordinal") {
        throw new Error('Scale type "ordinal" does not support nice.');
      }
      definition.nice = args.nice;
    }

    if (args.zero !== undefined) {
      if (typeof args.zero !== "boolean") {
        throw new TypeError("Scale zero must be a boolean.");
      }
      if (type !== "linear") {
        throw new Error(`Scale type "${type}" does not support zero.`);
      }
      definition.zero = args.zero;
    }
    const existing = this.semanticSpec.scales.find(item => item.id === id);

    if (existing !== undefined) {
      assertEquivalentScale(existing, definition);
      return this;
    }

    let next = this
      .editSemantic({ property: `scale[${id}].type`, value: definition.type })
      .editSemantic({ property: `scale[${id}].domain`, value: definition.domain })
      .editSemantic({ property: `scale[${id}].range`, value: definition.range });

    if (definition.nice !== undefined) {
      next = next.editSemantic({
        property: `scale[${id}].nice`,
        value: definition.nice
      });
    }

    if (definition.zero !== undefined) {
      next = next.editSemantic({
        property: `scale[${id}].zero`,
        value: definition.zero
      });
    }

    return next;
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
    const isOrdinal = channel === "color" || channel === "strokeDash";
    const binnedBars = valuesByConsumer.filter(
      ({ consumer }) =>
        consumer.layer.mark?.type === "bar" &&
        consumer.encoding.bin !== undefined
    );
    const countBars = valuesByConsumer.filter(
      ({ consumer }) =>
        consumer.layer.mark?.type === "bar" &&
        consumer.channel === "y" &&
        consumer.encoding.aggregate === "count" &&
        consumer.encoding.stack === "zero"
    );
    let domain;

    if (binnedBars.length > 0) {
      if (channel !== "x" || binnedBars.length !== valuesByConsumer.length) {
        throw new Error(
          `Binned scale "${id}" cannot be shared with an unbinned consumer.`
        );
      }
      const maxBins = new Set(
        binnedBars.map(({ consumer }) => consumer.encoding.bin.maxBins)
      );
      if (maxBins.size !== 1) {
        throw new Error(
          `Binned scale "${id}" requires one shared maxBins value.`
        );
      }
      domain = resolveHistogramBins({
        values: allValues,
        maxBins: [...maxBins][0],
        domain: scale.domain,
        nice: scale.nice ?? true,
        zero: scale.zero ?? false
      }).domain;
    } else if (countBars.length > 0) {
      if (channel !== "y" || countBars.length !== valuesByConsumer.length) {
        throw new Error(
          `Histogram count scale "${id}" cannot be shared with another policy.`
        );
      }
      const counts = countBars.flatMap(({ consumer }) =>
        resolveHistogramCountValues(this, consumer)
      );
      domain = resolveContinuousDomain({
        domain: scale.domain,
        values: counts,
        type: scale.type,
        nice: scale.nice,
        zero: scale.zero
      });
    } else {
      domain = isOrdinal
        ? resolveOrdinalDomain(scale.domain, allValues)
        : resolveContinuousDomain({
            domain: scale.domain,
            values: allValues,
            type: scale.type,
            nice: scale.nice,
            zero: scale.zero
          });
    }
    let range;

    if (channel === "color") {
      range = resolveColorRange(scale.range);
    } else if (channel === "strokeDash") {
      range = resolveStrokeDashRange(scale.range);
    } else {
      range = resolveScaleRange(
        scale.range,
        channel,
        this.context.currentGraphicBounds
      );
    }
    let next = this._withResolvedScale(id, {
      type: isOrdinal
        ? validateOrdinalScaleType(scale.type)
        : scale.type === "time"
          ? validateTimeScaleType(scale.type)
          : validateLinearScaleType(scale.type),
      domain,
      range
    });

    for (const { consumer, values } of valuesByConsumer) {
      if (
        consumer.layer.mark?.type === "line" ||
        (consumer.layer.mark?.type === "bar" &&
          (consumer.encoding.bin !== undefined ||
            consumer.encoding.aggregate === "count"))
      ) {
        continue;
      }

      next = next.editGraphics({
        target: consumer.layer.id,
        property: channel === "color" ? "fill" : channel,
        value: isOrdinal
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
    if (next.guideConfigs.axis?.x?.labels?.scale === id) next = next.editXAxisLabels();
    if (next.guideConfigs.axis?.y?.labels?.scale === id) next = next.editYAxisLabels();
    if (next.guideConfigs.axis?.x?.title?.scale === id) next = next.editXAxisTitle();
    if (next.guideConfigs.axis?.y?.title?.scale === id) next = next.editYAxisTitle();

    return next;
  }
);

export function registerScaleActions(ProgramClass) {
  ProgramClass.prototype.createScale = createScale;
  ProgramClass.prototype.rematerializeScale = rematerializeScale;
}
