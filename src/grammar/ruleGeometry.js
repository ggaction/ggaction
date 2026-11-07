// The center and size are already resolved by the native rule placement owner.
export function centeredRuleSpan(x, y, orientation, size) {
  return orientation === "horizontal"
    ? { x1: x - size / 2, y1: y, x2: x + size / 2, y2: y }
    : { x1: x, y1: y - size / 2, x2: x, y2: y + size / 2 };
}

export function boxRuleSpan(x, y, orientation, box, pixels) {
  if(orientation==="vertical") {
    const size=pixels??box.height, start=box.y+(box.height-size)/2;
    return {x1:x,y1:start,x2:x,y2:start+size};
  }
  const size=pixels??box.width, start=box.x+(box.width-size)/2;
  return {x1:start,y1:y,x2:start+size,y2:y};
}
