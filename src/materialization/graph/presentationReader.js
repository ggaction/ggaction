// Full installs this private native reader once. Interaction never imports the
// native GraphPlot materialization or the public animation planner.
const readers = new WeakMap();
export function registerGraphPresentationReader(ProgramClass, reader) {
  if (typeof ProgramClass !== "function" || ProgramClass.prototype === undefined || typeof reader !== "function") {
    throw new TypeError("Graph presentation requires a constructor and native reader.");
  }
  if (readers.has(ProgramClass.prototype)) throw new Error("Native graph presentation is already registered.");
  readers.set(ProgramClass.prototype, reader);
}
export function readNativeGraphPresentation(program) {
  const reader = program === null || typeof program !== "object" ? undefined : readers.get(Object.getPrototypeOf(program));
  if (reader === undefined) throw new Error("Graph presentation requires an exact supported native program.");
  return reader(program);
}
