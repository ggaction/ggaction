import { validateCalendarBinding } from "../../grammar/calendar/plot.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { normalizeCalendarDefinition } from "../../grammar/calendar/input.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { calendarResult, calendarRowReferences } from "./resources.js";

const same = (a, b) => canonicalJSON(encodeValue(a)) === canonicalJSON(encodeValue(b));
function exact(value, fields, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) throw new TypeError(`${label} requires its exact stored fields.`);
}
function array(value, label) {
  if (Array.isArray(value)) validateGeneratedItemLimit(value.length, label);
  ownArray(value, label);
}

function validateStored(resource) {
  exact(resource.options, ["method", "fields", "options"], "Calendar layout options");
  if (resource.kind !== "layout" || resource.options.method !== "calendar" || resource.inputs.length !== 1 || resource.inputs[0].kind !== "data" ||
      !same(resource.ownership, { mode: "authored" }) || resource.provenance.origin !== "inferred") throw new TypeError("Calendar layout requires one data input and authored ownership.");
  const { fields, options } = resource.options;
  ownRecord(options, "Calendar civil options");
  exact(fields, options.aggregate === "count" ? ["date"] : ["date", "value"], "Calendar fields");
  if (!same(normalizeCalendarDefinition({ ...fields, ...options }), { fields, options })) throw new TypeError("Calendar layout definition must store normalized options.");
  exact(resource.result, ["algorithm", "years", "cells", "months"], "Calendar result");
  if (resource.result.algorithm !== "civil-day-cells@1") throw new TypeError("Calendar algorithm is invalid.");
  for (const key of ["years", "cells", "months"]) array(resource.result[key], `Calendar ${key}`);
  let work = 0;
  for (const year of resource.result.years) exact(year, ["year", "yearIndex", "weeks"], "Calendar year");
  for (const cell of resource.result.cells) {
    exact(cell, ["key", "instant", "year", "month", "day", "yearIndex", "week", "weekday", "value", "sourceIndices"], "Calendar cell");
    array(cell.sourceIndices, "Calendar source indices");
    validateWorkLimit(work += cell.sourceIndices.length, "Stored calendar membership work");
  }
  for (const month of resource.result.months) {
    exact(month, ["key", "year", "month", "yearIndex", "cells", "bounds", "polygons"], "Calendar month");
    exact(month.bounds, ["left", "right", "top", "bottom"], "Calendar month bounds");
    for (const key of ["cells", "polygons"]) array(month[key], `Calendar month ${key}`);
    validateWorkLimit(work += month.cells.length, "Stored calendar membership work");
    for (const polygon of month.polygons) {
      exact(polygon, ["outer", "holes"], "Calendar month polygon"); array(polygon.holes, "Calendar month holes");
      for (const ring of [polygon.outer, ...polygon.holes]) {
        array(ring, "Calendar month ring"); validateWorkLimit(work += ring.length, "Stored calendar boundary work");
        for (const point of ring) {
          array(point, "Calendar month point");
          if (point.length !== 2 || !point.every(Number.isFinite)) throw new TypeError("Calendar month point requires two finite coordinates.");
        }
      }
    }
  }
}

function validateBindings(program, resource) {
  for (const layer of program.semanticSpec.layers) if (layer.calendarBinding?.layout.id === resource.id) {
    if (layer.mark.type !== "calendar" || requireCoordinate(program, layer.coordinate).type !== "cartesian") throw new TypeError("Calendar binding requires its Cartesian mark.");
    validateCalendarBinding(layer, program.materializationConfigs.marks[layer.id]?.calendarPlot);
  }
  const dataset = resolveInputReference(program, resource.inputs[0]);
  if (!same(calendarResult(dataset, resource.options), resource.result) || !same(calendarRowReferences(dataset), resource.provenance.sourceRows)) {
    throw new TypeError("Stored calendar result or source provenance is stale.");
  }
}
export const calendarLayoutResourceHandler = Object.freeze({ validateStored, validateBindings });
