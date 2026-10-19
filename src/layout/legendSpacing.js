const shift = (bounds, {dx, dy}) => ({
  left:bounds.left + dx, right:bounds.right + dx,
  top:bounds.top + dy, bottom:bounds.bottom + dy
});
const union = bounds => ({
  left:Math.min(...bounds.map(b => b.left)), right:Math.max(...bounds.map(b => b.right)),
  top:Math.min(...bounds.map(b => b.top)), bottom:Math.max(...bounds.map(b => b.bottom))
});

// Family owners supply existing concrete text/sample bounds and logical row
// identities. This pure function neither reads scales nor changes a recipe.
export function resolveLegendContentSpacing(config, items, titleBounds) {
  if (config.rowPadding === undefined && config.titlePadding === undefined) return undefined;
  if (items.length === 0) throw new Error("Legend content spacing requires a body item.");
  const offsets = items.map(() => ({dx:0,dy:0}));
  const titleOffset = {dx:0,dy:0};
  const boundsFor = (item, index) => item.bounds.length > 0 ? item.bounds
    : [{left:item.x,right:item.x,top:item.y,bottom:item.y}];
  const originalBody = items.flatMap(boundsFor);
  const original = union([...originalBody, ...(titleBounds === undefined ? [] : [titleBounds])]);
  if (config.rowPadding !== undefined) {
    const rows = new Map();
    items.forEach((item,index) => {
      const row = rows.get(item.row) ?? {indices:[],bounds:[]};
      row.indices.push(index);row.bounds.push(...boundsFor(item,index));rows.set(item.row,row);
    });
    let previousBottom;
    for (const [,row] of [...rows.entries()].sort(([a],[b]) => a-b)) {
      const occupied = union(row.bounds);
      const dy = previousBottom === undefined ? 0 : previousBottom + config.rowPadding - occupied.top;
      for (const index of row.indices) offsets[index].dy = dy;
      previousBottom = occupied.bottom + dy;
    }
  }
  const body = () => items.flatMap((item,index) => boundsFor(item,index).map(b => shift(b,offsets[index])));
  if (titleBounds !== undefined && config.titlePadding !== undefined) {
    const occupied = union(body());
    if (config.titlePosition === "left") {
      const dx = titleBounds.right + config.titlePadding - occupied.left;
      for (const offset of offsets) offset.dx += dx;
    } else if (config.titlePosition === "bottom") {
      titleOffset.dy = occupied.bottom + config.titlePadding - titleBounds.top;
    } else {
      const dy = titleBounds.bottom + config.titlePadding - occupied.top;
      for (const offset of offsets) offset.dy += dy;
    }
  }
  const occupied = [...body(), ...(titleBounds === undefined ? [] : [shift(titleBounds,titleOffset)])];
  if (occupied.some(bounds => Object.values(bounds).some(value => !Number.isFinite(value)))) {
    throw new RangeError("Legend content spacing requires finite occupied bounds.");
  }
  const beforeAnchor = union(occupied);
  const right = config.position === "left" || config.position?.endsWith("right");
  const horizontal = ["top","bottom"].includes(config.position);
  const align = horizontal ? config.align ?? "center" : right ? "right" : "left";
  const coordinate = (bounds, side) => side === "center" ? (bounds.left+bounds.right)/2 : bounds[side];
  const dx = coordinate(original,align) - coordinate(beforeAnchor,align);
  const bottom = config.position === "top" || config.position?.startsWith("bottom-");
  const dy = bottom ? original.bottom - beforeAnchor.bottom : original.top - beforeAnchor.top;
  for (const offset of offsets) {offset.dx += dx;offset.dy += dy;}
  titleOffset.dx += dx;titleOffset.dy += dy;
  if ([...offsets,titleOffset].some(offset => !Number.isFinite(offset.dx) || !Number.isFinite(offset.dy))) {
    throw new RangeError("Legend content spacing requires finite offsets.");
  }
  return {offsets,titleOffset,bounds:[...body(),...(titleBounds === undefined ? [] : [shift(titleBounds,titleOffset)])]};
}
