import { parentPort, workerData } from "node:worker_threads";
const { computeGraphEdgeRoutesAsync, computeGraphEdgeRoutes } = await import(workerData + "/src/graph.js");
parentPort.on("message", async ({ job }) => {
  try { parentPort.postMessage({ data: job.schemaVersion === 2 ? await computeGraphEdgeRoutesAsync(job) : computeGraphEdgeRoutes(job) }); }
  catch (error) { parentPort.postMessage({ error: { name: error.name, message: error.message } }); }
});
