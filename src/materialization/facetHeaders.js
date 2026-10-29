import { bindTextFontProperties } from "./textFont.js";
import { resolveLegendTitleText } from "../layout/legendText.js";
import { measureFacetContentChildren } from "./facetContentBounds.js";
import { facetAxisMode, hasOuterFacetAxes } from "../core/facetAxisPolicy.js";
import { isPlainObject } from "../core/immutable.js";
import {
  formatVisibleText,
  measureTextWidth,
  resolveTextBounds,
  textBoundsIntersect
} from "../core/textMetrics.js";
import { validateFacetHeaderRotations } from "../grammar/facetHeaders.js";
import { resolveDisplayLabel } from "../grammar/displayLabels.js";
import { resolveGraphicBounds } from "../layout/canvas.js";
import { unionConcreteGraphicBounds } from "../grammar/schemas/graphicBounds.js";
import { intersectClipBounds } from "../grammar/schemas/graphicClip.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from "../theme/defaults.js";
import { prepareFacetHeaderTitles } from "../layout/facetHeaderTitles.js";
import { cartesianAxisOwners, axisGraphicIds } from "../selectors/axes.js";
import { resolveFacetOuterSides } from "../grammar/facets/guides.js";
import { resolveConcreteGraphicBounds } from "../grammar/schemas/graphicBounds.js";
import { allLegendGraphicIds } from "./guides/resources.js";

const SIDES = Object.freeze(["top", "right", "bottom", "left"]);
const ZERO_SIDES = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

export function facetHeaderGraphicId(facetId) {
  return `${facetId}-headers`;
}

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
  validateFacetHeaderRotations(value);
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
    return { topology: "legacy", role: "column", id, text, config, value: cell === undefined ? spec.facet.values[index] : undefined };
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
      value: spec.facet.values[index],
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
    value: group.value,
    text: mappedText(group.value, column),
    config: column
  }));
  const rows = uniqueGridGroups(spec, "row").map(group => ({
    topology: "grid-row",
    role: "row",
    ids: group.ids,
    coordinate: group.coordinate,
    value: group.value,
    text: mappedText(group.value, row),
    config: row
  }));
  return [...columns, ...rows];
}

function hasRotation(config) {
  return config.rotation !== undefined && config.rotation !== 0;
}

function rotatedBounds(descriptor, profile) {
  return resolveTextBounds({
    x: 0, y: 0, text: descriptor.text,
    lines: resolveLegendTitleText(descriptor.text, descriptor.config, profile).lines,
    ...descriptor.config, textAlign: "center", textBaseline: "middle"
  }, profile);
}

function headerThickness(descriptor, side, profile) {
  if (hasRotation(descriptor.config)) {
    const bounds = rotatedBounds(descriptor, profile);
    return ["left", "right"].includes(side)
      ? bounds.right - bounds.left : bounds.bottom - bounds.top;
  }
  return ["left", "right"].includes(side)
    ? resolveLegendTitleText(descriptor.text, descriptor.config, profile).width
    : descriptor.text.includes("\n") ? resolveLegendTitleText(descriptor.text, descriptor.config, profile).height : descriptor.config.fontSize;
}

function plotMarginSpace(program) {
  const space = { ...ZERO_SIDES };
  if (!["plot", "content"].includes(program.compositionSpec.spacing)) return space;
  for (const id of program.compositionSpec.children) {
    const child = program.children[id], plot = resolveGraphicBounds(child);
    const canvas = child.graphicSpec.objects.canvas.properties;
    space.left = Math.max(space.left, plot.x);
    space.top = Math.max(space.top, plot.y);
    space.right = Math.max(space.right, canvas.width - plot.x - plot.width);
    space.bottom = Math.max(space.bottom, canvas.height - plot.y - plot.height);
  }
  return space;
}

function headerReservation(descriptor, side, profile, space, outer) {
  const amount = headerThickness(descriptor, side, profile) + descriptor.config.offset +
    (descriptor.clearance?.[side] ?? 0);
  return hasRotation(descriptor.config) && outer
    ? Math.max(0, amount - space[side]) : amount;
}

