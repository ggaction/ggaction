import { parentPort } from 'node:worker_threads';
import { computeGraphInference } from 'ggaction/graph';
parentPort.on('message', ({ job }) => parentPort.postMessage(computeGraphInference(job)));
