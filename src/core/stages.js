// Resumable pure work. A stage iterator yields only between complete row
// batches and never retains a host callback; the synchronous public functions
// drain the same iterator in one call, so both paths share every check.
export const STAGE_ROWS = 1024;

export function drainStages(iterator) {
  let step = iterator.next();
  while (!step.done) step = iterator.next();
  return step.value;
}

// Array.prototype.map over rows, yielding between batches. Absent cells stay
// absent and the callback sees the same (value, index) arguments.
export function* mapStages(array, callback) {
  const result = new Array(array.length);
  for (let index = 0; index < array.length; index++) {
    if (index in array) result[index] = callback(array[index], index);
    if ((index + 1) % STAGE_ROWS === 0) yield;
  }
  return result;
}
