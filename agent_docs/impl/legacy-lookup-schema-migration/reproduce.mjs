import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";

const p = chart().createData({ id: "reference", values: [{ id: 1, value: "013" }, { id: "1", value: "020" }] })
  .createData({ id: "source", values: [{ key: "1", order: 0 }, { key: 1, order: 1 }, { key: 9, order: 2 }] })
  .createLookupData({ id: "joined", field: "key", lookup: { data: "reference", key: "id", fields: ["value"], as: ["joinedValue"] } });
const envelope = JSON.parse(serializeProgram(p)), state = decodeValue(envelope.payload);
for (const dataset of state.semanticSpec.datasets) delete dataset.schema;
envelope.schemaVersion = 1; envelope.payload = encodeValue(state);
try {
  const restored = deserializeProgram(JSON.stringify(envelope));
  assert.deepEqual(restored.semanticSpec.datasets.at(-1).values.map(row => row.joinedValue), ["020", "013", null]);
  console.log({ status: "restored-lossless-legacy-lookup", values: ["020", "013", null] });
} catch (error) {
  if (!error.message.includes('Lookup dataset "reference" requires schema.')) throw error;
  console.log({ status: "reproduced-pre-migration-schema-requirement", error: error.message, valuesBeforeSave: ["020", "013", null] });
}
