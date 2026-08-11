import { getWrappedActionMetadata } from "./action.js";
import { isPlainObject } from "./immutable.js";

const ACTION_NAME_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const DEFINITION_KEYS = new Set(["name", "actions"]);
const registeredExtensionNames = new Set();

function readDataProperty(object, key, owner) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (descriptor === undefined) {
    throw new TypeError(`${owner} requires a ${key} property.`);
  }
  if (!("value" in descriptor)) {
    throw new TypeError(`${owner} ${key} must be a data property.`);
  }
  return descriptor.value;
}

function validateDefinitionShape(definition) {
  if (!isPlainObject(definition)) {
    throw new TypeError("Extension definition must be a plain object.");
  }

  for (const key of Reflect.ownKeys(definition)) {
    if (typeof key !== "string" || !DEFINITION_KEYS.has(key)) {
      throw new TypeError(`Unknown extension definition property "${String(key)}".`);
    }
  }

  const name = readDataProperty(definition, "name", "Extension definition");
  const actions = readDataProperty(
    definition,
    "actions",
    "Extension definition"
  );

  if (
    typeof name !== "string" ||
    name.length === 0 ||
    name !== name.trim()
  ) {
    throw new TypeError("Extension name must be a non-empty trimmed string.");
  }
  if (!isPlainObject(actions)) {
    throw new TypeError("Extension actions must be a plain object.");
  }

  return { name, actions };
}

export function registerProgramExtension(ProgramClass, definition) {
  const { name, actions } = validateDefinitionShape(definition);

  if (registeredExtensionNames.has(name)) {
    throw new Error(`Extension "${name}" is already registered.`);
  }
  if (!Object.isExtensible(ProgramClass.prototype)) {
    throw new Error("ChartProgram prototype does not accept extension actions.");
  }

  const program = new ProgramClass();
  const descriptors = Object.create(null);
  const actionNames = Reflect.ownKeys(actions);
  if (actionNames.length === 0) {
    throw new TypeError("Extension actions must contain at least one action.");
  }

  for (const actionName of actionNames) {
    if (
      typeof actionName !== "string" ||
      !ACTION_NAME_PATTERN.test(actionName)
    ) {
      throw new TypeError(
        `Extension action name "${String(actionName)}" must be a JavaScript identifier.`
      );
    }

    const action = readDataProperty(actions, actionName, "Extension actions");
    const metadata = getWrappedActionMetadata(action);
    if (metadata === undefined) {
      throw new TypeError(
        `Extension action "${actionName}" must be created with action().`
      );
    }
    if (metadata.op !== actionName) {
      throw new Error(
        `Extension action "${actionName}" must use the same action op.`
      );
    }
    if (actionName in program) {
      throw new Error(`ChartProgram action "${actionName}" is already defined.`);
    }

    descriptors[actionName] = {
      value: action,
      configurable: false,
      enumerable: true,
      writable: false
    };
  }

  Object.defineProperties(ProgramClass.prototype, descriptors);
  registeredExtensionNames.add(name);
}
