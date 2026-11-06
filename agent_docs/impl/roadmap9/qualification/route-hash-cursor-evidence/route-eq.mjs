// Same route resource (bytes) from current and baseline sources.
const out = []; let uuid = 0; Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, "0")}` });
for (const R of process.argv.slice(2, 4)) {
  const { chart } = await import(R + "/src/index.js");
  const { prepareGraphEdgeRoutes, createGraphRouteExecutor, computeGraphEdgeRoutesAsync } = await import(R + "/src/graph.js");
  const { ROUTE_EXECUTION_MAXIMA } = await import(R + "/src/grammar/graph/routes/execution.js");
  const { serializeProgram } = await import(R + "/src/persistence.js");
  const res = [];
  for (const [count, method, directed] of [[60, "density", false], [40, "density"], [200, "force-directed"], [300, "edge-path"]]) {
    uuid = 0;
    const nodes = Array.from({ length: count }, (_, id) => ({ id }));
    const edges = Array.from({ length: count }, (_, id) => ({ id, source: id % count, target: (id + 1 + (id * 7) % (count - 1)) % count }));
    const positions = nodes.map(({ id }) => ({ key: id, x: 200 + 150 * Math.cos(2 * Math.PI * id / count) + (id % 5), y: 200 + 150 * Math.sin(2 * Math.PI * id / count) }));
    const p = chart().createCanvas({ width: 400, height: 400, margin: 0, background: "white" })
      .createData({ id: "nodes", values: nodes, keyField: "id" }).createData({ id: "edges", values: edges, keyField: "id" })
      .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target" })
      .layoutGraph({ id: "layout", method: "fixed", options: { positions } });
    const executor = createGraphRouteExecutor({ createWorker() {
      const l = new Map();
      return { postMessage({ job }) { computeGraphEdgeRoutesAsync(structuredClone(job)).then(d => l.get("message")?.({ data: d }), e => l.get("error")?.({ error: e })); },
        addEventListener(t, f) { l.set(t, f); }, removeEventListener(t) { l.delete(t); }, terminate() {} };
    } });
    try {
      const prepared = await prepareGraphEdgeRoutes(p, { kind: "create", id: "routes", graph: "graph", layout: "layout", method, options: { execution: { policy: "bounded-route@1", ...ROUTE_EXECUTION_MAXIMA } } }, { requestToken: "b", executor, deadlineMs: 30000 });
      res.push(serializeProgram(p.bundleGraphEdges({ prepared, requestToken: "b" })));
    } catch (e) { res.push("ERR " + e.message); }
  }
  out.push(res);
}
const { createHash } = await import("node:crypto");
out[0].forEach((x, i) => { let k = 0; while (k < x.length && x[k] === out[1][i][k]) k++; if (k < x.length) console.log("first diff", k, x.slice(k - 80, k + 40), "|", out[1][i].slice(k - 10, k + 40)); }); out[0].forEach((x, i) => console.log(i, x === out[1][i] ? "same" : "DIFF", x.length, createHash("sha256").update(x).digest("hex").slice(0, 12), x.slice(0, 40)));
