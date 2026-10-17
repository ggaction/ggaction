// Independent bounds for the deliberately small, literal legend fixtures below.
// No production layout, bounds or text-measurement helper participates.
const WIDTHS_AT_TEN = Object.freeze({ A: 6.1, B: 6.1, T: 6.1, m: 8.2, g: 4.7, '0': 6.1, '1': 6.1,
  '5': 6.1, '10': 12.2, '< 5': 13.6, '≥ 5': 18.9, 'Wide legend title': 120 });
export function legendFixtureTextWidth(text, fontSize) {
  if (!(text in WIDTHS_AT_TEN)) throw Error('Unknown literal legend fixture text: ' + text);
  return WIDTHS_AT_TEN[text] * fontSize / 10;
}
const visible = paint => paint !== undefined && !['none', 'transparent'].includes(paint);
export function legendFixturePrimitiveBounds(type, p) {
  const extent = visible(p.stroke) ? (p.strokeWidth ?? 1) / 2 : 0;
  if (type === 'rect') return { left: p.x - extent, right: p.x + p.width + extent,
    top: p.y - extent, bottom: p.y + p.height + extent };
  if (type === 'circle') return { left: p.x - p.radius - extent, right: p.x + p.radius + extent,
    top: p.y - p.radius - extent, bottom: p.y + p.radius + extent };
  if (type === 'line') {
    const dx = p.x2 - p.x1, dy = p.y2 - p.y1, length = Math.hypot(dx, dy);
    const horizontal = length ? Math.abs(dy) / length * extent : extent;
    const vertical = length ? Math.abs(dx) / length * extent : extent;
    return { left: Math.min(p.x1, p.x2) - horizontal, right: Math.max(p.x1, p.x2) + horizontal,
      top: Math.min(p.y1, p.y2) - vertical, bottom: Math.max(p.y1, p.y2) + vertical };
  }
  if (type === 'text') {
    if (p.rotation) throw Error('Fixture text must be unrotated');
    const width = legendFixtureTextWidth(String(p.text), p.fontSize);
    const x = p.x - (['center', 'middle'].includes(p.textAlign) ? width / 2 : ['right', 'end'].includes(p.textAlign) ? width : 0);
    const y = p.y - (p.textBaseline === 'middle' ? p.fontSize / 2 : ['bottom', 'ideographic'].includes(p.textBaseline) ? p.fontSize : ['top', 'hanging'].includes(p.textBaseline) ? 0 : p.fontSize * 0.8);
    return { left: x, right: x + width, top: y, bottom: y + p.fontSize };
  }
  throw Error('Unexpected legend fixture primitive: ' + type);
}
export function legendFixtureBounds(program, select = () => true) {
  const boxes = [];
  for (const [id, object] of Object.entries(program.graphicSpec.objects)) {
    if (!(/Legend|Gradient/.test(id)) || !select(id)) continue;
    if (object.properties) boxes.push(legendFixturePrimitiveBounds(object.type, object.properties));
    for (const item of object.items ?? []) boxes.push(legendFixturePrimitiveBounds(item.type ?? object.type, item.properties));
  }
  if (!boxes.length) throw Error('No concrete legend fixture geometry');
  return { left: Math.min(...boxes.map(b => b.left)), right: Math.max(...boxes.map(b => b.right)),
    top: Math.min(...boxes.map(b => b.top)), bottom: Math.max(...boxes.map(b => b.bottom)) };
}
