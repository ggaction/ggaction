export const literalColors = {
  "d65": [
    "#ff0000",
    "#f40031",
    "#e80050",
    "#da006c",
    "#ca0088",
    "#b500a5",
    "#9a00c3",
    "#7300e0",
    "#0000ff"
  ],
  "d50": [
    "#ff0000",
    "#f10031",
    "#e3004f",
    "#d3006c",
    "#c10088",
    "#ac00a5",
    "#9100c2",
    "#6b00e0",
    "#0000ff"
  ],
  "gamma1": [
    "#75190b",
    "#8c3000",
    "#944e00",
    "#926f00",
    "#899202",
    "#7fb31c",
    "#79cf43",
    "#7ee472",
    "#90f2a4"
  ],
  "gamma22": [
    "#75190b",
    "#6e2300",
    "#683100",
    "#634700",
    "#5d6500",
    "#568900",
    "#54b118",
    "#62d654",
    "#90f2a4"
  ],
  "gamma0": [
    "#ffb2a4", "#ffba93", "#f6c487", "#e5ce7e", "#d2d87c",
    "#bfe17e", "#ade986", "#9def93", "#90f2a4"
  ],
  "gammaNegative": [
    "#00ffff", "#ffe9db", "#fcdeb8", "#eedda2", "#dce195",
    "#c8e68f", "#b3eb90", "#a0f097", "#90f2a4"
  ],
  "power": [
    "#0000ff",
    "#4a00b5",
    "#70008f",
    "#7e0081",
    "#800080",
    "#81007e",
    "#8f0070",
    "#b5004a",
    "#ff0000"
  ]
};
export const rowGeometry = {
  "d65": {
    "x": 30,
    "y": 70,
    "width": 46,
    "height": 40
  },
  "d50": {
    "x": 30,
    "y": 155,
    "width": 46,
    "height": 40
  },
  "gamma1": {
    "x": 30,
    "y": 65,
    "width": 46,
    "height": 25
  },
  "gamma22": {
    "x": 30,
    "y": 97,
    "width": 46,
    "height": 25
  },
  "power": {
    "x": 30,
    "y": 175,
    "width": 46,
    "height": 25
  }
};
export function primitiveItems(name, colors = literalColors[name]) {
  const row = rowGeometry[name];
  return colors.map((fill, i) => ({ type: "rect", properties: {
    x: row.x + i * row.width, y: row.y, width: row.width, height: row.height,
    fill, opacity: 1, stroke: "transparent", strokeWidth: 0
  } }));
}
