import { computeGraphEdgeRoutes, computeGraphEdgeRoutesAsync } from 'ggaction/graph';
// Version 1 jobs use the synchronous solver; bounded v2 jobs require the staged one.
self.addEventListener('message', async ({ data: { job } }) => {
  const started = performance.now();
  try { const result = job?.schemaVersion === 2 ? await computeGraphEdgeRoutesAsync(job) : computeGraphEdgeRoutes(job); self.postMessage({ result, computeMs: performance.now() - started }); }
  catch (error) { self.postMessage({ failure: { name: error.name, message: error.message }, computeMs: performance.now() - started }); }
});
