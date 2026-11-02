export const columns = () => ({ x: [-0, 17.25, 23, 68], y: [4, 23, 30.5, 52], radius: [0, 15, 11.5, 9] });
export function circleBatchFixture(chart, appearance, batch = true) {
  let p = chart().createCanvas({ width: 100, height: 80, margin: 0 });
  const { x, y, radius } = columns();
  if (batch) {
    p = p.createGraphics({ id: 'dots', type: 'circle-batch', parent: 'plot-main' });
    for (const [property, value] of Object.entries({ x, y, radius, appearance })) p = p.editGraphics({ target: 'dots', property, value });
  } else {
    for (let i = 0; i < x.length; i++) {
      const target = `dot${i}`; p = p.createGraphics({ id: target, type: 'circle', parent: 'plot-main' });
      for (const [property, value] of Object.entries({ ...appearance, x: x[i], y: y[i], radius: radius[i] })) p = p.editGraphics({ target, property, value });
    }
  }
  return p;
}
