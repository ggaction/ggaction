import { createGraphInferenceExecutor, prepareInferredGraphData } from 'ggaction/graph';

// Timing stays in the host envelope; only the closed completion reaches ggaction.
export function inferenceWorkerStage(program, definition, validate, createWorker) {
  const counters = { workers: 0, listeners: 0 };
  let computeMs;
  const executor = createGraphInferenceExecutor({ createWorker() {
    const worker = createWorker(), listeners = new Map();
    counters.workers++;
    let terminated = false;
    const fail = error => {
      for (const entry of [...listeners.values()]) if (entry.type === 'error') entry.listener({ error });
    };
    return {
      postMessage(value) { worker.postMessage(value); },
      addEventListener(type, listener) {
        const adapted = type === 'message' ? event => {
          try {
            const envelope = event.data;
            if (!Number.isFinite(envelope.computeMs) || envelope.computeMs < 0) throw new Error('Invalid inference worker timing.');
            computeMs = envelope.computeMs;
            if (envelope.failure) {
              const error = new Error(envelope.failure.message); error.name = envelope.failure.name; fail(error);
            } else listener({ data: envelope.result });
          } catch (error) { fail(error); }
        } : listener;
        listeners.set(listener, { type, adapted, listener }); counters.listeners++;
        worker.addEventListener(type, adapted);
      },
      removeEventListener(type, listener) {
        const entry = listeners.get(listener);
        if (entry) { worker.removeEventListener(type, entry.adapted); listeners.delete(listener); counters.listeners--; }
      },
      terminate() { if (!terminated) { terminated = true; worker.terminate(); counters.workers--; } }
    };
  } });
  const balanced = () => {
    if (counters.workers !== 0 || counters.listeners !== 0) throw new Error('Inference benchmark worker leaked.');
  };
  return {
    async run() {
      computeMs = undefined;
      const start = performance.now();
      const prepared = await prepareInferredGraphData(program, { kind: 'create', ...definition }, { executor, requestToken: 'benchmark-inference' });
      const preparedAt = performance.now();
      const current = program.createInferredGraphData({ prepared, requestToken: 'benchmark-inference' });
      const appliedAt = performance.now();
      return { metrics: { workerMs: preparedAt - start }, program: current,
        output: current.semanticSpec.resources.find(value => value.kind === 'graph' && value.id === definition.id),
        diagnostics: { workerComputeMs: computeMs, applyMs: appliedAt - preparedAt } };
    },
    validate(result) { balanced(); return { ...validate(result), timingScope: 'workerMs includes startup, copy, compute and validation; apply is separate', counters: { ...counters }, ...result.diagnostics }; },
    dispose() { executor.dispose(); balanced(); }
  };
}
