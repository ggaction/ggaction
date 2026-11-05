// Three closed rows: a quadrilateral, an overlapping triangle and a bent strip.
export const pathColumns = () => ({
  x: [4, 40, 44, 8, 30, 70, 52, 10, 30, 50, 70, 70, 50, 30, 10],
  y: [6, 4, 38, 30, 20, 26, 60, 50, 46, 52, 48, 70, 74, 68, 72],
  starts: [0, 4, 7]
});
export function pathRows({ closed = true } = {}) {
  const { x, y, starts } = pathColumns();
  return starts.map((start, row) => {
    const end = starts[row + 1] ?? x.length, commands = [];
    for (let point = start; point < end; point++) commands.push({ op: point === start ? 'M' : 'L', x: x[point], y: y[point] });
    if (closed) commands.push({ op: 'Z' });
    return commands;
  });
}
export function pathBatchFixture(chart, appearance, batch = true) {
  let p = chart().createCanvas({ width: 100, height: 80, margin: 0 });
  if (batch) {
    p = p.createGraphics({ id: 'cells', type: 'path-batch', parent: 'plot-main' });
    for (const [property, value] of Object.entries({ ...pathColumns(), closed: true, appearance })) p = p.editGraphics({ target: 'cells', property, value });
  } else {
    pathRows().forEach((commands, index) => {
      const target = `cell${index}`; p = p.createGraphics({ id: target, type: 'path', parent: 'plot-main' });
      for (const [property, value] of Object.entries({ ...appearance, commands })) p = p.editGraphics({ target, property, value });
    });
  }
  return p;
}