function prepareContentBounds(program, descriptors, profile) {
  if (!descriptors.some(item => ["content", "view"].includes(item.config.anchor))) return undefined;
  if (!["plot", "content"].includes(program.compositionSpec.spacing)) {
    throw new Error("Facet header content anchor requires plot spacing or content spacing.");
  }
  const boundsById = new Map();
  const views = descriptors.some(item => item.config.anchor === "view")
    ? new Map(measureFacetContentChildren(program).map(child => [child.id, child])) : undefined;
  for (const id of program.compositionSpec.children) {
    const child = program.children[id], plot = resolveGraphicBounds(child);
    const bounds = { left: plot.x, right: plot.x + plot.width,
      top: plot.y, bottom: plot.y + plot.height };
    const owners = child.semanticSpec.layers.map(layer => layer.id)
      .filter(owner => child.graphicSpec.objects[owner] !== undefined);
    const marks = unionConcreteGraphicBounds(child.graphicSpec, owners, profile);
    const canvas = child.graphicSpec.objects.canvas.properties;
    const clipped = marks === undefined ? undefined : intersectClipBounds(marks,
      { left: 0, right: canvas.width, top: 0, bottom: canvas.height });
    boundsById.set(id, clipped === undefined || clipped.left > clipped.right || clipped.top > clipped.bottom
      ? bounds : union([bounds, clipped]));
  }
  const viewById = views === undefined ? undefined : new Map([...views].map(([id, item]) => [id, {
    left: item.bounds.left + item.plot.x, right: item.bounds.right + item.plot.x,
    top: item.bounds.top + item.plot.y, bottom: item.bounds.bottom + item.plot.y
  }]));
  for (const descriptor of descriptors) {
    if (!["content", "view"].includes(descriptor.config.anchor)) continue;
    if (descriptor.config.anchor === "view") descriptor.contentById = viewById;
    descriptor.clearance = { ...ZERO_SIDES };
    for (const id of descriptor.ids ?? [descriptor.id]) {
      const plot = resolveGraphicBounds(program.children[id]), bounds = (descriptor.contentById ?? boundsById).get(id);
      for (const [side, amount] of Object.entries({ left: plot.x - bounds.left,
        right: bounds.right - plot.x - plot.width, top: plot.y - bounds.top,
        bottom: bounds.bottom - plot.y - plot.height })) {
        descriptor.clearance[side] = Math.max(descriptor.clearance[side], amount);
      }
    }
  }
  return boundsById;
}

function laneThickness(descriptors, role, profile, space) {
  const visible = descriptors.filter(item => item.role === role && item.text !== "");
  if (visible.length === 0) return 0;
  return Math.max(...visible.map(item => headerReservation(
    item, item.config.side, profile, space, true
  )));
}

export function retainedFacetGuideIds(program, childId) {
  const spec = program.compositionSpec;
  const child = program.children[childId];
  const outer = hasOuterFacetAxes(spec.facet.guides.axes)
    ? resolveFacetOuterSides({ placements: spec.facet.grid?.cells ?? spec.children.map((id, index) => ({
      id, row: Math.floor(index / spec.columns), column: index % spec.columns
    })) }) : undefined;
  const ids = cartesianAxisOwners(child).flatMap(owner => axisGraphicIds(owner.channel, owner.id)
    .filter((id, index) => index >= 2 && (outer === undefined || facetAxisMode(spec.facet.guides.axes, owner.channel) === "each" ||
      outer[owner.config?.[["line", "ticks", "labels", "title"][index]]?.position]?.includes(childId))));
  for (const channel of ["theta", "radius", "parallel"]) {
    if (child.guideConfigs.axis?.[channel] !== undefined) ids.push(...axisGraphicIds(channel).slice(2));
  }
  if (spec.facet.guides.legend === false) ids.push(...allLegendGraphicIds(Object.keys(child.guideConfigs.legend ?? {})));
  return ids.filter(id => child.graphicSpec.objects[id] !== undefined);
}

function guideClearance(program, id) {
  const child = program.children[id], plot = resolveGraphicBounds(child);
  const bounds = retainedFacetGuideIds(program, id).map(target => resolveConcreteGraphicBounds(
    child.graphicSpec, target, child.materializationConfigs.textMetrics
  )).filter(Boolean);
  return {
    top: Math.max(0, ...bounds.map(bound => plot.y - bound.top)),
    bottom: Math.max(0, ...bounds.map(bound => bound.bottom - plot.y - plot.height)),
    left: Math.max(0, ...bounds.map(bound => plot.x - bound.left)),
    right: Math.max(0, ...bounds.map(bound => bound.right - plot.x - plot.width))
  };
}

