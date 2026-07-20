import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  validateKeys,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateUnitInterval
} from "../../core/validation.js";
import { normalizeRegressionParameters } from "../../grammar/regression/index.js";
import { validateCurveInterpolation } from "../../grammar/curveCommands.js";
import { planDerivedDataRevision } from
  "../../materialization/dataProvenance.js";
import { findLayer } from "../../selectors/layers.js";

const OPTIONS = Object.freeze([
  "target", "method", "degree", "span", "confidence", "interval", "band", "line"
]);
const STATISTICAL_OPTIONS = Object.freeze([
  "method", "degree", "span", "confidence", "interval"
]);
const BAND_OPTIONS = Object.freeze([
  "color", "opacity", "stroke", "strokeWidth", "curve"
]);
const LINE_OPTIONS = Object.freeze(["strokeWidth", "curve"]);

function resolveRegressionOwner(program, requested) {
  const eligible = program.semanticSpec.layers.filter(
    layer => program.markConfigs[layer.id]?.regression !== undefined
  );
  if (requested !== undefined) {
    const id = validateUserId(requested, "Regression owner id");
    const layer = findLayer(program, id);
    if (layer === undefined || !eligible.includes(layer)) {
      throw new Error(`Unknown regression owner "${id}".`);
    }
    return layer;
  }
  const current = findLayer(program, program.context.currentMark);
  if (current !== undefined && eligible.includes(current)) return current;
  if (eligible.length === 1) return eligible[0];
  if (eligible.length === 0) throw new Error("No regression owner is available.");
  throw new Error("Regression owner is ambiguous; provide target.");
}

function requirePatch(value, keys, label) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  validateKeys(value, keys, label);
  return value;
}

function validateBandPatch(value) {
  if (value === false) return false;
  const patch = requirePatch(value, BAND_OPTIONS, "editRegression band");
  if (Object.hasOwn(patch, "color")) {
    validateNonEmptyString(patch.color, "Regression band color");
  }
  if (Object.hasOwn(patch, "opacity")) {
    validateUnitInterval(patch.opacity, "Regression band opacity");
  }
  if (Object.hasOwn(patch, "stroke")) {
    if (patch.stroke !== false) {
      validateNonEmptyString(patch.stroke, "Regression band stroke");
    }
  }
  if (Object.hasOwn(patch, "strokeWidth")) {
    validateNonNegativeFinite(
      patch.strokeWidth,
      "Regression band strokeWidth"
    );
  }
  if (patch.stroke === false && Object.hasOwn(patch, "strokeWidth")) {
    throw new Error(
      "editRegression band cannot set strokeWidth while removing stroke."
    );
  }
  if (Object.hasOwn(patch, "curve")) {
    validateCurveInterpolation(patch.curve);
  }
  return patch;
}

function validateLinePatch(value) {
  const patch = requirePatch(value, LINE_OPTIONS, "editRegression line");
  if (Object.hasOwn(patch, "strokeWidth")) {
    validateNonNegativeFinite(
      patch.strokeWidth,
      "Regression line strokeWidth"
    );
  }
  if (Object.hasOwn(patch, "curve")) {
    validateCurveInterpolation(patch.curve);
  }
  return patch;
}

function resolveParameters(previous, args) {
  const method = args.method ?? previous.method;
  const raw = { method };
  for (const key of ["degree", "span", "confidence", "interval"]) {
    if (Object.hasOwn(args, key)) raw[key] = args[key];
  }
  if (method === previous.method) {
    for (const key of ["degree", "span", "confidence", "interval"]) {
      if (!Object.hasOwn(raw, key) && Object.hasOwn(previous, key)) {
        raw[key] = previous[key];
      }
    }
  } else if (method !== "loess" && previous.method !== "loess") {
    for (const key of ["confidence", "interval"]) {
      if (!Object.hasOwn(raw, key) && Object.hasOwn(previous, key)) {
        raw[key] = previous[key];
      }
    }
  }
  return normalizeRegressionParameters(raw);
}

