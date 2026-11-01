import { computeGraphInference } from '../../src/graph.js';
self.onmessage = ({ data: { job } }) => self.postMessage(computeGraphInference(job));