export function prepareFacetHeaders(program, headersConfig) {
  const headers = normalizeFacetHeadersConfig(headersConfig);
  const descriptors = headers.mode === "legacy"
    ? legacyDescriptors(program, headers)
    : roleDescriptors(program, headers);
  const rows = program.compositionSpec.facet.grid === undefined
    ? Math.ceil(program.compositionSpec.children.length / program.compositionSpec.columns)
    : Math.max(...program.compositionSpec.facet.grid.cells.map(cell => cell.row)) + 1;
  const profile = program.materializationConfigs.textMetrics;
  const roles = ["column", ...(program.compositionSpec.facet.grid === undefined ? [] : ["row"])]
    .map(role => [role, resolveFacetHeaderConfig(headers, role)]);
  const hasTitles = roles.some(([, config]) => config.title !== undefined);
  if (["plot", "content"].includes(program.compositionSpec.spacing)) {
    const clearances = new Map(program.compositionSpec.children.map(id => [id, guideClearance(program, id)]));
    for (const descriptor of descriptors) {
      descriptor.clearance = Object.fromEntries(SIDES.map(side => {
        const overflow = Math.max(0, ...(descriptor.ids ?? [descriptor.id])
          .map(id => clearances.get(id)[side]));
        // Preserve an existing safe plot offset. If guide ink consumes that
        // offset, move the complete header lane beyond the occupied guide.
        return [side, overflow > descriptor.config.offset ? overflow : 0];
      }));
    }
  }
  const contentById = prepareContentBounds(program, descriptors, profile);
  const space = hasTitles || descriptors.some(item => hasRotation(item.config))
    ? plotMarginSpace(program) : ZERO_SIDES;
  const headerLayout = {
    outer: { ...ZERO_SIDES },
    cellRows: { top: Array(rows).fill(0), bottom: Array(rows).fill(0) }
  };
  if (headers.mode === "legacy" && ["plot", "content"].includes(program.compositionSpec.spacing)) {
    for (const descriptor of descriptors) {
      if (descriptor.text === "") continue;
      const index = program.compositionSpec.children.indexOf(descriptor.id);
      const row = program.compositionSpec.facet.grid?.cells[index]?.row ?? Math.floor(index / program.compositionSpec.columns);
      headerLayout.cellRows.top[row] = Math.max(headerLayout.cellRows.top[row],
        headerReservation(descriptor, "top", profile, space, row === 0));
    }
  }
  if (headers.mode === "roles") {
    const column = resolveFacetHeaderConfig(headers, "column");
    const columnThickness = laneThickness(descriptors, "column", profile, space);
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
          const last = side ? program.compositionSpec.columns - 1 : rows - 1;
          const outer = ["top", "left"].includes(column.side) ? index === 0 : index === last;
          reservations[column.side][index] = Math.max(
            reservations[column.side][index], headerReservation(descriptor, column.side, profile, space, outer)
          );
        }
      }
    } else {
      headerLayout.outer[column.side] = columnThickness;
      const row = resolveFacetHeaderConfig(headers, "row");
      headerLayout.outer[row.side] = laneThickness(descriptors, "row", profile, space);
    }
  }
  const titles = prepareFacetHeaderTitles({ roles, descriptors, space, headerLayout, profile,
    ids: program.compositionSpec.children });
  return { headers, descriptors, titles, headerLayout, ...(contentById === undefined ? {} : { contentById }),
    ...((hasTitles || descriptors.some(item => hasRotation(item.config))) && profile !== undefined ? { profile } : {}) };
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

function placedContent(cell, bounds) {
  return { left: cell.x + bounds.left, right: cell.x + bounds.right,
    top: cell.y + bounds.top, bottom: cell.y + bounds.bottom };
}

function alignedBlockAnchor(start, end, minimum, maximum, align) {
  if (align === "start") return start - minimum;
  if (align === "end") return end - maximum;
  return (start + end - minimum - maximum) / 2;
}

