import { isPlainObject } from "../core/immutable.js";
import {
  formatVisibleText,
  measureTextWidth,
  resolveTextBounds,
  textBoundsIntersect
} from "../core/textMetrics.js";
import { resolveDisplayLabel } from "../grammar/displayLabels.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from "../theme/defaults.js";

const SIDES = Object.freeze(["top", "right", "bottom", "left"]);
const ZERO_SIDES = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

export function createDefaultFacetHeaders() {
  return {
    mode: "legacy",
    common: {
      fontSize: 12,
      fontFamily: DEFAULT_FONT_FAMILY,
      fontWeight: 600,
      color: DEFAULT_COLORS.strongText,
      offset: 10,
      align: "center"
    },
    row: { side: "left" },
    column: { side: "top" }
  };
}

export function normalizeFacetHeadersConfig(value) {
  if (!isPlainObject(value)) {
    throw new TypeError("Facet headers config must be a plain object.");
  }
  if (value.common === undefined && value.mode === undefined) {
    return {
      ...createDefaultFacetHeaders(),
      common: {
        ...createDefaultFacetHeaders().common,
        ...value
      }
    };
  }
  if (!["legacy", "roles"].includes(value.mode) ||
      !isPlainObject(value.common) || !isPlainObject(value.row) ||
      !isPlainObject(value.column)) {
    throw new Error("Facet headers config must contain canonical mode and role objects.");
  }
  return {
    mode: value.mode,
    common: { ...value.common },
    row: { ...value.row },
    column: { ...value.column }
  };
}

export function resolveFacetHeaderConfig(headers, role) {
  const normalized = normalizeFacetHeadersConfig(headers);
  return role === "all"
    ? { ...normalized.common }
    : { ...normalized.common, ...normalized[role] };
}

function mappedText(value, config) {
  return resolveDisplayLabel(value, config.labelMap, formatVisibleText);
}

function gridCellById(spec) {
  return new Map((spec.facet.grid?.cells ?? []).map(cell => [cell.id, cell]));
}

function legacyDescriptors(program, headers) {
  const spec = program.compositionSpec;
  const config = resolveFacetHeaderConfig(headers, "all");
  const cells = gridCellById(spec);
  return spec.children.map((id, index) => {
    const cell = cells.get(id);
    const text = cell === undefined
      ? mappedText(spec.facet.values[index], config)
      : `${mappedText(cell.rowValue, config)} · ${mappedText(cell.columnValue, config)}`;
    return { topology: "legacy", role: "column", id, text, config };
  });
}

function uniqueGridGroups(spec, role) {
  const coordinate = role === "column" ? "column" : "row";
  const valueKey = role === "column" ? "columnValue" : "rowValue";
  const groups = new Map();
  for (const cell of spec.facet.grid.cells) {
    const existing = groups.get(cell[coordinate]);
    if (existing === undefined) {
      groups.set(cell[coordinate], {
        coordinate: cell[coordinate],
        value: cell[valueKey],
        ids: [cell.id]
      });
    } else {
      if (existing.value !== cell[valueKey]) {
        throw new Error(`Facet ${role} header values conflict at coordinate ${cell[coordinate]}.`);
      }
      existing.ids.push(cell.id);
    }
  }
  return [...groups.values()].sort((left, right) =>
    left.coordinate - right.coordinate
  );
}

function roleDescriptors(program, headers) {
  const spec = program.compositionSpec;
  const column = resolveFacetHeaderConfig(headers, "column");
  if (spec.facet.grid === undefined) {
    return spec.children.map((id, index) => ({
      topology: "cell-column",
      role: "column",
      id,
      ids: [id],
      row: Math.floor(index / spec.columns),
      column: index % spec.columns,
      text: mappedText(spec.facet.values[index], column),
      config: column
    }));
  }
  const row = resolveFacetHeaderConfig(headers, "row");
  const columns = uniqueGridGroups(spec, "column").map(group => ({
    topology: "grid-column",
    role: "column",
    ids: group.ids,
    coordinate: group.coordinate,
    text: mappedText(group.value, column),
    config: column
  }));
  const rows = uniqueGridGroups(spec, "row").map(group => ({
    topology: "grid-row",
    role: "row",
    ids: group.ids,
    coordinate: group.coordinate,
    text: mappedText(group.value, row),
    config: row
  }));
  return [...columns, ...rows];
}

