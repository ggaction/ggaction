import { positionBindings } from "../core/encodingBindings.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../core/validation.js";
import { normalizePlotSnapshot, normalizePlotAnchor } from "../grammar/plotPosition.js";
import { requireSemanticScale } from "../selectors/scales.js";
import { assertSingleYFrames } from "../grammar/framePolicy.js";
import { resolveGraphicParentOffset } from "../grammar/schemas/graphicBounds.js";
import { cartesianAxisOwners } from "../selectors/axes.js";
import { isLiteralAnnotation, isSourceOwnedText } from "../grammar/text.js";
import { findCoordinate, requireCoordinate } from "../selectors/coordinates.js";
import { namespaceGraphicId } from "../selectors/graphicCapacity.js";
import { resolveCoordinateBounds } from "./coordinateBounds.js";
import { isGuidePartVisible } from "./guides/visibility.js";

const AXIS_PARTS = ["line", "ticks", "labels", "title"];
const qualify = (scope, id) => JSON.stringify([...scope, id]);
const graphicId = (scope, id) => scope.reduceRight((value, namespace) => namespaceGraphicId(namespace, value), id);

// This adapter reads existing owners only. No new frame state or graphical
// materialization is introduced by policy admission.
export function collectCartesianFrames(program, { materialized = false, geometry = true, allowIncomplete = false } = {}) {
  const frames = [], ancestors = new Set();
  let work = 0;
  function visit(unit, scope) {
    validateWorkLimit(++work, "Frame program traversal");
    if (scope.length > 1024 || ancestors.has(unit)) throw new Error("Frame program tree contains a cycle or exceeds its depth limit.");
    ancestors.add(unit);
    if (unit.compositionSpec !== undefined) {
      const children = unit.compositionSpec.children;
      validateGeneratedItemLimit(children.length, "Frame composition children");
      for (const childId of children) {
        const child = unit.children[childId];
        if (child === undefined) throw new Error(`Frame composition child "${childId}" is missing.`);
        visit(child, [...scope, `${unit.compositionSpec.id}-${childId}`]);
      }
    } else collectUnit(unit, scope);
    ancestors.delete(unit);
  }
  function collectUnit(unit, scope) {
    const local = new Map();
    function frame(id) {
      const coordinate = requireCoordinate(unit, id);
      if (coordinate.type !== "cartesian") return undefined;
      if (!local.has(id)) {
        validateGeneratedItemLimit(local.size + 1, "Cartesian frames");
        local.set(id, { id: qualify(scope, id), bindings: [], guides: [] });
      }
      return local.get(id);
    }
    for (const layer of unit.semanticSpec.layers) {
      const snapshot = layer.derivedBindings?.plotSnapshot, anchor = layer.derivedBindings?.plotAnchor;
      for (const [position, normalize, property, label] of [
        [snapshot, normalizePlotSnapshot, "field", "snapshot"],
        [anchor, normalizePlotAnchor, "datum", "anchor"]
      ]) {
        if (position === undefined) continue;
        normalize(position);
        for (const [channel, value] of Object.entries(position)) {
          const binding = layer.encoding?.[channel];
          const scale = requireSemanticScale(unit, binding?.scale);
          if ((snapshot?.[channel] !== undefined && anchor?.[channel] !== undefined) ||
              layer.derivedBindings.overlay !== undefined || layer.conditionals?.[channel] !== undefined ||
              binding?.[property] !== value || binding.fieldType !== "quantitative" ||
              binding[property === "field" ? "datum" : "field"] !== undefined ||
              ["aggregate", "bin", "stack", "temporalUnit"].some(key => binding[key] !== undefined) ||
              scale.type !== "linear" || scale.domain?.length !== 2 || scale.domain[0] !== 0 || scale.domain[1] !== 1 ||
              scale.reverse === true || scale.zero !== false || scale.nice !== false) {
            throw new Error(`Plot ${label} "${layer.id}.${channel}" requires its normalized linear position binding.`);
          }
        }
      }
      if (isLiteralAnnotation(layer) || isSourceOwnedText(layer)) continue;
      // Extension primitives may assign a coordinate before declaring it. Only
      // unfinished, unmaterialized layers may defer this reference check.
      if (allowIncomplete && unit.graphicSpec.objects[layer.id] === undefined &&
          findCoordinate(unit, layer.coordinate) === undefined) continue;
      for (const channel of ["y", "y2"]) for (const binding of positionBindings(layer, channel)) {
        validateWorkLimit(++work, "Frame binding traversal");
        if (binding.scale === undefined || snapshot?.[channel] !== undefined || anchor?.[channel] !== undefined) continue;
        if (layer.coordinate === undefined) throw new Error(`Y binding "${layer.id}.${channel}" requires a coordinate.`);
        frame(layer.coordinate)?.bindings.push({ owner: `${layer.id}.${channel}`, scale: qualify(scope, binding.scale) });
      }
    }
    for (const owner of cartesianAxisOwners(unit)) {
      if (owner.channel !== "y" || owner.scale === undefined) continue;
      let coordinate = owner.coordinate;
      if (coordinate === undefined) {
        const candidates = unit.semanticSpec.coordinates.filter(value => value.type === "cartesian");
        if (candidates.length !== 1) throw new Error(`Y guide "${owner.id}" requires one explicit Cartesian coordinate.`);
        coordinate = candidates[0].id;
      }
      frame(coordinate)?.guides.push({ id: owner.id, scale: qualify(scope, owner.scale),
        visible: AXIS_PARTS.some(part => owner.config?.[part] !== undefined && isGuidePartVisible(owner.config, part)) });
    }
    if (local.size === 0) return;
    const canvasId = graphicId(scope, "canvas");
    const concrete = materialized ? program.graphicSpec.objects[canvasId] : unit.graphicSpec.objects.canvas;
    const hasCanvas = geometry && concrete?.type === "canvas" && unit.materializationConfigs.canvas?.margin !== undefined;
    if (materialized && scope.length > 0 && !hasCanvas) throw new Error(`Cartesian child frame requires Canvas "${canvasId}".`);
    const parent = materialized && scope.length > 0 ? resolveGraphicParentOffset(program.graphicSpec, canvasId) : [0, 0];
    const dx = parent[0] + (scope.length > 0 && materialized ? concrete.properties.x ?? 0 : 0);
    const dy = parent[1] + (scope.length > 0 && materialized ? concrete.properties.y ?? 0 : 0);
    const view = hasCanvas ? { semanticSpec: unit.semanticSpec, context: unit.context, materializationConfigs: unit.materializationConfigs,
      resolvedScales: unit.resolvedScales, graphicSpec: { ...unit.graphicSpec, objects: { ...unit.graphicSpec.objects, canvas: concrete } } } : unit;
    for (const [id, value] of local) {
      const region = hasCanvas ? resolveCoordinateBounds(view, id) : { x: 0, y: 0, width: 0, height: 0 };
      frames.push({ ...value, region: { ...region, x: region.x + dx, y: region.y + dy } });
      validateGeneratedItemLimit(frames.length, "Cartesian frames");
    }
  }
  visit(program, []);
  return frames;
}

export function assertProgramSingleY(program, options) {
  const frames = collectCartesianFrames(program, options);
  if (options?.materialized === true || program.compositionSpec === undefined) assertSingleYFrames(frames);
  else {
    // Retained child recipes each use local coordinates. Only concrete snapshots
    // establish whether separate children occupy overlapping parent regions.
    const groups = new Map();
    for (const frame of frames) {
      const scope = JSON.stringify(JSON.parse(frame.id).slice(0, -1));
      if (!groups.has(scope)) groups.set(scope, []);
      groups.get(scope).push(frame);
    }
    for (const group of groups.values()) assertSingleYFrames(group);
  }
}
