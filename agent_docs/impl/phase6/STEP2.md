# Phase 6 — Step 2: Primitive Density Area Baseline

## 목표

기존 stable actions와 low-level primitives만으로 완전한 density area chart를 작성해 이후
public action program의 executable graphical oracle로 사용한다.

## 진행 상태

- [x] Density fixture를 이용한 concrete chart values
- [x] Derived dataset semantic provenance
- [x] Area x/y/group/color semantic contract
- [x] Origin별 baseline-closed path
- [x] Shared x/y/color scales
- [x] Raw axes와 horizontal/vertical grids
- [x] Top three-column swatch legend
- [x] Title/subtitle와 explicit graphical order
- [x] Acceptance, graphicSpec-only rendering, immutability
- [x] 2× PNG 직접 확인, full regression, commit, push

## Primitive program 원칙

- `createCanvas`, `createData`와 현재 재사용 가능한 action은 사용한다.
- 아직 없는 density transform, baseline area, top legend만 `editSemantic`,
  `createGraphics`, `editGraphics`의 한 chain으로 작성한다.
- Fixture는 expected values를 제공하지만 primitive program 내부에서 raw action 호출을
  batching helper로 숨기지 않는다.
- Renderer가 `semanticSpec`, context, trace 없이 `graphicSpec`만으로 그릴 수 있어야 한다.
- STEP2의 derived dataset은 source 관계와 concrete values를 먼저 저장한다. Exact density
  transform object와 validation은 STEP3에서 추가하고 primitive oracle도 함께 갱신한다.

## 목표 graphical order

```text
canvas
→ horizontalGridLines
→ verticalGridLines
→ densities
→ x/y axes
→ color legend swatches/labels/title
→ chart title/subtitle
```

## 검증 기준

- `densities`는 Origin cardinality와 같은 path child 수를 가진다.
- 각 child points는 `steps + 2`개이고 `closed: true`다.
- 첫 점과 마지막 점은 density zero baseline에 있다.
- Paths, axes, grid, legend가 같은 resolved scale/domain을 사용한다.
- 2× PNG는 logical size의 정확히 두 배이고 세 tableau10 색과 충분한 ink를 포함한다.

## 검증 결과

- 3개의 Origin path가 각각 100 sample과 2 baseline points를 가진다.
- Horizontal 6개, vertical 3개 grid line이 area보다 먼저 render된다.
- Top legend, title/subtitle, axes를 포함한 1440×1000 PNG를 직접 확인했다.
- `graphicSpec` only rendering과 caller-owned cars immutability가 통과했다.
- `npm test`: 370 passing
- `npm run test:render`: 6 passing
- `npm run test:coverage`: lines 94.41%, branches 89.14%, functions 98.41%
