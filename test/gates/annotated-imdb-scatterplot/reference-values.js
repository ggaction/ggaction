import { niceDomain, numericTicks } from "../../oracles/numeric.js";

export const ANNOTATED_FILM_TITLES = Object.freeze([
  "City Lights",
  "It's a Wonderful Life",
  "12 Angry Men",
  "The Godfather",
  "Star Wars: Episode V - The Empire Strikes Back",
  "The Shawshank Redemption",
  "Inception",
  "Hamilton"
]);

const WIDTH = 720;
const HEIGHT = 460;
const MARGIN = Object.freeze({ top: 64, right: 130, bottom: 66, left: 70 });

function map(value, domain, range) {
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

function selectRows(rows) {
  if (!Array.isArray(rows)) throw new TypeError("IMDb rows must be an array.");
  return ANNOTATED_FILM_TITLES.map(title => {
    const row = rows.find(candidate => candidate.Series_Title === title);
    const year = Number(row?.Released_Year);
    const rating = Number(row?.IMDB_Rating);
    if (row === undefined || !Number.isInteger(year) || !Number.isFinite(rating)) {
      throw new Error(`IMDb annotation fixture requires complete row "${title}".`);
    }
    return Object.freeze({
      Series_Title: title,
      Released_Year: String(year),
      IMDB_Rating: rating
    });
  });
}

export function createAnnotatedImdbValues(rows) {
  const selected = selectRows(rows);
  const bounds = Object.freeze({
    x: MARGIN.left,
    y: MARGIN.top,
    width: WIDTH - MARGIN.left - MARGIN.right,
    height: HEIGHT - MARGIN.top - MARGIN.bottom
  });
  const years = selected.map(row => Date.UTC(Number(row.Released_Year), 0, 1));
  const ratings = selected.map(row => row.IMDB_Rating);
  const xDomain = Object.freeze([Math.min(...years), Math.max(...years)]);
  const yDomain = Object.freeze(niceDomain(ratings, 5));
  const xRange = Object.freeze([bounds.x, bounds.x + bounds.width]);
  const yRange = Object.freeze([bounds.y + bounds.height, bounds.y]);
  const x = years.map(value => map(value, xDomain, xRange));
  const y = ratings.map(value => map(value, yDomain, yRange));
  const xTickYears = Object.freeze([1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]);
  const yTickValues = numericTicks(yDomain, 5);

  return Object.freeze({
    width: WIDTH,
    height: HEIGHT,
    margin: MARGIN,
    bounds,
    rows: Object.freeze(selected),
    scales: Object.freeze({
      x: Object.freeze({ type: "time", domain: xDomain, range: xRange }),
      y: Object.freeze({ type: "linear", domain: yDomain, range: yRange })
    }),
    points: Object.freeze(selected.map((row, index) => Object.freeze({
      x: x[index],
      y: y[index],
      fill: "#4c78a8",
      radius: 3.5,
      title: row.Series_Title
    }))),
    labels: Object.freeze(selected.map((row, index) => Object.freeze({
      x: x[index] + 7,
      y: y[index] - 6,
      text: row.Series_Title
    }))),
    axes: Object.freeze({
      x: Object.freeze({
        ticks: Object.freeze(xTickYears.map(year => Object.freeze({
          value: year,
          position: map(Date.UTC(year, 0, 1), xDomain, xRange),
          label: String(year)
        }))),
        title: "Released Year"
      }),
      y: Object.freeze({
        ticks: Object.freeze(yTickValues.map(value => Object.freeze({
          value,
          position: map(value, yDomain, yRange),
          label: value.toFixed(1)
        }))),
        title: "IMDb Rating"
      })
    }),
    title: Object.freeze({
      x: bounds.x + bounds.width / 2,
      y: 27,
      text: "Selected Highly Rated Films"
    })
  });
}
