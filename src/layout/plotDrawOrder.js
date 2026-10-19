export function resolvePlotDrawOrder({ children, grids, border, axes }) {
  const present = new Set(children);
  const gridOrder = grids.filter(grid => present.has(grid.id)).sort((a, b) =>
    (a.zIndex ?? 0) - (b.zIndex ?? 0) || a.index - b.index);
  const axisOrder = axes.map(axis => ({ ...axis, ids: children.filter(id => axis.ids.includes(id)) }));
  const borderId = present.has(border?.id) ? [border.id] : [];
  const owned = new Set([...gridOrder.map(grid => grid.id), ...borderId, ...axisOrder.flatMap(axis => axis.ids)]);
  return [
    ...gridOrder.filter(grid => (grid.zIndex ?? 0) <= 0).map(grid => grid.id),
    ...(border?.underlay ? borderId : []),
    ...axisOrder.filter(axis => axis.underlay).flatMap(axis => axis.ids),
    ...children.filter(id => !owned.has(id)),
    ...gridOrder.filter(grid => (grid.zIndex ?? 0) > 0).map(grid => grid.id),
    ...(border?.underlay ? [] : borderId),
    ...axisOrder.filter(axis => !axis.underlay).flatMap(axis => axis.ids)
  ];
}
