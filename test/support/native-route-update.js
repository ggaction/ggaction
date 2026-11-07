import { chart } from "../../src/index.js";
import { createGraphRouteExecutor, computeGraphEdgeRoutesAsync, prepareGraphEdgeRoutes } from "../../src/graph.js";
import { ROUTE_EXECUTION_MAXIMA } from "../../src/grammar/graph/routes/execution.js";

// Shared small, authentic lifecycle for contract generators and input probes.
export async function nativeRouteUpdateCase() {
  const executor = createGraphRouteExecutor({ createWorker() {
    const listeners = new Map();
    return { addEventListener: (type, callback) => listeners.set(type, callback), removeEventListener: type => listeners.delete(type), terminate: () => listeners.clear(),
      postMessage({ job }) { computeGraphEdgeRoutesAsync(structuredClone(job)).then(data => listeners.get("message")?.({ data }), error => listeners.get("error")?.({ error })); } };
  } });
  try {
    const base = chart().createCanvas({ width: 200, height: 120, margin: 10 })
      .createData({ id: "nodes", values: [{ id: 0 }, { id: 1 }] })
      .createData({ id: "edges", values: [{ id: "e", source: 0, target: 1 }] })
      .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target" })
      .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: 0, x: 0, y: 0 }, { key: 1, x: 10, y: 10 }] } });
    const host = { executor, requestToken: "native-update", deadlineMs: 30000 };
    const route = await prepareGraphEdgeRoutes(base, { kind: "create", id: "route", method: "edge-path", options: { execution: { policy: "bounded-route@1", ...ROUTE_EXECUTION_MAXIMA } } }, host);
    const source = base.bundleGraphEdges({ prepared: route, requestToken: host.requestToken }).createGraphPlot({ id: "plot", routes: "route" });
    const editArgs = { target: "layout", node: { key: 1, x: 20, y: 5 } };
    const prepared = await prepareGraphEdgeRoutes(source, { kind: "update", edit: { action: "editLayout", args: editArgs } }, host);
    const args = { prepared, requestToken: host.requestToken };
    return { source, args, result: source.applyGraphEdgeRoutesUpdate(args), base, editArgs };
  } finally { executor.dispose(); }
}
