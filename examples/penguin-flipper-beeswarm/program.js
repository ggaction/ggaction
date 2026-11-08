import { chart } from "../../src/index.js";

// Each point is one penguin, packed so that no two overlap.
export function createPenguinFlipperBeeswarm(penguins) {
  const measured = penguins.filter(row => Number.isFinite(row.flipper_length_mm) && row.sex !== null)
    .map(row => ({ species: row.species, sex: row.sex, flipper: row.flipper_length_mm }));

  return chart()
    .createCanvas({ width: 900, height: 460, margin: { top: 80, right: 140, bottom: 60, left: 70 } })
    .createData({ id: "penguins", values: measured })
    .createBeeswarmPlot({
      x: { field: "species", fieldType: "nominal", scale: { domain: ["Adelie", "Chinstrap", "Gentoo"] } },
      y: { field: "flipper", scale: { zero: false, domain: [170, 235] } },
      color: { field: "sex", scale: { domain: ["female", "male"], range: ["#e11d48", "#2563eb"] } },
      point: { radius: 3, opacity: 0.85, stroke: "#ffffff", strokeWidth: 0.5 },
      guides: {
        axes: { x: { title: false }, y: { title: { text: "Flipper length (mm)" } } },
        legend: { title: "Sex" },
        grid: { horizontal: true, vertical: false }
      }
    })
    .createTitle({
      text: "Flipper length of 333 penguins",
      subtitle: "Beeswarm packing keeps every bird visible · males have longer flippers in each species"
    });
}
