import { chart, type GeoMarkCapacity, type GeoMarkBinding } from "ggaction";
import { createTransitionScene } from "ggaction/scene";
const capacity: GeoMarkCapacity = { maxProjectedPoints: 200000, maxPathCommands: 200000 };
const program = chart().createCanvas()
  .createGeometryData({ id: "world", format: "geojson", coordinateKind: "planar", values: { type: "LineString", coordinates: [[0, 0], [1, 1]] } })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
  .createGeoLineMark({ capacity }).editGeoLineMark({ capacity: {} });
program.editGeoLineMark({ target: { childPath: ["left"], id: "coast" }, capacity });
program.createGraticule({ capacity: { maxProjectedPoints: 100 } });
const scene = createTransitionScene(program, { format: "canvas" });
const declared: unknown = scene.nodes[0]?.properties.maxCommands; void declared;
declare const binding: GeoMarkBinding;
if (binding.mode !== "annotation") { const maximum: number | undefined = binding.capacity?.maxPathCommands; void maximum; }
// @ts-expect-error Capacity cannot be explicitly undefined.
program.createGeoShapeMark({ capacity: undefined });
// @ts-expect-error Counts are numeric.
program.createGeoPointMark({ capacity: { maxProjectedPoints: "200000" } });
// @ts-expect-error Capacity is closed.
program.editGeoLineMark({ capacity: { maxVertices: 100 } });
// @ts-expect-error Annotation does not own a projected-geometry policy.
program.createGeoAnnotation({ text: "Here", anchor: { type: "position", position: [0, 0] }, capacity });
