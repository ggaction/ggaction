import { readFileSync } from "node:fs";

const cars = JSON.parse(
  readFileSync(new URL("../../data/cars.json", import.meta.url), "utf8")
);
const jobs = JSON.parse(
  readFileSync(new URL("../../data/jobs.json", import.meta.url), "utf8")
);
const gapminder = JSON.parse(
  readFileSync(new URL("../../data/gapminder.json", import.meta.url), "utf8")
);

export function loadCars() {
  return structuredClone(cars);
}

export function loadJobs() {
  return structuredClone(jobs);
}

export function loadGapminder() {
  return structuredClone(gapminder);
}
