import { circleBatchRow, circleBatchRowKey } from "./circleBatch.js";
import { pathBatchRow, pathBatchRowCount } from "./pathBatch.js";

// Column batches are one concrete object with fully materialized rows. Every
// consumer reads the same row expansion; no batch type carries semantics.
const rowTypes = Object.freeze({ "circle-batch": "circle", "path-batch": "path" });
export const isBatchGraphicType = type => Object.hasOwn(rowTypes, type);
export const batchGraphicRowType = type => rowTypes[type];
export const batchGraphicRowCount = (type, properties) => type === "path-batch" ? pathBatchRowCount(properties) : properties.x.length;
export const batchGraphicRow = (type, properties, index) => type === "path-batch" ? pathBatchRow(properties, index) : circleBatchRow(properties, index);
// Renderer-private row identity is shared by every batch type.
export const batchGraphicRowKey = circleBatchRowKey;
