import { closedAction } from "../../core/action.js";
import { validateDataSourceState } from "../../materialization/dataSourceState.js";
import { readPreparedDataUpdate } from "../../resources/dataUpdate.js";
import { applyPreparedCreate } from "./sourceCreate.js";
import { withPreparedSourceUpdate } from "./sourceContext.js";

export const applyDataUpdate = /* @__PURE__ */ closedAction(
  { op: "applyDataUpdate", description: "Apply a prepared data update.", scope: "any" },
  ["prepared", "requestToken"], function (args = {}) {
    const payload = readPreparedDataUpdate(this, args.prepared, args.requestToken);
    if (payload.request.kind === "create") return applyPreparedCreate(this, payload);
    let next;
    if (payload.request.kind === "revise") {
      const source = payload.plan.sources[0];
      next = withPreparedSourceUpdate({ source: source.old, id: source.id, values: source.prepared.values,
        ...(payload.request.rowMap === undefined ? {} : { rowMap: payload.request.rowMap }) },
        { ...source, revisionPlan: payload.plan.revisionPlan }, input => this.reviseData(input));
    } else {
      next = withPreparedSourceUpdate({ target: payload.request.target, value: payload.request.value },
        { plan: payload.plan }, input => this.editParameter(input));
    }
    validateDataSourceState(next);
    return next;
  }
);
