import { validateWorkLimit } from '../../core/validation.js';
import { ownArray, ownRecord } from '../../core/ownData.js';
import { validateGraphicIdentity } from '../schemas/graphicIdentity.js';
import { normalizeGuideIdentity } from './guideState.js';

// An owner is semantic identity, independent of scene order or primitive IDs.
export function animationOwnerKey(namespaces, owner) {
  ownArray(namespaces, 'Animation owner namespaces');
  if (namespaces.length > 1024 || namespaces.some(value => typeof value !== 'string' || value.length === 0) ||
      typeof owner !== 'string' || owner.length === 0) throw new TypeError('Animation owner requires exact namespaces and a resource id.');
  validateWorkLimit(owner.length + namespaces.reduce((sum, value) => sum + value.length, 0), 'Animation owner identity work');
  const result = JSON.stringify([namespaces, owner]);
  validateWorkLimit(result.length, 'Animation owner identity work');
  return result;
}

export function validateAnimationOwnerKey(input) {
  if (typeof input !== 'string') throw new TypeError('Animation owner key must be a string.');
  validateWorkLimit(input.length, 'Animation owner identity work');
  let value;
  try { value = JSON.parse(input); } catch { throw new TypeError('Animation owner key must contain exact identity data.'); }
  if (!Array.isArray(value) || value.length !== 2) throw new TypeError('Animation owner key requires namespaces and resource id.');
  if (animationOwnerKey(...value) !== input) throw new TypeError('Animation owner key must use its canonical identity.');
  return input;
}

export function graphicAnimationOwnerKey(identity) {
  ownRecord(identity, 'Graphic identity');
  ownRecord(identity.lineage, 'Graphic identity lineage');
  if (Array.isArray(identity.lineage.rowKeys)) ownArray(identity.lineage.rowKeys, 'Graphic identity row keys');
  validateGraphicIdentity(identity);
  const [namespaces, owner] = JSON.parse(identity.key);
  return animationOwnerKey(namespaces, owner);
}

export function guideAnimationOwnerKey(input) {
  const identity = normalizeGuideIdentity(input);
  return animationOwnerKey(identity.namespaces, identity.owner);
}
