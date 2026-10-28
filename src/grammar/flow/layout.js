import { cloneAndFreeze } from "../../core/immutable.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { indexFlowModel } from "./model.js";
import { normalizeFlowLayout } from "./options.js";
import { flowTopology } from "./topology.js";
import { routeFlowEdges } from "./geometry.js";

function finite(value) {
  if (!Number.isFinite(value)) throw new RangeError("Flow geometry must remain finite.");
  return value;
}

function resolveOverlaps(column, nodes, extent, padding) {
  let end = 0;
  for (const index of column) {
    const node = nodes[index]; node.y = Math.max(node.y, end); end = finite(node.y + node.height + padding);
  }
  if (column.length && end - padding > extent) {
    end = extent;
    for (let i = column.length - 1; i >= 0; i--) {
      const node = nodes[column[i]]; node.y = Math.min(node.y, end - node.height); end = node.y - padding;
    }
  }
}

function positionNodes(model, indexed, topology, options) {
  const { charge } = indexed, vertical = options.orientation === "vertical";
  const primary = vertical ? options.height : options.width, cross = vertical ? options.width : options.height;
  const columns = Array.from({ length: model.nodes.length ? topology.maximum + 1 : 0 }, () => []);
  model.nodes.forEach((_, index) => columns[topology.ranks[index]].push(index));
  const explicit = Array.isArray(options.order) ? new Map(options.order.map((key, index) => [encodeRowKey(key), index])) : null;
  if (explicit && (explicit.size !== model.nodes.length || model.nodes.some(node => !explicit.has(node.key)))) {
    throw new TypeError("Flow explicit node order must cover every graph node exactly once.");
  }
  let scale = Infinity;
  for (const column of columns) {
    const gaps = finite(Math.max(0, column.length - 1) * options.nodePadding);
    if (gaps > cross) throw new RangeError("Flow node padding exceeds the available column extent.");
    let total = 0;
    for (const index of column) { charge(2); total = finite(total + indexed.totals[index].throughput); }
    if (total > 0) scale = Math.min(scale, finite((cross - gaps) / total));
    if (explicit) column.sort((a, b) => { charge(1); return explicit.get(model.nodes[a].key) - explicit.get(model.nodes[b].key); });
  }
  if (scale === Infinity) scale = 0;
  const nodes = indexed.totals.map((totals, index) => ({ ...totals,
    x: topology.maximum ? (primary - options.nodeWidth) * (topology.ranks[index] / topology.maximum) : (primary - options.nodeWidth) / 2,
    y: 0, width: options.nodeWidth, height: finite(totals.throughput * scale), rank: topology.ranks[index], order: 0 }));
  for (const column of columns) {
    let size = Math.max(0, column.length - 1) * options.nodePadding;
    for (const index of column) size += nodes[index].height;
    let cursor = (cross - size) / 2;
    for (const index of column) { nodes[index].y = cursor; cursor += nodes[index].height + options.nodePadding; }
  }
  // One pass is left-to-right using incoming edges, then right-to-left using
  // outgoing edges. Input/explicit ordering is retained as centers relax.
  for (let iteration = 0; iteration < options.iterations; iteration++) {
    const alpha = 1 / (iteration + 1);
    for (const incoming of [true, false]) {
      for (let c = 0; c < columns.length; c++) {
        const column = columns[incoming ? c : columns.length - c - 1];
        for (const index of column) {
          const node = nodes[index], adjacent = model.adjacency[index][incoming ? "incoming" : "outgoing"];
          const total = incoming ? node.incoming : node.outgoing;
          if (total === 0) continue;
          let center = 0;
          for (const key of adjacent) {
            charge(6);
            const edge = model.edges[indexed.edgeIndexes.get(key)], other = nodes[indexed.nodeIndexes.get(incoming ? edge.sourceKey : edge.targetKey)];
            center += (edge.weight / total) * (other.y + other.height / 2);
          }
          node.y = finite(node.y + (center - node.y - node.height / 2) * alpha);
        }
        if (options.order === "barycentric") column.sort((a, b) => { charge(1); return (nodes[a].y + nodes[a].height / 2) - (nodes[b].y + nodes[b].height / 2) || a - b; });
        charge(column.length * 2); resolveOverlaps(column, nodes, cross, options.nodePadding);
      }
    }
  }
  columns.forEach(column => column.forEach((index, order) => { nodes[index].order = order; }));
  return { nodes, columns, scale, primary, cross };
}


export function layoutFlow(model, method, input = {}) {
  const { options } = normalizeFlowLayout(method, input);
  const indexed = indexFlowModel(model, "allow", { maxNodes: options.maxNodes, maxEdges: options.maxEdges });
  const topology = flowTopology(model, indexed, method, options.align);
  const positioned = positionNodes(model, indexed, topology, options);
  const routed = routeFlowEdges(model, indexed, positioned, topology, options);
  const vertical = options.orientation === "vertical";
  const nodes = positioned.nodes.map(node => vertical ? { ...node, x: node.y, y: node.x, width: node.height, height: node.width } : node);
  const point = value => vertical ? { x: value.y, y: value.x } : value;
  const edges = routed.edges.map(edge => ({ ...edge, source: point(edge.source), target: point(edge.target) }));
  const { left, top, right, bottom } = routed.bounds;
  return cloneAndFreeze({ algorithm: "sankey@1", nodes, edges, scale: positioned.scale,
    columns: positioned.columns.map((column, rank) => ({ rank, keys: column.map(index => nodes[index].key) })),
    components: topology.components,
    bounds: vertical ? { left: top, top: left, right: bottom, bottom: right } : routed.bounds });
}
