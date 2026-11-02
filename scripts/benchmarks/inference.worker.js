import { computeGraphInference } from 'ggaction/graph';
self.addEventListener('message', ({ data: { job } }) => {
  const start = performance.now();
  try { self.postMessage({ result: computeGraphInference(job), computeMs: performance.now() - start }); }
  catch (error) { self.postMessage({ failure: { name: error.name, message: error.message }, computeMs: performance.now() - start }); }
});
