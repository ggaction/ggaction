import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateWorkLimit } from "../core/validation.js";
import { normalizeDataSource } from "./dataSource.js";
import { dataSourceValueHash } from "./dataSourcePayload.js";
import { normalizeExpressionV2 } from "./expressionAst.js";
import { evaluateExpressionV2 } from "./expressionEvaluate.js";

function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).some(key => !keys.includes(key))) throw new TypeError(`${label} contains unsupported properties.`);
}

export function dataSourceRequestHash(request) {
  const { inputHash: _hash, requestToken: _token, ...input } = request;
  return dataSourceValueHash(input);
}

// The request is captured before asynchronous host work. Its explicit token
// distinguishes identical inputs that were removed and recreated meanwhile.
export function createDataSourceRequest(source, options = {}) {
  exact(options, ["baseURL", "parameters", "parameterInputs", "requestToken", "load", "resolveNamed", "signal"], "Data source host options");
  if (typeof options.requestToken !== "string" || !options.requestToken) throw new TypeError("Data source requires a nonempty requestToken.");
  validateWorkLimit(options.requestToken.length, "Data request token length");
  const normalized = normalizeDataSource(source);
  let url = normalized.url, ids = [], parameters = {};
  if (normalized.kind === "url" && typeof url !== "string") {
    const expression = normalizeExpressionV2(url, { parameters: options.parameters ?? {} });
    ids = expression.parameters;
    url = evaluateExpressionV2(expression.expression, [{}], { parameters: expression.environment.parameters }).values[0];
    if (typeof url !== "string" || !url) throw new TypeError("Data URL expression must produce a nonempty string.");
    parameters = Object.fromEntries(ids.map(id => [id, expression.environment.parameters[id]]));
  }
  const inputs = options.parameterInputs ?? [];
  ownArray(inputs, "Data source parameter inputs");
  if (inputs.length !== ids.length) throw new TypeError("Data source parameter inputs do not match all expression dependencies.");
  inputs.forEach((ref, index) => {
    exact(ref, ["kind", "id", "revision"], "Data source parameter input");
    if (Object.keys(ref).length !== 3 || ref.kind !== "parameter" || ref.id !== ids[index] || !Number.isSafeInteger(ref.revision) || ref.revision < 0) {
      throw new TypeError("Data source parameter inputs require exact ordered identities and revisions.");
    }
  });
  let resolvedURL, baseURL;
  if (options.baseURL !== undefined) {
    if (typeof options.baseURL !== "string" || !options.baseURL) throw new TypeError("Data baseURL must be a nonempty absolute URL.");
    validateWorkLimit(options.baseURL.length, "Data baseURL length");
    try { baseURL = new URL(options.baseURL).href; }
    catch { throw new TypeError("Data baseURL must be a nonempty absolute URL."); }
  }
  if (normalized.kind === "url") {
    try { resolvedURL = new URL(url, baseURL).href; }
    catch { throw new TypeError("Relative data URL requires an explicit absolute baseURL."); }
  }
  const request = { source: normalized, requestToken: options.requestToken, parameterInputs: inputs, parameters,
    ...(baseURL === undefined ? {} : { baseURL }),
    ...(resolvedURL === undefined ? {} : { resolvedURL }) };
  return cloneAndFreeze({ ...request, inputHash: dataSourceRequestHash(request) });
}

