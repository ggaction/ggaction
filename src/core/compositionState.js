import { isPlainObject } from "./immutable.js";
import { ownProgramState } from "./programState.js";
import {
  FACET_SCALE_CHANNELS,
  FACET_SCALE_RESOLUTIONS
} from "./vocabulary.js";

function validateFacetSpec(compositionSpec) {
  if (compositionSpec.direction !== undefined) {
    throw new Error("Facet compositionSpec does not use direction.");
  }
  if (
    !Number.isInteger(compositionSpec.columns) ||
    compositionSpec.columns <= 0
  ) {
    throw new RangeError(
      "Facet compositionSpec.columns must be a positive integer."
    );
  }
  if (!isPlainObject(compositionSpec.facet)) {
    throw new TypeError("Facet compositionSpec.facet must be a plain object.");
  }
  const facetKeys = ["data", "field", "values", "grid", "repeat", "scales", "guides"];
  const unknownFacet = Object.keys(compositionSpec.facet).find(
    key => !facetKeys.includes(key)
  );
  if (unknownFacet !== undefined) {
    throw new Error(`Unknown compositionSpec.facet property "${unknownFacet}".`);
  }
  for (const property of ["data"]) {
    if (
      typeof compositionSpec.facet[property] !== "string" ||
      compositionSpec.facet[property].length === 0
    ) {
      throw new TypeError(`compositionSpec.facet.${property} must be a non-empty string.`);
    }
  }
  const grid = compositionSpec.facet.grid;
  const repeat = compositionSpec.facet.repeat;
  if (grid !== undefined && repeat !== undefined) {
    throw new Error("Facet compositionSpec cannot combine grid and repeat recipes.");
  }
  if (grid === undefined && repeat === undefined) {
    if (compositionSpec.columns > compositionSpec.children.length) {
      throw new RangeError(
        "Facet compositionSpec.columns must be no larger than its children."
      );
    }
    if (
      typeof compositionSpec.facet.field !== "string" ||
      compositionSpec.facet.field.length === 0
    ) {
      throw new TypeError("compositionSpec.facet.field must be a non-empty string.");
    }
  } else if (grid !== undefined) {
    if (compositionSpec.columns !== grid.columns?.values?.length) {
      throw new RangeError(
        "Grid facet compositionSpec.columns must match its column domain."
      );
    }
    if (compositionSpec.facet.field !== undefined) {
      throw new Error("Grid facet compositionSpec does not use facet.field.");
    }
    if (!isPlainObject(grid)) {
      throw new TypeError("compositionSpec.facet.grid must be a plain object.");
    }
    const gridKeys = ["rows", "columns", "combinations", "cells"];
    const unknownGrid = Object.keys(grid).find(key => !gridKeys.includes(key));
    if (unknownGrid !== undefined) {
      throw new Error(`Unknown compositionSpec.facet.grid property "${unknownGrid}".`);
    }
    for (const role of ["rows", "columns"]) {
      const value = grid[role];
      if (!isPlainObject(value) || Object.keys(value).some(
        key => !["field", "values"].includes(key)
      )) {
        throw new TypeError(
          `compositionSpec.facet.grid.${role} requires field and values.`
        );
      }
      if (typeof value.field !== "string" || value.field.length === 0) {
        throw new TypeError(
          `compositionSpec.facet.grid.${role}.field must be a non-empty string.`
        );
      }
      if (
        !Array.isArray(value.values) || value.values.length === 0 ||
        value.values.some(item => !(
          typeof item === "string" || typeof item === "boolean" ||
          (typeof item === "number" && Number.isFinite(item))
        )) || new Set(value.values).size !== value.values.length
      ) {
        throw new TypeError(
          `compositionSpec.facet.grid.${role}.values must contain unique scalars.`
        );
      }
    }
    if (grid.rows.field === grid.columns.field) {
      throw new Error("compositionSpec.facet.grid fields must be different.");
    }
    if (!["observed", "full"].includes(grid.combinations)) {
      throw new Error(
        'compositionSpec.facet.grid.combinations must be "observed" or "full".'
      );
    }
    if (!Array.isArray(grid.cells) || grid.cells.length !== compositionSpec.children.length) {
      throw new TypeError(
        "compositionSpec.facet.grid.cells must contain one descriptor per child."
      );
    }
    const cellKeys = ["id", "row", "column", "rowValue", "columnValue", "empty"];
    const coordinates = new Set();
    for (const cell of grid.cells) {
      if (!isPlainObject(cell) || Object.keys(cell).some(key => !cellKeys.includes(key))) {
        throw new TypeError("compositionSpec.facet.grid cells must be canonical objects.");
      }
      if (!compositionSpec.children.includes(cell.id)) {
        throw new Error(`Unknown grid facet child "${cell.id}".`);
      }
      if (!Number.isInteger(cell.row) || cell.row < 0 || cell.row >= grid.rows.values.length ||
          !Number.isInteger(cell.column) || cell.column < 0 || cell.column >= grid.columns.values.length) {
        throw new RangeError("Grid facet cell coordinates must be inside their domains.");
      }
      if (cell.rowValue !== grid.rows.values[cell.row] ||
          cell.columnValue !== grid.columns.values[cell.column]) {
        throw new Error("Grid facet cell values must match their row and column coordinates.");
      }
      if (typeof cell.empty !== "boolean") {
        throw new TypeError("Grid facet cell empty must be a boolean.");
      }
      const key = `${cell.row}:${cell.column}`;
      if (coordinates.has(key)) {
        throw new Error("Grid facet cells must occupy unique coordinates.");
      }
      coordinates.add(key);
    }
  } else {
    if (compositionSpec.facet.field !== undefined) {
      throw new Error("Repeat compositionSpec does not use facet.field.");
    }
    if (compositionSpec.columns > compositionSpec.children.length) {
      throw new RangeError(
        "Repeat compositionSpec.columns must be no larger than its children."
      );
    }
    if (!isPlainObject(repeat) || Object.keys(repeat).some(
      key => !["target", "channel", "fields"].includes(key)
    )) {
      throw new TypeError(
        "compositionSpec.facet.repeat requires target, channel, and fields."
      );
    }
    if (typeof repeat.target !== "string" || repeat.target.length === 0 ||
        !["x", "y"].includes(repeat.channel) ||
        !Array.isArray(repeat.fields) || repeat.fields.length === 0 ||
        repeat.fields.some(field => typeof field !== "string" || field.length === 0) ||
        new Set(repeat.fields).size !== repeat.fields.length) {
      throw new TypeError("compositionSpec.facet.repeat is not canonical.");
    }
  }
  const values = compositionSpec.facet.values;
  if (
    !Array.isArray(values) ||
    values.length !== compositionSpec.children.length ||
    values.some(value => !(
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    )) ||
    (grid === undefined && new Set(values).size !== values.length)
  ) {
    throw new TypeError(
      "compositionSpec.facet.values must contain one unique scalar per child."
    );
  }
  if (repeat !== undefined && (
    values.length !== repeat.fields.length ||
    values.some((value, index) => value !== repeat.fields[index])
  )) {
    throw new Error("compositionSpec.facet.values must match repeat fields.");
  }
  const scales = compositionSpec.facet.scales;
  if (
    !isPlainObject(scales) ||
    Object.keys(scales).length !== FACET_SCALE_CHANNELS.length ||
    FACET_SCALE_CHANNELS.some(channel =>
      !FACET_SCALE_RESOLUTIONS.includes(scales[channel])
    ) ||
    Object.keys(scales).some(channel => !FACET_SCALE_CHANNELS.includes(channel))
  ) {
    throw new Error(
      "compositionSpec.facet.scales requires one shared or independent policy per supported channel."
    );
  }
  const guides = compositionSpec.facet.guides;
  if (
    !isPlainObject(guides) ||
    Object.keys(guides).some(key => !["axes", "legend"].includes(key)) ||
    !["each", "outer"].includes(guides.axes) ||
    ![false, "shared"].includes(guides.legend)
  ) {
    throw new Error(
      'compositionSpec.facet.guides requires axes "each" or "outer" and legend false or "shared".'
    );
  }
}

