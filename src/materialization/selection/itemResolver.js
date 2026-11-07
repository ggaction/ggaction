// Builtin assemblies install their native final-grain and source readers once. Browser
// interaction consumes this boundary without importing the mark policy graph.
const resolvers = new WeakMap();

export function registerMarkItemResolver(ProgramClass, resolver, sourceResolver) {
  if (typeof ProgramClass !== 'function' || ProgramClass.prototype === undefined || typeof resolver !== 'function') {
    throw new TypeError('Native item resolution requires a constructor and resolver.');
  }
  if (sourceResolver !== undefined && typeof sourceResolver !== 'function') throw new TypeError('Native source item resolution requires a resolver.');
  if (resolvers.has(ProgramClass)) throw new Error('Native item resolution is already registered.');
  resolvers.set(ProgramClass, Object.freeze({ items: resolver, sourceItems: sourceResolver }));
}

export function resolveRegisteredMarkItems(program, target, grain, options) {
  const resolver = resolvers.get(program.constructor);
  if (resolver === undefined) throw new Error('This program does not provide native item resolution.');
  return resolver.items(program, target, grain, options);
}

export function resolveRegisteredMarkSourceItems(program, target, grain, options) {
  const resolver = resolvers.get(program.constructor)?.sourceItems;
  if (resolver === undefined) throw new Error('This program does not provide native source item resolution.');
  return resolver(program, target, grain, options);
}
