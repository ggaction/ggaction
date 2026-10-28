import { closedAction } from "../../core/action.js";
import { createDataSourceReceipt, createDataSourceResource, validateDataSourceState } from "../../materialization/dataSourceState.js";
import { readPreparedDataUpdate } from "../../resources/dataUpdate.js";
import { requireDataset } from "../../selectors/datasets.js";
import { withPreparedDatasetIdentity } from "../primitives/datasetIdentity.js";
import { withPreparedSourceUpdate, writeSourceResource } from "./sourceContext.js";

export function createPreparedSource(program, { id, prepared, identity, sourceId }) {
  const update = { receipt: createDataSourceReceipt(prepared, { sourceId }), schema: prepared.schema };
  return withPreparedDatasetIdentity({ id, values: prepared.values }, identity,
    args => withPreparedSourceUpdate(args, update, input => program.createData(input)));
}

export function applyPreparedCreate(program, payload) {
  const { request, prepared, identity, options } = payload;
  if (request.kind !== "create") throw new Error("Basic data updates support create requests only.");
  let next = createPreparedSource(program, { id: request.id, sourceId: request.id, prepared, identity });
  const resource = createDataSourceResource({ id: request.id, options, prepared,
    dataset: requireDataset(next, request.id) });
  next = writeSourceResource(next, resource);
  validateDataSourceState(next);
  return next;
}

export const applyCreateDataUpdate = /* @__PURE__ */ closedAction(
  { op: "applyDataUpdate", description: "Apply a prepared data update." }, ["prepared", "requestToken"],
  function (args = {}) {
    return applyPreparedCreate(this, readPreparedDataUpdate(this, args.prepared, args.requestToken));
  }
);