function rotatedRoleAnchor(descriptor, plot, snapshots, profile) {
  const { config } = descriptor, bounds = rotatedBounds(descriptor, profile);
  const common = { textAlign: "center", textBaseline: "middle", rotation: config.rotation };
  if (["top", "bottom"].includes(config.side)) {
    return {
      ...common,
      x: alignedBlockAnchor(plot.left, plot.right, bounds.left, bounds.right, config.align),
      y: config.side === "top"
        ? snapshots.top - config.offset - bounds.bottom
        : snapshots.bottom + config.offset - bounds.top
    };
  }
  return {
    ...common,
    x: config.side === "left"
      ? snapshots.left - config.offset - bounds.right
      : snapshots.right + config.offset - bounds.left,
    y: alignedBlockAnchor(plot.top, plot.bottom, bounds.top, bounds.bottom, config.align)
  };
}

function roleItem(descriptor, cells, plots, spacing, profile, contentById) {
  contentById = descriptor.contentById ?? contentById;
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
  const snapshots = ["content", "view"].includes(descriptor.config.anchor)
    ? union(descriptor.ids.map((id, index) => placedContent(selectedCells[index], contentById.get(id))))
    : ["plot", "content"].includes(spacing) ? plot : union(selectedCells.map(placedCell));
  const config = descriptor.config;
  if (hasRotation(config) || descriptor.topology === "role-title") {
    const properties = rotatedRoleAnchor(descriptor, plot, snapshots, profile);
    const axis = ["left", "right"].includes(config.side) ? "y" : "x";
    if (config.alongOffset !== undefined) properties[axis] += config.alongOffset;
    return { descriptor, snapshots, properties };
  }
  const clearance = ["content", "view"].includes(config.anchor) ? 0 : descriptor.clearance?.[config.side] ?? 0;
  let anchor;
  if (["top", "bottom"].includes(config.side)) {
    anchor = horizontalAnchor(plot, config.align);
    const top = config.side === "top";
    anchor.y = top
      ? snapshots.top - clearance - config.offset - (descriptor.text.includes("\n") ? resolveLegendTitleText(descriptor.text, config, profile).height : config.fontSize) / 2
      : snapshots.bottom + clearance + config.offset + (descriptor.text.includes("\n") ? resolveLegendTitleText(descriptor.text, config, profile).height : config.fontSize) / 2;
    anchor.textBaseline = "middle";
  } else {
    anchor = verticalAnchor(plot, config.align);
    const left = config.side === "left";
    anchor.x = left
      ? snapshots.left - clearance - config.offset
      : snapshots.right + clearance + config.offset;
    anchor.textAlign = left ? "right" : "left";
  }
  return { descriptor, snapshots, properties: anchor };
}

function legacyItem(descriptor, cell, plot, spacing, profile, contentById) {
  contentById = descriptor.contentById ?? contentById;
  if (cell === undefined || plot === undefined) {
    throw new Error(`Facet header requires cell and plot bounds for "${descriptor.id}".`);
  }
  const content = ["content", "view"].includes(descriptor.config.anchor)
    ? placedContent(cell, contentById.get(descriptor.id)) : placedPlot(cell, plot);
  if (hasRotation(descriptor.config) && ["plot", "content"].includes(spacing)) {
    const bounds = placedPlot(cell, plot);
    return {
      descriptor, snapshots: placedCell(cell),
      properties: rotatedRoleAnchor({ ...descriptor, config: { ...descriptor.config, side: "top" } }, bounds, content, profile)
    };
  }
  return {
    descriptor,
    snapshots: placedCell(cell),
    properties: {
      ...horizontalAnchor(placedPlot(cell, plot), descriptor.config.align),
      y: ["plot", "content"].includes(spacing) ? cell.y + plot.y - (descriptor.clearance?.top ?? 0) - descriptor.config.offset - (descriptor.text.includes("\n") ? resolveLegendTitleText(descriptor.text, descriptor.config, profile).height : descriptor.config.fontSize) / 2 : cell.y + descriptor.config.offset,
      textBaseline: "middle",
      ...(hasRotation(descriptor.config) ? { rotation: descriptor.config.rotation } : {})
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
      ...(resolveLegendTitleText(item.descriptor.text, config).lines ? { lines: resolveLegendTitleText(item.descriptor.text, config).lines } : {}),
      fill: config.color,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight
    }
  };
}

