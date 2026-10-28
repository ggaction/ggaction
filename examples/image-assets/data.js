export const frame = Object.freeze({ width: 200, height: 210 });
export const viewport = Object.freeze({ x: 50, y: 60, width: 100, height: 100 });
export const imageSize = Object.freeze({ width: 200, height: 100 });
export const assetSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect width="200" height="100" fill="#de5b49"/><rect x="100" width="100" height="50" fill="#397bb8"/><rect y="50" width="100" height="50" fill="#259782"/><rect x="100" y="50" width="100" height="50" fill="#edbd46"/><circle cx="100" cy="50" r="16" fill="white"/></svg>';
export const assetURI = `data:image/svg+xml;base64,${btoa(assetSVG)}`;
export const fixtures = Object.freeze([
  { id: 'contain-center', title: 'contain · center', fit: 'contain', align: [0.5, 0.5], rect: [50, 85, 100, 50] },
  { id: 'contain-start', title: 'contain · start', fit: 'contain', align: [0, 0], rect: [50, 60, 100, 50] },
  { id: 'cover-center', title: 'cover · center', fit: 'cover', align: [0.5, 0.5], rect: [0, 60, 200, 100] },
  { id: 'cover-end', title: 'cover · end', fit: 'cover', align: [1, 1], rect: [-50, 60, 200, 100] },
  { id: 'fill', title: 'fill', fit: 'fill', align: [0.5, 0.5], rect: [50, 60, 100, 100] },
  { id: 'clip-opacity', title: 'cover · clip · alpha .5', fit: 'cover', align: [0.5, 0.5], rect: [0, 60, 200, 100], circleClip: true, opacity: 0.5 }
].map(value => Object.freeze({ ...value, align: Object.freeze(value.align), rect: Object.freeze(value.rect) })));

export const assetHash = '97f99c97b9a4d34f5c4914c2cf9cd7a2df05e55ec2b9dbd08081609b808718c6';
// Four cubic segments use the existing concrete path vocabulary.
export const imageClip = Object.freeze({ type: "path", commands: Object.freeze([
  { op: "M", x: 145, y: 110 },
  { op: "C", x1: 145, y1: 134.8528137423857, x2: 124.8528137423857, y2: 155, x: 100, y: 155 },
  { op: "C", x1: 75.1471862576143, y1: 155, x2: 55, y2: 134.8528137423857, x: 55, y: 110 },
  { op: "C", x1: 55, y1: 85.1471862576143, x2: 75.1471862576143, y2: 65, x: 100, y: 65 },
  { op: "C", x1: 124.8528137423857, y1: 65, x2: 145, y2: 85.1471862576143, x: 145, y: 110 },
  { op: "Z" }
].map(Object.freeze)) });
