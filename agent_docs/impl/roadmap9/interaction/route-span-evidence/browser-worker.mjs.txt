import { computeGraphEdgeRoutes } from 'ggaction/graph';
self.addEventListener('message', ({ data: { job } }) => {
  const started = performance.now();
  try { const result = computeGraphEdgeRoutes(job); self.postMessage({ result, computeMs: performance.now() - started }); }
  catch (error) { self.postMessage({ failure: { name: error.name, message: error.message }, computeMs: performance.now() - started }); }
});
