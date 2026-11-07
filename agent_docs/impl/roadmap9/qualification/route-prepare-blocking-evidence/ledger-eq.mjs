// Ledger diagnostics of the stored-graph check and of route preparation and
// application, from the current tree and from the pre-staging commit.
const out = [];
for (const R of process.argv.slice(2, 4)) {
  let uuid = 0; Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, "0")}` });
  const { chart } = await import(R + "/src/index.js");
  const { prepareGraphEdgeRoutes, createGraphRouteExecutor, computeGraphEdgeRoutesAsync } = await import(R + "/src/graph.js");
  const { ROUTE_EXECUTION_MAXIMA, createRouteLedger } = await import(R + "/src/grammar/graph/routes/execution.js");
  const { validateResourceGraph } = await import(R + "/src/materialization/resourceState.js");
  const policy = { policy: "bounded-route@1", ...ROUTE_EXECUTION_MAXIMA };
  const executor = createGraphRouteExecutor({ createWorker() { const l = new Map(); return { addEventListener: (t, f) => l.set(t, f), removeEventListener: t => l.delete(t), terminate() {}, postMessage({ job }) { computeGraphEdgeRoutesAsync(structuredClone(job)).then(d => l.get("message")?.({ data: d }), e => l.get("error")?.({ error: e })); } }; } });
  const res = [];
  for (const [count, method, space] of [[300, "edge-path", "screen"], [120, "force-directed", "screen"], [40, "density", "screen"]]) {
    uuid = 0;
    const nodes = Array.from({ length: count }, (_, id) => ({ id }));
    const p = chart().createCanvas({ width: 400, height: 400, margin: 10 }).createData({ id: "nodes", values: nodes, keyField: "id" })
      .createData({ id: "edges", values: nodes.map(({ id }) => ({ id, source: id, target: (id + 1 + (id * 7) % (count - 1)) % count })), keyField: "id" })
      .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target" })
      .layoutGraph({ id: "layout", method: "fixed", options: { positions: nodes.map(({ id }) => ({ key: id, x: 200 + 150 * Math.cos(id), y: 200 + 150 * Math.sin(id) })) } });
    const prepared = await prepareGraphEdgeRoutes(p, { kind: "create", id: "routes", graph: "graph", layout: "layout", method, coordinateSpace: space, options: { execution: policy } }, { requestToken: "b", executor, deadlineMs: 30000 });
    const routed = p.bundleGraphEdges({ prepared, requestToken: "b" }).createGraphPlot({ id: "plot", routes: "routes" });
    const ledger = createRouteLedger(policy);
    validateResourceGraph(routed, routed.constructor, { ledger, signal: undefined });
    const update = await prepareGraphEdgeRoutes(routed, { kind: "update", edit: { action: "editCanvas", args: { width: 420 } } }, { requestToken: "u", executor, deadlineMs: 30000 });
    const applied = routed.applyGraphEdgeRoutesUpdate({ prepared: update, requestToken: "u" });
    res.push(JSON.stringify({ method, graph: ledger.diagnostics(), route: applied.semanticSpec.resources.find(r => r.kind === "edge-route").result.diagnostics }));
  }
  executor.dispose(); out.push(res);
}
out[0].forEach((x, i) => console.log(i, x === out[1][i] ? "same" : "DIFF", x.slice(0, 160), x === out[1][i] ? "" : "\n   " + out[1][i].slice(0, 160)));
