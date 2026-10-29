import { installExampleDependencies } from "./dependencies.js";

try {
  const entries = [...document.querySelectorAll("script[data-example-module]")];
  if (entries.length !== 1) throw new Error("The example host requires exactly one module entry.");
  const entry = new URL(entries[0].dataset.exampleModule, document.baseURI);
  if (entry.origin !== location.origin) throw new Error("Example modules must be served from the repository origin.");
  await installExampleDependencies(document);
  await import(entry.href);
} catch (error) {
  const status = document.querySelector("#status");
  if (status) status.textContent = `Failed: ${error.message}`;
  throw error;
}
