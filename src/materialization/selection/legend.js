import { resolveStoredSelection } from "./state.js";

export function exactLegendSelection(program, config, highlight) {
  if (highlight.target !== config.target) return undefined;
  const resolved = resolveStoredSelection(program, highlight.selection);
  const selected = new Set(resolved.keys);
  const groups = config.domain.map(value =>
    resolved.items.filter(item => item.fields?.[config.field] === value)
  );
  if (
    groups.some(group => group.length === 0) ||
    resolved.items.some(item => !config.domain.includes(item.fields?.[config.field]))
  ) return undefined;
  const states = groups.map(group => {
    const count = group.filter(item => selected.has(item.key)).length;
    return count === 0 ? false : count === group.length ? true : undefined;
  });
  return states.includes(undefined) ? undefined : states;
}

export function legendLayerStyle(layer, style) {
  const properties = layer.type === "line"
    ? ["stroke", "strokeWidth", "strokeDash", "opacity"]
    : ["fill", "stroke", "strokeWidth", "opacity"];
  return Object.fromEntries(
    properties.flatMap(key => Object.hasOwn(style, key) ? [[key, style[key]]] : [])
  );
}
