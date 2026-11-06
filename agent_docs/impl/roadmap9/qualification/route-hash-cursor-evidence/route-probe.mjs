const R = process.argv[2];
const { chart } = await import(R + "/src/index.js");
const { prepareGraphEdgeRoutes, createGraphRouteExecutor, computeGraphEdgeRoutesAsync } = await import(R + "/src/graph.js");
const { ROUTE_EXECUTION_MAXIMA } = await import(R + "/src/grammar/graph/routes/execution.js");
const [count, method] = [Number(process.argv[3]), process.argv[4]];
const nodes = Array.from({ length: count }, (_, id) => ({ id }));
const edges = Array.from({ length: count }, (_, id) => ({ id, source: id % count, target: (id + Math.floor(count / 3)) % count }));
const positions = nodes.map(({ id }) => ({ key: id, x: 200 + 150 * Math.cos(2 * Math.PI * id / count), y: 200 + 150 * Math.sin(2 * Math.PI * id / count) }));
const p = chart().createCanvas({ width: 400, height: 400, margin: 0, background: "white" })
  .createData({ id: "nodes", values: nodes, keyField: "id" }).createData({ id: "edges", values: edges, keyField: "id" })
  .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target" })
  .layoutGraph({ id: "layout", method: "fixed", options: { positions } });
const executor = createGraphRouteExecutor({ createWorker() {
  const listeners = new Map();
  return { postMessage({ job }) { const t = performance.now(); computeGraphEdgeRoutesAsync(structuredClone(job)).then(d => { console.error("compute", (performance.now() - t).toFixed(0)); listeners.get("message")?.({ data: d }); }, e => listeners.get("error")?.({ error: e })); },
    addEventListener(t, l) { listeners.set(t, l); }, removeEventListener(t) { listeners.delete(t); }, terminate() {} };
} });
const t = performance.now();
try {
  const prepared = await prepareGraphEdgeRoutes(p, { kind: "create", id: "routes", graph: "graph", layout: "layout", method, options: { execution: { policy: "bounded-route@1", ...ROUTE_EXECUTION_MAXIMA } } }, { requestToken: "b", executor, deadlineMs: 30000 });
  const routed = p.bundleGraphEdges({ prepared, requestToken: "b" });
  const r = routed.semanticSpec.resources.find(x => x.kind === "edge-route").result;
  console.log(count, method, "ok", (performance.now() - t).toFixed(0), "ms", JSON.stringify(r.diagnostics).slice(0, 300));
} catch (e) { console.log(count, method, "error", (performance.now() - t).toFixed(0), "ms", e.message.slice(0, 200)); }
executor.dispose?.();
