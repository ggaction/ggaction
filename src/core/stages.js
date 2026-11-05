// Resumable pure work. A stage iterator yields only between complete row
// batches and never retains a host callback; the synchronous public functions
// drain the same iterator in one call, so both paths share every check.
export const STAGE_ROWS = 1024;

export function drainStages(iterator) {
  let step = iterator.next();
  while (!step.done) step = iterator.next();
  return step.value;
}
