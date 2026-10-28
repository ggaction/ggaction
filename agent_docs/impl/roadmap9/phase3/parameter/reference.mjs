// Review-only scalar model. No ChartProgram mutation, domain actions or renderer.
import { ownRecord, ownArray } from '../../../../../src/core/ownData.js';
import { validateUserId } from '../../../../../src/core/identifiers.js';
import { normalizeExpressionV2 } from '../../../../../src/grammar/expressionAst.js';
import { EXPRESSION_LIMITS } from '../../../../../src/grammar/expressionValues.js';

function exact(value, required, optional = []) {
  ownRecord(value, 'Parameter proposal');
  if (required.some(key => !Object.hasOwn(value, key)) ||
      Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) {
    throw new TypeError('Missing or unknown parameter option.');
  }
}
function scalar(value, type, nullable) {
  if (!['number', 'string', 'boolean'].includes(type) || typeof nullable !== 'boolean') {
    throw new TypeError('Invalid parameter type or nullability.');
  }
  if (value === null && nullable) return;
  if (typeof value !== type || (type === 'number' && !Number.isFinite(value))) {
    throw new TypeError('Parameter value does not match its type.');
  }
  if (type === 'string' && value.length > EXPRESSION_LIMITS.string) {
    throw new RangeError('Parameter string limit exceeded.');
  }
}
const freeze = value => {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
export function proposeCreate(options) {
  exact(options, ['id', 'value'], ['type', 'nullable']);
  validateUserId(options.id);
  const type = Object.hasOwn(options, 'type') ? options.type : typeof options.value;
  const nullable = Object.hasOwn(options, 'nullable') ? options.nullable : false;
  scalar(options.value, type, nullable);
  return freeze({ kind: 'parameter', id: options.id, revision: 0,
    algorithmVersion: '1', ownership: { mode: 'authored' }, inputs: [],
    options: { type, nullable }, result: { value: options.value }, provenance: { origin: 'authored' } });
}
export function validateProposed(resource) {
  exact(resource, ['kind','id','revision','algorithmVersion','ownership','inputs','options','result','provenance']);
  exact(resource.ownership, ['mode']); exact(resource.options, ['type', 'nullable']);
  exact(resource.result, ['value']); exact(resource.provenance, ['origin']);
  ownArray(resource.inputs, 'Parameter inputs');
  if (resource.kind !== 'parameter' || resource.algorithmVersion !== '1' ||
      resource.ownership.mode !== 'authored' || resource.provenance.origin !== 'authored' ||
      !Array.isArray(resource.inputs) || resource.inputs.length !== 0 ||
      !Number.isSafeInteger(resource.revision) || resource.revision < 0) {
    throw new TypeError('Invalid parameter resource.');
  }
  proposeCreate({ id: resource.id, ...resource.options, value: resource.result.value });
  return resource;
}
export function proposeEdit(resource, options) {
  validateProposed(resource); exact(options, ['target', 'value']);
  if (options.target !== resource.id) throw new Error('Missing parameter.');
  scalar(options.value, resource.options.type, resource.options.nullable);
  if (Object.is(resource.result.value, options.value)) return resource;
  if (resource.revision === Number.MAX_SAFE_INTEGER) throw new RangeError('Parameter revision limit exceeded.');
  return freeze({ ...proposeCreate({ id: resource.id, ...resource.options, value: options.value }),
    revision: resource.revision + 1 });
}
export function proposeBinding(expression, fields, resources) {
  const parameters = Object.create(null), byId = new Map();
  for (const resource of resources) {
    validateProposed(resource);
    if (byId.has(resource.id)) throw new Error('Duplicate parameter.');
    byId.set(resource.id, resource);
    parameters[resource.id] = { type: resource.options.type, value: resource.result.value };
  }
  const normalized = normalizeExpressionV2(expression, { fields, parameters });
  return freeze({ environment: normalized.environment, parameterInputs: normalized.parameters.map(id => ({
    kind: 'parameter', id, revision: byId.get(id).revision
  })) });
}
export function checkBinding(inputs, expected) {
  ownArray(inputs, 'Parameter input vector');
  if (inputs.length !== expected.length) throw new Error('Invalid or stale parameter inputs.');
  inputs.forEach((input, index) => {
    exact(input, ['kind', 'id', 'revision']);
    if (['kind', 'id', 'revision'].some(key => input[key] !== expected[index][key])) {
      throw new Error('Invalid or stale parameter inputs.');
    }
  });
}
// Tiny independent review graph: computes a proposed closure, never executes transforms.
// Nodes carry explicit typed identities so equal strings in two namespaces stay distinct.
export function proposedClosure(nodes, changed) {
  const key = node => JSON.stringify([node.kind, node.id]);
  const byId = new Map(nodes.map(node => [key(node), node]));
  if (byId.size !== nodes.length) throw new Error('Duplicate graph identity.');
  if (!byId.has(key(changed))) throw new Error('Missing changed resource.');
  const seen = new Set(), active = new Set(), ordered = [];
  const visit = node => {
    const identity = key(node);
    if (active.has(identity)) throw new Error('Cyclic dependency.');
    if (seen.has(identity)) return;
    active.add(identity);
    for (const input of node.inputs) {
      const parent = byId.get(key(input));
      if (!parent) throw new Error('Missing graph input.');
      visit(parent);
    }
    active.delete(identity); seen.add(identity); ordered.push(node);
  };
  nodes.forEach(visit);
  const affected = new Set([key(changed)]);
  return ordered.filter(node => {
    if (key(node) === key(changed)) return false;
    if (!node.inputs.some(input => affected.has(key(input)))) return false;
    affected.add(key(node)); return true;
  }).map(node => node.id);
}
