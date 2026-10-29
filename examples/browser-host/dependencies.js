// The pinned dependency manifest is the sole owner of third-party identities and
// entry locations. Examples use the same local installation as Node consumers.
export function exampleImportMap(manifest, rootURL) {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.packages) || !manifest.packages.length) throw new TypeError("Invalid example dependency manifest.");
  const root = new URL(rootURL), imports = {
    ggaction: new URL("src/index.js", root).href,
    "ggaction/extension": new URL("src/extension.js", root).href
  };
  for (const dependency of manifest.packages) {
    const { installKey, moduleEntry } = dependency;
    if (typeof installKey !== "string" || !/^[a-z][a-z0-9-]*$/.test(installKey) ||
        typeof moduleEntry !== "string" || !/^src\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.js$/.test(moduleEntry) ||
        !dependency.sources?.some(source => source.file === moduleEntry) || Object.hasOwn(imports, installKey)) {
      throw new TypeError("Invalid example dependency entry.");
    }
    imports[installKey] = new URL(`node_modules/${installKey}/${moduleEntry}`, root).href;
  }
  if (!Object.hasOwn(imports, manifest.directDependency)) throw new TypeError("Example dependency alias is missing.");
  return { imports };
}

export async function installExampleDependencies(document, fetchManifest = fetch) {
  const root = new URL("../../", import.meta.url);
  const response = await fetchManifest(new URL("licenses/geometry-math.json", root));
  if (!response.ok) throw new Error("Example dependencies are unavailable; install the repository dependencies and serve its root.");
  const definition = exampleImportMap(await response.json(), root);
  const script = document.createElement("script"); script.type = "importmap";
  script.textContent = JSON.stringify(definition); document.head.append(script);
  return definition;
}
