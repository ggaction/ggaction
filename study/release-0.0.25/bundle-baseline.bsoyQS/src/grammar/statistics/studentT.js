const LANCZOS = Object.freeze([
  676.5203681218851,
  -1259.1392167224028,
  771.3234287776531,
  -176.6150291621406,
  12.507343278686905,
  -0.13857109526572012,
  9.984369578019572e-6,
  1.5056327351493116e-7
]);

function logGamma(value) {
  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) -
      logGamma(1 - value);
  }
  const shifted = value - 1;
  let sum = 0.9999999999998099;
  for (const [index, coefficient] of LANCZOS.entries()) {
    sum += coefficient / (shifted + index + 1);
  }
  const base = shifted + LANCZOS.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) +
    (shifted + 0.5) * Math.log(base) - base + Math.log(sum);
}

function betaContinuedFraction(a, b, value) {
  const maximumIterations = 200;
  const epsilon = 3e-14;
  const floor = 1e-300;
  const sum = a + b;
  let c = 1;
  let d = 1 - sum * value / (a + 1);
  if (Math.abs(d) < floor) d = floor;
  d = 1 / d;
  let result = d;

  for (let iteration = 1; iteration <= maximumIterations; iteration += 1) {
    const even = 2 * iteration;
    let coefficient = iteration * (b - iteration) * value /
      ((a + even - 1) * (a + even));
    d = 1 + coefficient * d;
    if (Math.abs(d) < floor) d = floor;
    c = 1 + coefficient / c;
    if (Math.abs(c) < floor) c = floor;
    d = 1 / d;
    result *= d * c;

    coefficient = -(a + iteration) * (sum + iteration) * value /
      ((a + even) * (a + even + 1));
    d = 1 + coefficient * d;
    if (Math.abs(d) < floor) d = floor;
    c = 1 + coefficient / c;
    if (Math.abs(c) < floor) c = floor;
    d = 1 / d;
    const delta = d * c;
    result *= delta;
    if (Math.abs(delta - 1) <= epsilon) return result;
  }
  throw new Error("Student-t calculation did not converge.");
}

function regularizedIncompleteBeta(value, a, b) {
  if (value === 0 || value === 1) return value;
  const factor = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(value) + b * Math.log1p(-value)
  );
  if (value < (a + 1) / (a + b + 2)) {
    return factor * betaContinuedFraction(a, b, value) / a;
  }
  return 1 - factor * betaContinuedFraction(b, a, 1 - value) / b;
}

function studentTCdf(value, degreesOfFreedom) {
  if (value === 0) return 0.5;
  const ratio = degreesOfFreedom /
    (degreesOfFreedom + value * value);
  const tail = regularizedIncompleteBeta(
    ratio,
    degreesOfFreedom / 2,
    0.5
  ) / 2;
  return value > 0 ? 1 - tail : tail;
}

export function studentTCriticalValue(level, degreesOfFreedom) {
  const probability = (1 + level) / 2;
  let low = 0;
  let high = 1;
  while (studentTCdf(high, degreesOfFreedom) < probability) high *= 2;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const midpoint = (low + high) / 2;
    if (studentTCdf(midpoint, degreesOfFreedom) < probability) low = midpoint;
    else high = midpoint;
  }
  return (low + high) / 2;
}
