import { planDataUpdate, finalizeDataUpdatePlan } from "../actions/data/sourcePlan.js";
import { ownRecord } from "../core/ownData.js";
import { checkDataSourceAbort, prepareDataSourceRequest } from "./resolveData.js";
import {
  createPreparedDataUpdate, normalizeDataUpdatePreparation,
  prepareDataUpdate as prepareCreate, prepareDataUpdateSourceRequest
} from "./dataUpdate.js";

export async function prepareDataUpdate(program, request, host) {
  ownRecord(request, "Data update request");
  if (request.kind === "create") return prepareCreate(program, request, host);
  const normalized = normalizeDataUpdatePreparation(program, request, host, true);
  const plan = planDataUpdate(program, normalized.request);
  const resources = plan.unit.semanticSpec.resources.map(resource =>
    !plan.noOp && resource === plan.parameter?.resource
      ? { ...resource, revision: resource.revision + 1, result: { value: plan.parameter.value } }
      : resource);
  // Validate every URL, dependency and required callback before starting any
  // load, then preserve source order independently of completion order.
  const requests = plan.sources.map(source => prepareDataUpdateSourceRequest(
    source.resource.options.source, resources, normalized.host, source.resource.options.baseURL));
  const prepared = await Promise.all(requests.map(input => prepareDataSourceRequest(input.request, input.options)));
  checkDataSourceAbort(normalized.host.signal);
  const finalized = finalizeDataUpdatePlan(plan, prepared);
  return createPreparedDataUpdate(program, normalized.request, normalized.host, { plan: finalized });
}
