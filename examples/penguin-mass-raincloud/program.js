import { chart } from "../../src/index.js";

// Palmer penguins with a recorded body mass.
export function createPenguinMassRaincloud(penguins) {
  const weighed = penguins.filter(row => Number.isFinite(row.body_mass_g))
    .map(row => ({ species: row.species, massKg: row.body_mass_g / 1000 }));

  return chart()
    .createCanvas({ width: 900, height: 460, margin: { top: 80, right: 40, bottom: 60, left: 110 } })
    .createData({ id: "penguins", values: weighed })
    .createRaincloudPlot({
      category: { field: "species", fieldType: "nominal", scale: { domain: ["Adelie", "Chinstrap", "Gentoo"] } },
      value: { field: "massKg", scale: { zero: false, domain: [2.5, 6.5] } },
      orientation: "horizontal",
      // A seeded strip keeps all 342 birds visible where a packed swarm would not fit.
      points: { type: "strip", jitter: { maxOffset: { band: 0.12 }, seed: 1 }, point: { radius: 2, opacity: 0.6 } },
      color: { field: "species", scale: { domain: ["Adelie", "Chinstrap", "Gentoo"], range: ["#f97316", "#a855f7", "#0d9488"] } },
      guides: {
        axes: { x: { title: { text: "Body mass (kg)" } }, y: { title: false } },
        legend: false,
        grid: { horizontal: false, vertical: true }
      }
    })
    .createTitle({
      text: "Gentoo penguins are the heaviest",
      subtitle: "Density, box summary and every weighed bird · 342 Palmer penguins"
    });
}
