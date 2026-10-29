// Builtin assemblies install their native final-grain reader once. Browser
// interaction consumes this boundary without importing the mark policy graph.
const resolvers = new WeakMap();

export function registerMarkItemResolver(ProgramClass, resolver) {
  if (typeof ProgramClass !== 'function' || ProgramClass.prototype === undefined || typeof resolver !== 'function') {
    throw new TypeError('Native item resolution requires a constructor and resolver.');
  }
  if (resolvers.has(ProgramClass)) throw new Error('Native item resolution is already registered.');
  resolvers.set(ProgramClass, resolver);
}

export function resolveRegisteredMarkItems(program, target, grain, options) {
  const resolver = resolvers.get(program.constructor);
  if (resolver === undefined) throw new Error('This program does not provide native item resolution.');
  return resolver(program, target, grain, options);
}
