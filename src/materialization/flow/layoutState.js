import { ownArray, ownRecord } from "../../core/ownData.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { normalizeFlowLayout } from "../../grammar/flow/options.js";
import { indexFlowModel } from "../../grammar/flow/model.js";
import { flowTopology } from "../../grammar/flow/topology.js";
import { routeFlowEdges } from "../../grammar/flow/geometry.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { validateFlowPlotDefinition } from "../../grammar/flow/plot.js";
import { requireCoordinate } from "../../selectors/coordinates.js";

const same = (a, b) => canonicalJSON(encodeValue(a)) === canonicalJSON(encodeValue(b));
function exact(value, fields, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) throw new TypeError(`${label} requires its exact stored fields.`);
}
function numbers(value, fields, label) {
  if (fields.some(field => !Number.isFinite(value[field]))) throw new TypeError(`${label} requires finite numbers.`);
}
function strings(values, label) {
  ownArray(values, label);
  if (values.some(key => typeof key !== "string" || !key) || new Set(values).size !== values.length) throw new TypeError(`${label} requires unique nonempty keys.`);
}
function validateStored(resource) {
  if (resource.kind !== "layout" || resource.inputs.length !== 1 || resource.inputs[0].kind !== "graph" ||
      !same(resource.ownership, { mode: "authored" }) || resource.provenance.origin !== "inferred") throw new TypeError("Flow layouts require one graph input and authored ownership.");
  exact(resource.options, ["method", "options"], "Flow layout intent");
  if (!same(normalizeFlowLayout(resource.options.method, resource.options.options), resource.options)) throw new TypeError("Flow layout options must store resolved defaults.");
  const { result } = resource, options = resource.options.options;
  exact(result, ["algorithm", "nodes", "edges", "scale", "columns", "components", "bounds"], "Flow layout result");
  if (result.algorithm !== "sankey@1" || !Number.isFinite(result.scale) || result.scale < 0) throw new TypeError("Flow algorithm or scale is invalid.");
  for (const [field, maximum] of [["nodes", options.maxNodes], ["edges", options.maxEdges], ["columns", options.maxNodes], ["components", options.maxNodes]]) {
    ownArray(result[field], `Flow ${field}`); validateGeneratedItemLimit(result[field].length, `Flow ${field}`, maximum);
  }
  const keys = new Set();
  for (const node of result.nodes) {
    exact(node, ["key", "incoming", "outgoing", "throughput", "imbalance", "x", "y", "width", "height", "rank", "order"], "Flow layout node");
    numbers(node, ["incoming", "outgoing", "throughput", "imbalance", "x", "y", "width", "height"], "Flow node");
    if (typeof node.key !== "string" || !node.key || keys.has(node.key) || ["incoming", "outgoing", "throughput", "width", "height"].some(field => node[field] < 0) ||
        ["rank", "order"].some(field => !Number.isSafeInteger(node[field]) || node[field] < 0)) throw new TypeError("Flow nodes require unique keys, nonnegative dimensions and integer order.");
    keys.add(node.key);
  }
  keys.clear();
  for (const edge of result.edges) {
    exact(edge, ["key", "sourceKey", "targetKey", "value", "thickness", "source", "target", "route", "lane"], "Flow layout edge");
    numbers(edge, ["value", "thickness"], "Flow edge");
    if (["key", "sourceKey", "targetKey"].some(field => typeof edge[field] !== "string" || !edge[field]) || keys.has(edge.key) || edge.value < 0 || edge.thickness < 0 ||
        !["forward", "feedback", "loop"].includes(edge.route)) throw new TypeError("Flow edges require unique keys, nonnegative values and a known route.");
    keys.add(edge.key);
    for (const field of ["source", "target"]) { exact(edge[field], ["x", "y"], "Flow attachment"); numbers(edge[field], ["x", "y"], "Flow attachment"); }
    if (edge.route === "forward") {
      if (edge.lane !== null) throw new TypeError("Forward flow edges cannot have feedback lanes.");
    } else {
      exact(edge.lane, ["side", "index", "center", "sourceX", "targetX"], "Flow lane");
      numbers(edge.lane, ["center", "sourceX", "targetX"], "Flow lane");
      if (!["top", "bottom"].includes(edge.lane.side) || !Number.isSafeInteger(edge.lane.index) || edge.lane.index < 0) throw new TypeError("Flow lanes require an explicit side and nonnegative integer index.");
    }
  }
  for (const field of ["columns", "components"]) {
    let members = 0;
    for (const item of result[field]) {
      exact(item, ["rank", "keys"], `Flow ${field} entry`);
      if (Array.isArray(item.keys)) validateGeneratedItemLimit(members += item.keys.length, `Flow ${field} membership`, options.maxNodes);
      strings(item.keys, `Flow ${field} keys`);
      if (!Number.isSafeInteger(item.rank) || item.rank < 0) throw new TypeError("Flow membership rank must be a nonnegative integer.");
    }
  }
  exact(result.bounds, ["left", "top", "right", "bottom"], "Flow bounds"); numbers(result.bounds, ["left", "top", "right", "bottom"], "Flow bounds");
}

