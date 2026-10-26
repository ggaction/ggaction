import { resolveTextBounds, resolveTextLines } from "../core/textMetrics.js";

const STYLE_KEYS = Object.freeze(["fontSize", "fontFamily", "fontWeight", "color"]);
const ROTATIONS = Object.freeze({ left: -Math.PI / 2, right: Math.PI / 2, top: 0, bottom: 0 });

function thickness(text, config, side, profile) {
  const lines = resolveTextLines(text, { fontSize: config.fontSize,
    align: "center", baseline: "middle", blockAlign: "middle" });
  const bounds = resolveTextBounds({ ...config, text, x: 0, y: 0,
    ...(lines.length > 1 ? { lines } : {}),
    textAlign: "center", textBaseline: "middle" }, profile);
  return ["left", "right"].includes(side) ? bounds.right - bounds.left : bounds.bottom - bounds.top;
}

function cellReservation(layout, side) {
  const amounts = ["left", "right"].includes(side)
    ? layout.cellColumns?.[side] : layout.cellRows[side];
  if (amounts === undefined) return 0;
  return ["left", "top"].includes(side) ? amounts[0] : amounts.at(-1);
}

export function prepareFacetHeaderTitles({ roles, descriptors, space, headerLayout, profile, ids }) {
  const titles = [];
  for (const [role, header] of roles) {
    if (header.title === undefined) continue;
    const { side } = header;
    const title = header.title;
    const config = { ...Object.fromEntries(STYLE_KEYS.map(key => [key, header[key]])),
      ...title, side, align: title.align ?? "center", rotation: title.rotation ?? ROTATIONS[side] };
    const labelDistance = Math.max(0, ...descriptors.filter(item => item.config.side === side && item.text !== "")
      .map(item => thickness(item.text, item.config, side, profile) + item.config.offset +
        (item.clearance?.[side] ?? 0)));
    config.offset = title.offset ?? Math.max(space[side], labelDistance) + 8;
    const required = config.offset + thickness(title.text, config, side, profile);
    headerLayout.outer[side] = Math.max(headerLayout.outer[side],
      required - space[side] - cellReservation(headerLayout, side), 0);
    titles.push({ topology: "role-title", role, ids, text: title.text, config });
  }
  return titles;
}
