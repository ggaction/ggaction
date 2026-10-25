import { isPlainObject, cloneAndFreeze } from "../core/immutable.js";
import { validateUserId } from "../core/identifiers.js";

// Inspection and materialization share the same topology capability. A
// categorical density is an entire silhouette, not one endpoint per category.
export function overlaySourceReason(layer, coordinateType, density) {
  if (coordinateType !== 'cartesian' || !['bar', 'point', 'line', 'area'].includes(layer?.mark?.type))
    return 'Overlay source requires a Cartesian bar, point, line, or area mark.';
  if (layer.derivedBindings?.overlay) return 'Overlay source must be an independent mark.';
  if (['x', 'y'].some(channel => !layer.encoding?.[channel]?.scale)) return 'Overlay source requires complete x and y positions.';
  if (density?.placement?.type === 'category') return 'Categorically placed density areas do not have a single result endpoint per category.';
  return undefined;
}

export function normalizeOverlayBinding(input) {
  if (!isPlainObject(input) || Object.keys(input).some(key =>
    !["source", "basis", "mode", "series", "missing", "orderBy", "inheritColor"].includes(key))) {
    throw new TypeError("Overlay binding requires source, basis, mode, series, missing, and optional orderBy.");
  }
  validateUserId(input.source, "Overlay source");
  if (input.basis !== "visibleItems" || input.mode !== "follow") {
    throw new Error('Overlay binding requires basis "visibleItems" and mode "follow".');
  }
  if (!["source", "total"].includes(input.series)) throw new Error("Overlay series must be source or total.");
  if (!["break", "connect"].includes(input.missing)) throw new Error("Overlay missing must be break or connect.");
  if (typeof input.inheritColor !== "boolean") throw new TypeError("Overlay inheritColor must be boolean.");
  if (input.orderBy !== undefined && !["x", "y"].includes(input.orderBy)) {
    throw new Error("Overlay orderBy must be x or y.");
  }
  return cloneAndFreeze(input);
}

export function overlayGroupFields(layer) {
  const group = layer.encoding?.group;
  if (group?.fields) return group.fields;
  if (group?.field) return [group.field];
  const color = layer.encoding?.color;
  return ["nominal", "ordinal"].includes(color?.fieldType) &&
    ![layer.encoding?.x?.field, layer.encoding?.y?.field].includes(color.field)
    ? [color.field] : [];
}

export function overlayPositionEncoding(source, channel) {
  const encoding = source.encoding[channel];
  return encoding?.field === undefined && source.encoding[`${channel}2`]?.field !== undefined
    ? source.encoding[`${channel}2`] : encoding;
}

export function assertIndependentOverlayGeometry(layer, operation) {
  if (layer.derivedBindings?.overlay) throw new Error(`${operation}: overlay geometry follows its source; edit the source or detach the overlay first.`);
}