// Validate stored coordinates and their graph relationships. The placement and
// relaxation solver is never called during restoration.
function validateBindings(program, resource) {
  const graph = resolveInputReference(program, resource.inputs[0]), model = graph.result.model;
  const { method, options } = resource.options, result = resource.result;
  const indexed = indexFlowModel(model, "allow", { maxNodes: options.maxNodes, maxEdges: options.maxEdges });
  const topology = flowTopology(model, indexed, method, options.align);
  if (!same(result.components, topology.components) || !same(resource.provenance.sourceRows, graph.provenance.sourceRows)) throw new TypeError("Flow components or source provenance are stale.");
  if (result.nodes.length !== model.nodes.length) throw new TypeError("Flow node membership is stale.");
  const vertical = options.orientation === "vertical", primary = vertical ? options.height : options.width, cross = vertical ? options.width : options.height;
  const nodes = result.nodes.map(node => vertical ? { ...node, x: node.y, y: node.x, width: node.height, height: node.width } : node);
  const columns = Array.from({ length: nodes.length ? topology.maximum + 1 : 0 }, () => []);
  nodes.forEach((node, index) => {
    const totals = indexed.totals[index];
    if (node.key !== totals.key || ["incoming", "outgoing", "throughput", "imbalance"].some(field => node[field] !== totals[field]) || node.rank !== topology.ranks[index]) throw new TypeError("Flow node totals, identity or rank are stale.");
    const x = topology.maximum ? (primary - options.nodeWidth) * (node.rank / topology.maximum) : (primary - options.nodeWidth) / 2;
    if (node.x !== x || node.width !== options.nodeWidth || node.height !== node.throughput * result.scale) throw new TypeError("Flow node dimensions disagree with layout intent.");
    columns[node.rank].push(index);
  });
  const explicit = Array.isArray(options.order) ? new Map(options.order.map((key, index) => [encodeRowKey(key), index])) : null;
  if (explicit && (explicit.size !== nodes.length || nodes.some(node => !explicit.has(node.key)))) throw new TypeError("Flow explicit node order is stale.");
  let scale = Infinity;
  for (const column of columns) {
    let total = 0;
    for (const index of column) total += nodes[index].throughput;
    if (!Number.isFinite(total)) throw new TypeError("Flow column throughput exceeds finite numeric capacity.");
    const requested = options.order === "barycentric" ? undefined : [...column];
    if (explicit) requested.sort((a, b) => explicit.get(nodes[a].key) - explicit.get(nodes[b].key));
    column.sort((a, b) => nodes[a].order - nodes[b].order);
    if (requested && !same(column, requested)) throw new TypeError("Flow column order disagrees with its stored policy.");
    let end = 0;
    column.forEach((index, order) => {
      const node = nodes[index], tolerance = 1e-12 * Math.max(1, cross);
      if (node.order !== order || node.y < end - tolerance || node.y + node.height > cross + tolerance) throw new TypeError("Flow column order overlaps or exceeds its extent.");
      end = node.y + node.height + options.nodePadding;
    });
    const available = cross - Math.max(0, column.length - 1) * options.nodePadding;
    if (available < 0) throw new TypeError("Flow node padding exceeds its column extent.");
    if (total > 0) scale = Math.min(scale, available / total);
  }
  if (result.scale !== (scale === Infinity ? 0 : scale) || !same(result.columns, columns.map((column, rank) => ({ rank, keys: column.map(index => nodes[index].key) })))) throw new TypeError("Flow common scale or column membership is stale.");
  const routed = routeFlowEdges(model, indexed, { nodes, scale: result.scale, cross, primary }, topology, options);
  const point = value => vertical ? { x: value.y, y: value.x } : value;
  const edges = routed.edges.map(edge => ({ ...edge, source: point(edge.source), target: point(edge.target) }));
  const { left, top, right, bottom } = routed.bounds;
  if (!same(edges, result.edges) || !same(result.bounds, vertical ? { left: top, top: left, right: bottom, bottom: right } : routed.bounds)) throw new TypeError("Flow attachments, routes or bounds disagree with its stored nodes.");
  for (const layer of program.semanticSpec.layers) {
    if (layer.flowBinding?.layout.id !== resource.id) continue;
    exact(layer, ["id", "mark", "coordinate", "flowBinding", "flowLabels"], "Flow plot layer");
    exact(layer.mark, ["type"], "Flow mark"); exact(layer.flowBinding, ["layout"], "Flow binding");
    if (!["flow-node", "flow-link"].includes(layer.mark.type) || requireCoordinate(program, layer.coordinate).type !== "cartesian") throw new TypeError("Flow marks require their own family and Cartesian coordinate.");
    const config = program.materializationConfigs.marks[layer.id];
    exact(config, ["flowPlot"], "Flow mark configuration");
    validateFlowPlotDefinition(layer.mark.type, config.flowPlot, layer.flowLabels);
  }
}

export const flowLayoutResourceHandler = Object.freeze({ validateStored, validateBindings });
