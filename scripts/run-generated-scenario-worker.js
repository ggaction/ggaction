import { parentPort, workerData } from "node:worker_threads";

import { runScenario } from "../test/support/scenarios/engine.js";

try {
  parentPort.postMessage({
    ok: true,
    result: runScenario(workerData.descriptor, {
      deterministic: workerData.deterministic
    })
  });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    error: {
      name: error?.name ?? "Error",
      message: error?.message ?? String(error),
      stack: error?.stack ?? String(error)
    }
  });
}
