import {
  cloneAndFreeze,
  freezeOwned,
  isPlainObject,
  removeOwnedPath
} from "./immutable.js";

function validatePath(path) {
  if (
    !Array.isArray(path) ||
    path.length === 0 ||
    !path.every(key => typeof key === "string" && key.length > 0)
  ) {
    throw new TypeError("Materialization config path must contain names.");
  }
}

function validateConfig(config) {
  if (!isPlainObject(config)) {
    throw new TypeError("Materialization config must be a plain object.");
  }
}

function updateConfigPath(value, path, config) {
  if (path.length === 0) return cloneAndFreeze(config);
  const [key, ...rest] = path;
  return freezeOwned({
    ...value,
    [key]: updateConfigPath(value?.[key] ?? {}, rest, config)
  });
}

export function createMaterializationConfigs(
  markConfigs,
  guideConfigs,
  titleConfig,
  canvasConfig
) {
  return cloneAndFreeze({
    marks: markConfigs,
    guides: guideConfigs,
    ...(canvasConfig === undefined ? {} : { canvas: canvasConfig }),
    ...(titleConfig === undefined ? {} : { title: titleConfig })
  });
}

export function setMaterializationConfig(configs, path, config) {
  validatePath(path);
  validateConfig(config);
  return updateConfigPath(configs, path, config);
}

export function removeMaterializationConfig(configs, path) {
  validatePath(path);
  const removed = removeOwnedPath(configs, path);
  if (!removed.removed) return { removed: false, value: configs };
  return {
    removed: true,
    value: freezeOwned({
      ...removed.value,
      marks: removed.value.marks ?? freezeOwned({}),
      guides: removed.value.guides ?? freezeOwned({})
    })
  };
}
