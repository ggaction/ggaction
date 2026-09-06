import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateNonEmptyString, validateOptionObject } from "../../core/validation.js";
import { normalizeGroupFields } from "../../grammar/pathSeries.js";
import {
  applyFacadeGuides,
  normalizeAppearance,
  normalizeCategoricalColor,
  normalizeGuides,
  resolveFacadeData,
  resolveFacadeId,
  targetArgs,
  validateFacadeOptions
} from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "data", "coordinate", "field", "groupBy", "weight", "missing",
  "as", "color", "line", "labels", "guides"
]);
const EDIT_OPTIONS = Object.freeze([
  "target", "data", "coordinate", "field", "groupBy", "weight", "missing", "as", "color"
]);
const LINE_OPTIONS = Object.freeze(["strokeWidth", "stroke", "opacity"]);
const LABEL_OPTIONS = Object.freeze([
  "field", "value", "content", "normalizeBy", "format", "layout", "fill",
  "opacity", "fontSize", "fontFamily", "fontWeight", "align", "baseline",
  "rotation", "dx", "dy"
]);

function normalizeGrouping(value) {
  return value === undefined ? [] : normalizeGroupFields(value);
}

function normalizeLabels(value, operation) {
  if (value === undefined || value === false) return false;
  validateOptionObject(value, LABEL_OPTIONS, `${operation} labels`);
  return { ...value };
}

function normalizeOutputs(value, id, operation) {
  if (value === undefined) {
    return {
      value: `__${id}ECDFData_value`,
      cumulative: `__${id}ECDFData_cumulative`,
      probability: `__${id}ECDFData_probability`
    };
  }
  validateOptionObject(value, ["value", "cumulative", "probability"], `${operation} as`);
  for (const field of ["value", "cumulative", "probability"]) {
    validateNonEmptyString(value[field], `${operation} as.${field}`);
  }
  return { ...value };
}

function resolveOwner(program, requested) {
  const eligible = program.semanticSpec.layers.filter(
    layer => program.markConfigs[layer.id]?.ecdfPlot !== undefined
  );
  if (requested !== undefined) {
    const id = validateUserId(requested, "ECDF-plot owner id");
    const owner = eligible.find(layer => layer.id === id);
    if (owner === undefined) throw new Error(`Unknown ECDF-plot owner "${id}".`);
    return owner;
  }
  const current = eligible.find(layer => layer.id === program.context.currentMark);
  if (current !== undefined) return current;
  if (eligible.length === 1) return eligible[0];
  if (eligible.length === 0) throw new Error("editECDFPlot requires an ECDF plot.");
  throw new Error("editECDFPlot target is ambiguous; provide target.");
}

export const createECDFPlot = action(
  {
    op: "createECDFPlot",
    description: "Create a right-continuous empirical cumulative distribution plot."
  },
  function (args = {}) {
    const operation = "createECDFPlot";
    validateFacadeOptions(args, OPTIONS, operation);
    const id = resolveFacadeId(this, args.id, { defaultId: "ecdfPlot", operation });
    const source = resolveFacadeData(this, args.data, operation);
    validateNonEmptyString(args.field, `${operation} field`);
    if (args.weight !== undefined) validateNonEmptyString(args.weight, `${operation} weight`);
    const groupBy = normalizeGrouping(args.groupBy);
    const as = normalizeOutputs(args.as, id, operation);
    const color = args.color === undefined
      ? undefined
      : normalizeCategoricalColor(args.color, `${operation} color`);
    if (color !== undefined && !groupBy.includes(color.field)) {
      throw new Error(`${operation} color field must be included in groupBy.`);
    }
    const line = normalizeAppearance(args.line, LINE_OPTIONS, `${operation} line`);
    const labels = normalizeLabels(args.labels, operation);
    const guides = normalizeGuides(args.guides, operation);
    const dataId = `${id}ECDFData`;

    let next = this
      .createECDFData({
        id: dataId,
        source,
        field: args.field,
        ...(groupBy.length === 0 ? {} : { groupBy }),
        ...(args.weight === undefined ? {} : { weight: args.weight }),
        ...(args.missing === undefined ? {} : { missing: args.missing }),
        as
      })
      .createLineMark({ id, data: dataId, curve: "step-after", ...line })
      .encodeX({
        target: id,
        field: as.value,
        fieldType: "quantitative",
        scale: { id: `${id}Value`, zero: false, nice: false },
        ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate })
      })
      .encodeY({
        target: id,
        field: as.probability,
        fieldType: "quantitative",
        scale: { id: `${id}Probability`, domain: [0, 1], zero: true, nice: false },
        ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate })
      });
    if (groupBy.length > 0) next = next.encodeGroup({ target: id, fields: groupBy });
    if (color !== undefined) next = next.encodeColor(targetArgs(color, id));
    if (labels !== false) {
      const hasContent = ["field", "value", "content"].some(key => Object.hasOwn(labels, key));
      next = next.createMarkLabels({
        id: `${id}Label`,
        source: id,
        ...labels,
        ...(hasContent ? {} : { field: as.probability })
      });
    }
    next = applyFacadeGuides(next, guides, id, guides);
    return next._withMarkConfig(id, {
      ...next.markConfigs[id],
      ecdfPlot: {
        source,
        data: dataId,
        options: {
          id,
          data: source,
          coordinate: args.coordinate,
          field: args.field,
          ...(groupBy.length === 0 ? {} : { groupBy }),
          ...(args.weight === undefined ? {} : { weight: args.weight }),
          missing: args.missing ?? "drop",
          as,
          ...(color === undefined ? {} : { color }),
          line,
          labels,
          guides
        }
      }
    });
  }
);

export const editECDFPlot = action(
  {
    op: "editECDFPlot",
    description: "Atomically revise an ECDF plot's source or statistical roles."
  },
  function (args = {}) {
    validateFacadeOptions(args, EDIT_OPTIONS, "editECDFPlot");
    const changes = Object.keys(args).filter(key => key !== "target");
    if (changes.length === 0) {
      throw new Error("editECDFPlot requires at least one ECDF option.");
    }
    const owner = resolveOwner(this, args.target);
    const current = this.markConfigs[owner.id].ecdfPlot;
    const revised = { ...current.options };
    for (const key of changes) {
      if (key === "groupBy" && args[key] === false) {
        delete revised.groupBy;
        if (!Object.hasOwn(args, "color")) delete revised.color;
      }
      else if (key === "weight" && args[key] === false) delete revised.weight;
      else if (key === "color" && args[key] === false) delete revised.color;
      else revised[key] = args[key];
    }
    return this.removeMark({ target: owner.id }).createECDFPlot(revised);
  }
);