function validateCompositionChildren(compositionSpec, childIds, facet) {
  if (
    !Array.isArray(compositionSpec.children) ||
    compositionSpec.children.length < 1 ||
    !compositionSpec.children.every(id => typeof id === "string" && id.length > 0)
  ) {
    throw new TypeError(
      facet
        ? "Facet compositionSpec.children requires at least one child ID."
        : "compositionSpec.children requires at least one child ID."
    );
  }
  if (new Set(compositionSpec.children).size !== compositionSpec.children.length) {
    throw new Error("compositionSpec.children must not contain duplicate IDs.");
  }
  if (
    compositionSpec.children.length !== childIds.length ||
    compositionSpec.children.some(id => !childIds.includes(id))
  ) {
    throw new Error("compositionSpec.children must match ChartProgram children exactly.");
  }
}

function validateLayout(compositionSpec) {
  if (!Number.isFinite(compositionSpec.gap) || compositionSpec.gap < 0) {
    throw new RangeError("compositionSpec.gap must be a non-negative finite number.");
  }
  if (!["start", "center", "end"].includes(compositionSpec.align)) {
    throw new Error("compositionSpec.align must be start, center, or end.");
  }
  if (!isPlainObject(compositionSpec.padding)) {
    throw new TypeError("compositionSpec.padding must be a plain object.");
  }
  for (const side of ["top", "right", "bottom", "left"]) {
    if (!Number.isFinite(compositionSpec.padding[side]) || compositionSpec.padding[side] < 0) {
      throw new RangeError(
        `compositionSpec.padding.${side} must be a non-negative finite number.`
      );
    }
  }
  const paddingKeys = Object.keys(compositionSpec.padding);
  if (
    paddingKeys.length !== 4 ||
    paddingKeys.some(key => !["top", "right", "bottom", "left"].includes(key))
  ) {
    throw new Error("compositionSpec.padding must contain exactly four sides.");
  }
}