function removeBand(program, id) {
  return program
    .editSemantic({ property: `layer[${id}]`, remove: true })
    .editGraphics({ target: id, remove: true })
    ._withoutMaterializationConfig(["marks", id]);
}

export const editRegression = action(
  {
    op: "editRegression",
    description: "Revise a regression model and its owned visible components."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, "editRegression");
    if (!OPTIONS.slice(1).some(key => Object.hasOwn(args, key))) {
      throw new Error("editRegression requires a statistical or component option.");
    }
    const owner = resolveRegressionOwner(this, args.target);
    const current = this.markConfigs[owner.id].regression;
    const parameters = resolveParameters(current.parameters, args);
    const changesStatistics = STATISTICAL_OPTIONS.some(
      key => Object.hasOwn(args, key)
    ) && JSON.stringify(parameters) !== JSON.stringify(current.parameters);
    const bandPatch = Object.hasOwn(args, "band")
      ? validateBandPatch(args.band)
      : undefined;
    const linePatch = Object.hasOwn(args, "line")
      ? validateLinePatch(args.line)
      : undefined;
    if (parameters.method === "loess" && bandPatch !== undefined && bandPatch !== false) {
      throw new Error("LOESS regression does not support a band object.");
    }

    const hadBand = current.bandId !== undefined;
    const wantsBand = parameters.method !== "loess" &&
      (bandPatch === false
        ? false
        : hadBand || bandPatch !== undefined || current.parameters.method === "loess");
    let dataId = current.dataId;
    let next = this;
    const revision = changesStatistics
      ? planDerivedDataRevision(this, {
          owner: owner.id,
          role: "RegressionData",
          previous: current.dataId,
          consumers: [
            current.lineId,
            ...(hadBand ? [current.bandId] : [])
          ]
        })
      : undefined;

    if (changesStatistics) {
      dataId = revision.id;
      next = next.createRegressionData({
        id: dataId,
        source: current.source,
        x: current.x,
        y: current.y,
        ...(current.groupBy === undefined ? {} : { groupBy: current.groupBy }),
        ...parameters
      });
      for (const rebind of revision.rebinds) {
        next = next.rebindLayerData(rebind);
      }
    }

    let bandId = current.bandId;
    if (hadBand && !wantsBand) {
      next = removeBand(next, current.bandId);
      bandId = undefined;
    } else if (!hadBand && wantsBand) {
      bandId = `${owner.id}RegressionBands`;
      next = next.createRegressionBand({
        id: bandId,
        data: dataId,
        x: current.x,
        lower: "__regression_ci_lower",
        upper: "__regression_ci_upper",
        ...(current.groupBy === undefined ? {} : { groupBy: current.groupBy }),
        coordinate: current.coordinate,
        xScale: current.xScale,
        yScale: current.yScale,
        ...(bandPatch === undefined || bandPatch === false ? {} : bandPatch)
      });
    } else if (hadBand && changesStatistics) {
      const bandConfig = next.markConfigs[bandId];
      next = next._withMarkConfig(bandId, {
          ...bandConfig,
          errorBand: { ...bandConfig.errorBand, data: dataId }
        });
    }

    if (bandId !== undefined) {
      if (
        bandPatch !== undefined &&
        bandPatch !== false &&
        Object.keys(bandPatch).length > 0 &&
        hadBand
      ) {
        next = next.editRegressionBand({ target: bandId, ...bandPatch });
      } else if (changesStatistics) {
        next = next.rematerializeAreaMark({ id: bandId });
      }
    }
    if (linePatch !== undefined && Object.keys(linePatch).length > 0) {
      next = next.editRegressionLine({ target: current.lineId, ...linePatch });
    } else if (changesStatistics) {
      next = next.rematerializeLineMark({ id: current.lineId });
    }

    if (changesStatistics) {
      next = next.releaseDerivedData(revision.release);
    }
    return next._withMarkConfig(owner.id, {
      ...next.markConfigs[owner.id],
      regression: {
        ...current,
        dataId,
        bandId,
        parameters
      }
    });
  }
);
