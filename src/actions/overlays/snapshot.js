import { requireSemanticScale } from "../../selectors/scales.js";
import { overlaySegments } from "../../materialization/overlayItems.js";
import { resolveOverlayGeometry } from "../../materialization/overlayGeometry.js";
import { resolveCoordinateBounds } from "../../materialization/coordinateBounds.js";
import { requireLayer } from "../../selectors/layers.js";

function availableName(base, taken) {
  let name = base, index = 2;
  while (taken.has(name)) name = `${base}-${index++}`;
  taken.add(name);
  return name;
}

// Detaching explicitly freezes the current visible results. Normalized plot
// coordinates retain offsets/dodging exactly and still respond to Canvas resize.
export function detachOverlay(program, layer) {
  const binding = layer.derivedBindings.overlay;
  const groups = resolveOverlayGeometry(program, binding);
  const frame = resolveCoordinateBounds(program, layer.coordinate);
  const fields = new Set(groups.flatMap(group => group.points.flatMap(point => Object.keys(point.fields))));
  const x = availableName("__overlay_x", fields), y = availableName("__overlay_y", fields);
  const series = availableName("__overlay_series", fields);
  const values = groups.flatMap(group => overlaySegments(group, binding).flatMap((points, segment) =>
    points.map(point => ({ ...point.fields, [x]: (point.x - frame.x) / frame.width,
      [y]: 1 - (point.y - frame.y) / frame.height, [series]: JSON.stringify([group.key, segment]) }))));
  const data = availableName(`${layer.id}-snapshot`, new Set(program.semanticSpec.datasets.map(dataset => dataset.id)));
  const scales = new Set(program.semanticSpec.scales.map(scale => scale.id));
  let next = program.createData({ id: data, values })
    .editSemantic({ property: `layer[${layer.id}].derivedBindings.overlay`, remove: true })
    .editSemantic({ property: `layer[${layer.id}].data`, value: data });
  for (const channel of ["x", "y", "group"]) {
    if (requireLayer(next, layer.id).encoding?.[channel]) next = next.editSemantic({ property: `layer[${layer.id}].encoding.${channel}`, remove: true });
  }
  // Appearance shares no mutable scale identity with the former source.
  for (const [channel, encoding] of Object.entries(layer.encoding)) {
    if (["x", "y"].includes(channel) || !encoding.scale) continue;
    const definition = requireSemanticScale(program, encoding.scale);
    const id = availableName(`${layer.id}-${channel}-snapshot`, scales);
    next = next.createScale({ ...definition, id })
      .editSemantic({ property: `layer[${layer.id}].encoding.${channel}.scale`, value: id });
  }
  return next.encodeChannels({ target: layer.id, channels: {
    x: { field: x, fieldType: "quantitative", scale: { id: availableName(`${layer.id}-snapshot-x`, scales), type: "linear", domain: [0, 1], zero: false, nice: false } },
    y: { field: y, fieldType: "quantitative", scale: { id: availableName(`${layer.id}-snapshot-y`, scales), type: "linear", domain: [0, 1], zero: false, nice: false } },
    ...(layer.mark.type === "line" ? { group: { fields: [series] } } : {}) } });
}
