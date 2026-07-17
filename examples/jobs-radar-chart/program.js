import { chart } from "../../src/index.js";

const ROLE_SOURCES = Object.freeze([
  Object.freeze(["Accounting", "Accountant / Auditor"]),
  Object.freeze(["Architecture", "Architect"]),
  Object.freeze(["Engineering", "Engineer"]),
  Object.freeze(["Law", "Lawyer / Judge"]),
  Object.freeze(["Management", "Manager / Owner"]),
  Object.freeze(["Nursing", "Nurse"]),
  Object.freeze(["Secretarial", "Secretary"]),
  Object.freeze(["Teaching", "Teacher"])
]);
const ROLE_ORDER = Object.freeze(ROLE_SOURCES.map(([role]) => role));
const SEXES = Object.freeze(["men", "women"]);

export function createJobsRadarRows(jobs) {
  if (!Array.isArray(jobs)) throw new TypeError("Jobs radar chart requires rows.");
  return ROLE_SOURCES.flatMap(([role, job]) => {
    const source = jobs.filter(row =>
      row?.year === 2000 && row?.job === job &&
      SEXES.includes(row?.sex) && Number.isFinite(row?.count)
    );
    if (source.length !== 2) {
      throw new Error(`Jobs radar chart requires men and women for "${job}".`);
    }
    const total = source.reduce((sum, row) => sum + row.count, 0);
    if (!(total > 0)) {
      throw new Error(`Jobs radar chart requires positive counts for "${job}".`);
    }
    return SEXES.map(sex => ({
      role,
      sex,
      share: source.find(row => row.sex === sex).count / total
    }));
  });
}

export function createJobsRadarChart(jobs) {
  const radarRows = createJobsRadarRows(jobs);
  return chart()
    .createCanvas({
      width: 820,
      height: 650,
      margin: { top: 90, right: 190, bottom: 90, left: 90 }
    })
    .createData({ values: radarRows })
    .createLineMark({ closed: true, strokeWidth: 2.5, opacity: 0.9 })
    .encodeTheta({
      field: "role",
      fieldType: "nominal",
      scale: { domain: ROLE_ORDER }
    })
    .encodeR({ field: "share", scale: { domain: [0, 1], zero: true } })
    .encodeGroup({ field: "sex" })
    .encodeColor({ field: "sex", palette: "tableau10" })
    .createGuides({
      axes: {
        theta: { title: { text: "Occupation" } },
        radius: {
          ticksAndLabels: { values: [0, 0.25, 0.5, 0.75, 1] },
          title: { text: "Share" }
        }
      },
      grid: {
        theta: { values: ROLE_ORDER },
        radial: { values: [0, 0.25, 0.5, 0.75, 1] }
      },
      legend: { position: "right", title: "Sex" }
    });
}