function laneThickness(descriptors, role, profile) {
  const visible = descriptors.filter(item => item.role === role && item.text !== "");
  if (visible.length === 0) return 0;
  if (role === "column") {
    return Math.max(...visible.map(item => item.config.fontSize + item.config.offset));
  }
  return Math.max(...visible.map(item => measureTextWidth(item.text, item.config, profile) +
    item.config.offset));
}

export function prepareFacetHeaders(program, headersConfig) {
  const headers = normalizeFacetHeadersConfig(headersConfig);
  const descriptors = headers.mode === "legacy"
    ? legacyDescriptors(program, headers)
    : roleDescriptors(program, headers);
  const rows = program.compositionSpec.facet.grid === undefined
    ? Math.ceil(program.compositionSpec.children.length / program.compositionSpec.columns)
    : Math.max(...program.compositionSpec.facet.grid.cells.map(cell => cell.row)) + 1;
  const headerLayout = {
    outer: { ...ZERO_SIDES },
    cellRows: { top: Array(rows).fill(0), bottom: Array(rows).fill(0) }
  };
  if (headers.mode === "legacy" && program.compositionSpec.spacing === "plot") {
    for (const descriptor of descriptors) {
      if (descriptor.text === "") continue;
      const index = program.compositionSpec.children.indexOf(descriptor.id);
      const row = program.compositionSpec.facet.grid?.cells[index]?.row ?? Math.floor(index / program.compositionSpec.columns);
      headerLayout.cellRows.top[row] = Math.max(headerLayout.cellRows.top[row], descriptor.config.offset + descriptor.config.fontSize);
    }
  }
  if (headers.mode === "roles") {
    const column = resolveFacetHeaderConfig(headers, "column");
    const columnThickness = laneThickness(descriptors, "column", program.materializationConfigs.textMetrics);
    if (program.compositionSpec.facet.grid === undefined) {
      const side = ["left", "right"].includes(column.side);
      if (side) {
        headerLayout.cellColumns = {
          left: Array(program.compositionSpec.columns).fill(0),
          right: Array(program.compositionSpec.columns).fill(0)
        };
      }
      for (const descriptor of descriptors) {
        if (descriptor.text !== "") {
          const reservations = side ? headerLayout.cellColumns : headerLayout.cellRows;
          const index = side ? descriptor.column : descriptor.row;
          const thickness = side
            ? measureTextWidth(descriptor.text, descriptor.config, program.materializationConfigs.textMetrics)
            : descriptor.config.fontSize;
          reservations[column.side][index] = Math.max(
            reservations[column.side][index], thickness + descriptor.config.offset
          );
        }
      }
    } else {
      headerLayout.outer[column.side] = columnThickness;
      const row = resolveFacetHeaderConfig(headers, "row");
      headerLayout.outer[row.side] = laneThickness(descriptors, "row", program.materializationConfigs.textMetrics);
    }
  }
  return { headers, descriptors, headerLayout };
}

function horizontalAnchor(bounds, align) {
  if (align === "start") return { x: bounds.left, textAlign: "left" };
  if (align === "end") return { x: bounds.right, textAlign: "right" };
  return { x: (bounds.left + bounds.right) / 2, textAlign: "center" };
}

function verticalAnchor(bounds, align) {
  if (align === "start") return { y: bounds.top, textBaseline: "top" };
  if (align === "end") return { y: bounds.bottom, textBaseline: "bottom" };
  return { y: (bounds.top + bounds.bottom) / 2, textBaseline: "middle" };
}

function union(items) {
  return {
    left: Math.min(...items.map(item => item.left)),
    right: Math.max(...items.map(item => item.right)),
    top: Math.min(...items.map(item => item.top)),
    bottom: Math.max(...items.map(item => item.bottom))
  };
}

function placedPlot(cell, plot) {
  return {
    left: cell.x + plot.x,
    right: cell.x + plot.x + plot.width,
    top: cell.y + plot.y,
    bottom: cell.y + plot.y + plot.height
  };
}

function placedCell(cell) {
  return {
    left: cell.x,
    right: cell.x + cell.width,
    top: cell.y,
    bottom: cell.y + cell.height
  };
}

