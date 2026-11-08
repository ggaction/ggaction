// Pinned real-data snapshots used by the documentation showcase charts.
// data/showcase/manifest.json records each file's source, license and SHA-256.

const MISSING = new Set(["", "NA"]);

/** Parses a header-first CSV with no quoted separators into typed rows. */
export function parseSimpleCSV(text) {
  const [header, ...lines] = text.trim().split(/\r\n|\r|\n/);
  const fields = header.split(",");
  return lines.map(line => {
    const values = line.split(",");
    return Object.fromEntries(fields.map((field, index) => {
      const value = values[index] ?? "";
      if (MISSING.has(value)) return [field, null];
      return [field, /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : value];
    }));
  });
}

export const SHOWCASE_DATASETS = Object.freeze({
  penguins: Object.freeze({ file: "showcase/penguins.csv", format: "csv" }),
  worldCountries: Object.freeze({ file: "showcase/countries-110m.geojson", format: "json" }),
  flare: Object.freeze({ file: "showcase/flare.json", format: "json" }),
  globalTemperatures: Object.freeze({ file: "showcase/global-temperatures.csv", format: "csv" }),
  usBirths: Object.freeze({ file: "showcase/us-births-2000-2014.csv", format: "csv" }),
  earthquakes: Object.freeze({ file: "showcase/earthquakes-2024-01.geojson", format: "json" }),
  ibmDaily: Object.freeze({ file: "showcase/ibm-daily.json", format: "json" })
});

export function parseShowcaseDataset(id, text) {
  const dataset = SHOWCASE_DATASETS[id];
  if (dataset === undefined) throw new Error(`Unknown showcase dataset "${id}".`);
  return dataset.format === "csv" ? parseSimpleCSV(text) : JSON.parse(text);
}
