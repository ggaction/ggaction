import { parentPort } from 'node:worker_threads';
import { computeGraphInference } from '../../src/graph.js';
parentPort.on('message', ({job}) => parentPort.postMessage(computeGraphInference(job)));
