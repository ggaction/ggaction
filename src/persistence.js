import { ChartProgram } from "./ChartProgram.js";
import { BasicChartProgram } from "./BasicChartProgram.js";
import { cloneAndFreeze } from "./core/immutable.js";
import { hasRegisteredExtension, isBuiltinProgramClass } from "./core/extensionRegistry.js";
import { packageVersion } from "./version.js";
import { decodeValue, encodeValue, invalidSnapshot } from "./persistence/codec.js";
import { exactKeys, requireObject, STATE_KEYS, validateGraphic, validateProgramState, validateTrace } from "./persistence/validation.js";

function canonicalState(program, extensions, path = "payload") {
  if (!(program instanceof ChartProgram || program instanceof BasicChartProgram) || !isBuiltinProgramClass(program.constructor)) {
    throw invalidSnapshot(`Cannot persist an unregistered program class at ${path}.`, path);
  }
  if (program.actionStack.length !== 0) throw invalidSnapshot("Cannot persist an open actionStack.", `${path}.actionStack`);
  const state = Object.fromEntries(STATE_KEYS.map(key => [key, program[key]]));
  state.children = Object.fromEntries(Object.entries(program.children).map(([id, child]) => [id, canonicalState(child, extensions, `${path}.children.${id}`)]));
  validateTrace(program.trace, program.constructor, extensions, `${path}.trace`);
  validateProgramState(program, path);
  return state;
}

function envelope(kind, payload, extensions = []) {
  return JSON.stringify({ schemaVersion: 1, kind, packageVersion, extensions, payload: encodeValue(payload) });
}

function readEnvelope(text, kind) {
  if (typeof text !== "string") throw invalidSnapshot("Snapshot must be a JSON string.", "snapshot");
  let value;
  try { value = JSON.parse(text); } catch { throw invalidSnapshot("Snapshot must be valid JSON.", "snapshot"); }
  exactKeys(value, ["schemaVersion", "kind", "packageVersion", "extensions", "payload"], "snapshot");
  if (value.schemaVersion !== 1 || value.kind !== kind) throw invalidSnapshot(`Unsupported snapshot schema or kind; expected schema 1 ${kind}.`, "snapshot");
  if (typeof value.packageVersion !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value.packageVersion)) throw invalidSnapshot("Invalid snapshot packageVersion.", "snapshot.packageVersion");
  if (!Array.isArray(value.extensions) || new Set(value.extensions).size !== value.extensions.length ||
      value.extensions.some(name => typeof name !== "string" || !hasRegisteredExtension(name)) || (kind === "graphic" && value.extensions.length)) {
    throw invalidSnapshot("Snapshot requires unknown, duplicate, or inapplicable extensions.", "snapshot.extensions");
  }
  return { ...value, payload: decodeValue(value.payload) };
}

function restoreState(state, extensions, path = "payload") {
  exactKeys(state, STATE_KEYS, path);
  if (!Array.isArray(state.actionStack) || state.actionStack.length) throw invalidSnapshot("Snapshot actionStack must be empty.", `${path}.actionStack`);
  requireObject(state.children, `${path}.children`);
  validateTrace(state.trace, ChartProgram, extensions, `${path}.trace`);
  const children = Object.fromEntries(Object.entries(state.children).map(([id, child]) => [id, restoreState(child, extensions, `${path}.children.${id}`)]));
  const program = new ChartProgram({ ...state, children });
  validateProgramState(program, path);
  return program;
}

export function serializeProgram(program) {
  const extensions = new Set();
  return envelope("editable", canonicalState(program, extensions), [...extensions].sort());
}

export function deserializeProgram(text) {
  const stored = readEnvelope(text, "editable");
  const extensions = new Set();
  const program = restoreState(stored.payload, extensions);
  if (extensions.size !== stored.extensions.length || stored.extensions.some(name => !extensions.has(name))) {
    throw invalidSnapshot("Snapshot extensions must exactly match its action traces.", "snapshot.extensions");
  }
  return program;
}

export function serializeGraphic(program) {
  validateGraphic(program?.graphicSpec);
  return envelope("graphic", program.graphicSpec);
}

export function deserializeGraphic(text) {
  const { payload } = readEnvelope(text, "graphic");
  validateGraphic(payload);
  return cloneAndFreeze({ graphicSpec: payload });
}
