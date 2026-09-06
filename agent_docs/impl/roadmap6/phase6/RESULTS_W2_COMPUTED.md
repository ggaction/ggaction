# Phase 6 W2-D 결과 — Bounded computed data

## 결과

- `createComputedData({ id, source?, as, expression })`를 추가했다.
- Expression은 callback, source string, `eval`이 없는 closed data AST다. Leaf는 finite constant와
  quantitative field, binary operation은 add/subtract/multiply/divide, unary operation은
  negate/absolute다.
- Output은 source-row grain과 모든 original cell을 보존하고 한 finite quantitative field를 추가한다.
- Exact expression tree를 transform provenance에 저장하며 facet에서는 row-preserving owner로 replay한다.
- `computed` transform을 advanced `createDerivedData`, topology/replay registry와 strict TypeScript union에
  연결했다.

## 오류와 불변성

- Missing/non-finite operands, zero denominator, overflow/non-finite intermediate result, existing output
  collision과 malformed/unknown node를 첫 state change 전에 거부한다.
- Expression은 최대 depth 16, 128 nodes이며 materialization work는 최대 10,000,000 row-nodes다.
- Caller expression을 deep-own하고 실패한 호출은 이전 program과 source rows를 변경하지 않는다.
- Conditionals, null propagation, group aggregate, transcendental function과 arbitrary code evaluation은
  지원하지 않는 경계로 남겼다.

## 검증

- Focused computed/derived/registry tests: 10/10 pass.
- Unit suite: 2,161/2,161 pass.
- Contracts: 310/310 pass.
- Packed consumer: reusable ratio runtime, `ComputedDataOptions`, `ComputedExpression`, `DatasetTransform`
  compile 포함 pass.
- Packed artifact SHA-256: `aa6b59830fdebdf50e0934cae18687fa55852a78a162a1b3dc1a89cc56e92092`.
- Bundle 측정: Full 269,775 gzip bytes / 416 modules, Basic 147,988 / 251, SVG 6,437 / 15.
- Package bound는 새 public action+grammar source 2개에 맞춰 entries 469, packed 546,000 bytes로
  조정했다. Full gzip bound는 실측 증가를 반영해 271,000 bytes로 조정했고 Basic/SVG는 유지했다.
