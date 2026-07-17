function offset(remaining, align) {
  return align === "start" ? 0 : align === "end" ? remaining : remaining / 2;
}

export function expectedConcatLayout({ direction, children, gap, padding, align }) {
  const horizontal = direction === "horizontal";
  const mainSizes = children.map(child => horizontal ? child.width : child.height);
  const crossSizes = children.map(child => horizontal ? child.height : child.width);
  const mainExtent = mainSizes.reduce((sum, value) => sum + value, 0) +
    gap * (children.length - 1);
  const crossExtent = Math.max(...crossSizes);
  let cursor = horizontal ? padding.left : padding.top;
  const placed = children.map((child, index) => {
    const main = cursor;
    const cross = offset(crossExtent - crossSizes[index], align);
    cursor += mainSizes[index] + gap;
    return {
      ...child,
      x: horizontal ? main : padding.left + cross,
      y: horizontal ? padding.top + cross : main
    };
  });
  return {
    width: padding.left + (horizontal ? mainExtent : crossExtent) + padding.right,
    height: padding.top + (horizontal ? crossExtent : mainExtent) + padding.bottom,
    children: placed
  };
}

