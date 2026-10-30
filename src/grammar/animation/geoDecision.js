import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { validateGraphicIdentity } from "../schemas/graphicIdentity.js";

// Current native stream parts may exist in neither endpoint scene. Their closed
// decision names the real source feature and role, without an invented index.
export function validateGeoAnimationDecision(decision,identity) {
  ownRecord(decision,"Geographic animation decision");
  const fields=["kind","kernel","ownerKey","itemKey","role"];
  rejectUnknownProperties(decision,fields,"geographic animation decision");
  if(fields.some(key=>!Object.hasOwn(decision,key))||decision.kind!=="geographic"||decision.kernel!=="native-geo")throw new TypeError("Unknown or incomplete geographic animation decision.");
  validateGraphicIdentity(identity);
  const key=JSON.parse(identity.key);
  if(key[2]!=="geo"||identity.lineage.kind!=="resource"||!["geometry","projection"].includes(identity.lineage.resource.kind)||decision.ownerKey!==JSON.stringify(key.slice(0,2))||decision.itemKey!==identity.key||decision.role!==identity.role)throw new TypeError("Geographic decision differs from its actual source feature and part.");
  return decision;
}
export function createGeoAnimationDecision(identity) {
  const decision={kind:"geographic",kernel:"native-geo",ownerKey:JSON.stringify(JSON.parse(identity.key).slice(0,2)),itemKey:identity.key,role:identity.role};
  validateGeoAnimationDecision(decision,identity);return cloneAndFreeze(decision);
}