function assertRoleHeadersFit(records, items, layout, profile, plots, contentById) {
  const bounds = items.map((item, index) => records[index].descriptor.text === ""
    ? undefined
    : resolveTextBounds(item.properties, profile));
  for (const [index, current] of bounds.entries()) {
    if (current === undefined) continue;
    if (current.left < -1e-9 || current.right > layout.width + 1e-9 ||
        current.top < -1e-9 || current.bottom > layout.height + 1e-9 ||
        bounds.some((other, otherIndex) => otherIndex < index &&
          other !== undefined && textBoundsIntersect(other, current)) ||
        layout.children.some(cell => textBoundsIntersect(current, contentById === undefined
          ? ["plot", "content"].includes(layout.spacing) ? placedPlot(cell, plots.get(cell.id)) : placedCell(cell)
          : placedContent(cell, contentById.get(cell.id))))) {
      throw new Error(
        "Facet role headers require sufficient non-overlapping reserved space."
      );
    }
  }
}

function assertLegacyHeadersFit(items, layout, plotById, profile, contentById) {
  const previous = [];
  for (let index = 0; index < items.length; index += 1) {
    if (items[index].properties.text === "") continue;
    const bounds = resolveTextBounds(items[index].properties, profile);
    const cell = layout.children[index];
    const plot = plotById.get(cell.id);
    if (bounds.left < 0 || bounds.right > layout.width ||
      bounds.top < 0 || bounds.bottom > layout.height ||
      previous.some(item => textBoundsIntersect(item, bounds)) ||
      (["plot", "content"].includes(layout.spacing) ? layout.children.some(other => textBoundsIntersect(bounds,
        contentById === undefined ? placedPlot(other, plotById.get(other.id))
          : placedContent(other, contentById.get(other.id)))) : textBoundsIntersect(bounds, placedPlot(cell, plot)))) {
      throw new Error(
        "Facet headers require sufficient non-overlapping space above every child plot."
      );
    }
    previous.push(bounds);
  }
}

export function resolveFacetHeaderItems(layout, plots, prepared) {
  const cells = new Map(layout.children.map(cell => [cell.id, cell]));
  const plotById = new Map(plots.map(plot => [plot.id, plot]));
  const records = [...prepared.descriptors, ...(prepared.titles ?? [])].map(descriptor => {
    if (descriptor.topology === "legacy") {
      return legacyItem(descriptor, cells.get(descriptor.id), plotById.get(descriptor.id), layout.spacing, prepared.profile, prepared.contentById);
    }
    return roleItem(descriptor, cells, plotById, layout.spacing, prepared.profile, prepared.contentById);
  });
  return { records, items: records.map(styledItem), plotById };
}

export function materializeFacetHeaders(program, layout, plots, prepared) {
  const profile = program.materializationConfigs.textMetrics;
  const { records, items, plotById } = resolveFacetHeaderItems(layout, plots, prepared);
  if (prepared.headers.mode === "legacy") {
    assertLegacyHeadersFit(items, layout, plotById, profile, prepared.contentById);
  } else {
    assertRoleHeadersFit(records, items, layout, profile, plotById, prepared.contentById);
  }
  const id = facetHeaderGraphicId(program.compositionSpec.id);
  return program
    .createGraphics({ id, type: "collection", parent: "canvas" })
    .editGraphics({ target: id, property: "items", value: items.map(item => ({ ...item, properties: bindTextFontProperties(program, item.properties) })) });
}

// Semantic entries follow the same ordering as materialized header items.
export function facetHeaderTextEntries(program) {
  const headers = normalizeFacetHeadersConfig(program.materializationConfigs.facets[program.compositionSpec.id].headers);
  const descriptors = headers.mode === "legacy" ? legacyDescriptors(program, headers) : roleDescriptors(program, headers);
  const titles = headers.mode === "legacy" ? [] : ["column", ...(program.compositionSpec.facet.grid ? ["row"] : [])]
    .flatMap(role => { const config = resolveFacetHeaderConfig(headers, role); return config.title ? [{role, title:true, text:config.title.text,config}] : []; });
  return [...descriptors.map(entry => ({...entry,role:headers.mode === "legacy" ? "all" : entry.role})),...titles];
}
