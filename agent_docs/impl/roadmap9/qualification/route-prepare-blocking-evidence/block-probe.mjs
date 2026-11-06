// Longest main-thread stretch during route preparation with a real worker thread.
import { Worker } from "node:worker_threads";
const [R, count, method, explicit] = [process.argv[2], Number(process.argv[3]), process.argv[4], process.argv[5] === "x"];
const { chart } = await import(R + "/src/index.js");
const { prepareGraphEdgeRoutes, createGraphRouteExecutor } = await import(R + "/src/graph.js");
const { ROUTE_EXECUTION_MAXIMA } = await import(R + "/src/grammar/graph/routes/execution.js");
const executor = createGraphRouteExecutor({ createWorker() {
  const worker = new Worker(new URL("./route-worker.mjs", import.meta.url), { workerData: R }), listeners = new Map();
  worker.on("message", m => m.error ? listeners.get("error")?.({ error: Object.assign(new Error(m.error.message), { name: m.error.name }) }) : listeners.get("message")?.({ data: m.data }));
  return { postMessage: v => worker.postMessage(v), addEventListener: (t, f) => listeners.set(t, f), removeEventListener: t => listeners.delete(t), terminate: () => worker.terminate() };
} });
const nodes = Array.from({ length: count }, (_, id) => ({ id }));
const edges = Array.from({ length: count }, (_, id) => ({ id, source: id % count, target: (id + Math.floor(count / 3)) % count }));
const positions = nodes.map(({ id }) => ({ key: id, x: 200 + 150 * Math.cos(2 * Math.PI * id / count), y: 200 + 150 * Math.sin(2 * Math.PI * id / count) }));
const p = chart().createCanvas({ width: 400, height: 400, margin: 0, background: "white" })
  .createData({ id: "nodes", values: nodes, keyField: "id" }).createData({ id: "edges", values: edges, keyField: "id" })
  .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target" })
  .layoutGraph({ id: "layout", method: "fixed", options: { positions } });
const gaps = []; let last = performance.now(), running = true;
const tick = () => { const now = performance.now(); gaps.push([now - last, last]); last = now; if (running) setImmediate(tick); };
const t0 = performance.now(); setImmediate(tick);
const prepared = await prepareGraphEdgeRoutes(p, { kind: "create", id: "routes", graph: "graph", layout: "layout", method, ...(explicit ? { options: { execution: { policy: "bounded-route@1", ...ROUTE_EXECUTION_MAXIMA } } } : {}) }, { requestToken: "b", executor, ...(explicit ? { deadlineMs: 30000 } : {}) });
running = false; const end = performance.now();
gaps.push([end - last, last]);
gaps.sort((a, b) => b[0] - a[0]);
console.log(count, method, "total", (end - t0).toFixed(0), "longest", gaps.slice(0, 5).map(([g, at]) => g.toFixed(1) + "@" + (at - t0).toFixed(0)).join(" "));
executor.dispose();