export function ownCompositionSpec(compositionSpec, children) {
  const childIds = Object.keys(children);
  if (compositionSpec === undefined) {
    if (childIds.length > 0) {
      throw new Error("ChartProgram children require a compositionSpec.");
    }
    return undefined;
  }
  if (!isPlainObject(compositionSpec)) {
    throw new TypeError("ChartProgram compositionSpec must be a plain object.");
  }
  const allowed = [
    "id", "type", "direction", "children", "columns", "gap", "align",
    "padding", "facet"
  ];
  const unknown = Object.keys(compositionSpec).find(key => !allowed.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown compositionSpec property "${unknown}".`);
  }
  if (typeof compositionSpec.id !== "string" || compositionSpec.id.length === 0) {
    throw new TypeError("compositionSpec.id must be a non-empty string.");
  }
  const facet = compositionSpec.type === "facet";
  if (compositionSpec.type !== undefined && !facet) {
    throw new Error(`Unknown compositionSpec type "${compositionSpec.type}".`);
  }
  if (!facet && !["horizontal", "vertical"].includes(compositionSpec.direction)) {
    throw new Error("compositionSpec.direction must be horizontal or vertical.");
  }
  validateCompositionChildren(compositionSpec, childIds, facet);
  if (facet) {
    validateFacetSpec(compositionSpec);
  } else if (
    compositionSpec.columns !== undefined ||
    compositionSpec.facet !== undefined
  ) {
    throw new Error("Concat compositionSpec does not accept facet properties.");
  }
  validateLayout(compositionSpec);
  return ownProgramState(compositionSpec);
}