function roleItem(descriptor, cells, plots, spacing) {
  const selectedCells = descriptor.ids.map(id => cells.get(id));
  const missingCell = descriptor.ids.find((id, index) =>
    selectedCells[index] === undefined
  );
  const missingPlot = descriptor.ids.find(id => plots.get(id) === undefined);
  if (missingCell !== undefined || missingPlot !== undefined) {
    throw new Error(
      `Facet header requires cell and plot bounds for "${missingCell ?? missingPlot}".`
    );
  }
  const selectedPlots = descriptor.ids.map((id, index) =>
    placedPlot(selectedCells[index], plots.get(id))
  );
  const plot = union(selectedPlots);
  const snapshots = spacing === "plot" ? plot : union(selectedCells.map(placedCell));
  const config = descriptor.config;
  let anchor;
  if (["top", "bottom"].includes(config.side)) {
    anchor = horizontalAnchor(plot, config.align);
    const top = config.side === "top";
    anchor.y = top
      ? snapshots.top - config.offset - config.fontSize / 2
      : snapshots.bottom + config.offset + config.fontSize / 2;
    anchor.textBaseline = "middle";
  } else {
    anchor = verticalAnchor(plot, config.align);
    const left = config.side === "left";
    anchor.x = left
      ? snapshots.left - config.offset
      : snapshots.right + config.offset;
    anchor.textAlign = left ? "right" : "left";
  }
  return { descriptor, snapshots, properties: anchor };
}

function legacyItem(descriptor, cell, plot, spacing) {
  if (cell === undefined || plot === undefined) {
    throw new Error(`Facet header requires cell and plot bounds for "${descriptor.id}".`);
  }
  return {
    descriptor,
    snapshots: placedCell(cell),
    properties: {
      ...horizontalAnchor(placedPlot(cell, plot), descriptor.config.align),
      y: spacing === "plot" ? cell.y + plot.y - descriptor.config.offset - descriptor.config.fontSize / 2 : cell.y + descriptor.config.offset,
      textBaseline: "middle"
    }
  };
}

function styledItem(item) {
  const { config } = item.descriptor;
  return {
    type: "text",
    properties: {
      ...item.properties,
      text: item.descriptor.text,
      fill: config.color,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight
    }
  };
}

function assertRoleHeadersFit(records, items, layout, profile, plots) {
  const bounds = items.map((item, index) => records[index].descriptor.text === ""
    ? undefined
    : resolveTextBounds(item.properties, profile));
  for (const [index, current] of bounds.entries()) {
    if (current === undefined) continue;
    if (current.left < -1e-9 || current.right > layout.width + 1e-9 ||
        current.top < -1e-9 || current.bottom > layout.height + 1e-9 ||
        bounds.some((other, otherIndex) => otherIndex < index &&
          other !== undefined && textBoundsIntersect(other, current)) ||
        layout.children.some(cell => textBoundsIntersect(current, layout.spacing === "plot" ? placedPlot(cell, plots.get(cell.id)) : placedCell(cell)))) {
      throw new Error(
        "Facet role headers require sufficient non-overlapping reserved space."
      );
    }
  }
}

function assertLegacyHeadersFit(items, layout, plotById, profile) {
  const previous = [];
  for (let index = 0; index < items.length; index += 1) {
    if (items[index].properties.text === "") continue;
    const bounds = resolveTextBounds(items[index].properties, profile);
    const cell = layout.children[index];
    const plot = plotById.get(cell.id);
    if (bounds.left < 0 || bounds.right > layout.width ||
      bounds.top < 0 || bounds.bottom > layout.height ||
      previous.some(item => textBoundsIntersect(item, bounds)) ||
      (layout.spacing === "plot" ? layout.children.some(other => textBoundsIntersect(bounds, placedPlot(other, plotById.get(other.id)))) : textBoundsIntersect(bounds, placedPlot(cell, plot)))) {
      throw new Error(
        "Facet headers require sufficient non-overlapping space above every child plot."
      );
    }
    previous.push(bounds);
  }
}

export function materializeFacetHeaders(program, layout, plots, prepared) {
  const profile = program.materializationConfigs.textMetrics;
  const cells = new Map(layout.children.map(cell => [cell.id, cell]));
  const plotById = new Map(plots.map(plot => [plot.id, plot]));
  const records = prepared.descriptors.map(descriptor => {
    if (descriptor.topology === "legacy") {
      return legacyItem(descriptor, cells.get(descriptor.id), plotById.get(descriptor.id), layout.spacing);
    }
    return roleItem(descriptor, cells, plotById, layout.spacing);
  });
  const items = records.map(styledItem);
  if (prepared.headers.mode === "legacy") {
    assertLegacyHeadersFit(items, layout, plotById, profile);
  } else {
    assertRoleHeadersFit(records, items, layout, profile, plotById);
  }
  const id = `${program.compositionSpec.id}-headers`;
  return program
    .createGraphics({ id, type: "collection", parent: "canvas" })
    .editGraphics({ target: id, property: "items", value: items });
}
