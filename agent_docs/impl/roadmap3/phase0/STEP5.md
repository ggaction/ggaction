# STEP 5 — Roadmap 3 Artifact, Gallery and Executable Evidence Foundation

## 진행 상태

- [x] Existing Roadmap 2 artifact path와 metadata 동작 보존
- [x] Roadmap 3 capability → chart → variant artifact path 추가
- [x] Roadmap 3 Phase/capability metadata exact schema 추가
- [x] Primitive/public render가 같은 metadata owner를 사용하도록 일반화
- [x] Visual variant manifest의 Roadmap 3 scope validation 추가
- [x] Roadmap 2와 Roadmap 3 gallery를 한 generator에서 생성
- [x] Empty Roadmap 3 gallery의 desktop/mobile 검증 지원
- [x] Roadmap 3 hierarchy, metadata conflict와 unsafe path 회귀 테스트 추가
- [x] Existing unit/contract suite 통과
- [x] Polar, composition, facet runtime과 public docs는 변경하지 않음

## 목적

Roadmap 3의 visual Gate가 실제 Polar 또는 composition 구현보다 먼저 사용할 executable evidence 기반을
고정한다. Primitive와 user-facing 결과는 독립 program으로 생성하지만 하나의 manifest, metadata와
artifact identity를 공유한다. 이 STEP은 chart 기능을 추가하지 않고 이후 Phase가 같은 검증 흐름을
반복할 수 있는 test infrastructure만 확장한다.

## Canonical artifact identity

Roadmap 3 path는 Phase가 아니라 stable capability로 grouping한다.

```text
.artifacts/test/png/roadmap3/
└─ <capability>/
   └─ <chart>/
      └─ <variant>/
         ├─ variant.json
         ├─ primitive.png
         └─ user-facing.png
```

예를 들어 첫 Polar point Gate의 artifact identity는 다음과 같다.

```javascript
artifact: {
  roadmap: "roadmap3",
  phase: "phase2",
  capability: "polar-point"
}
```

Manifest가 소유하는 `chart`, `variant`, `title`, `callChain`과 render kind를 결합하면 다음 concrete path가
된다.

```text
.artifacts/test/png/roadmap3/polar-point/cars-polar-scatterplot/baseline/primitive.png
.artifacts/test/png/roadmap3/polar-point/cars-polar-scatterplot/baseline/user-facing.png
```

Phase는 일정 관리 정보이고 capability는 장기 artifact identity다. 따라서 Phase assignment가 조정되어도
gallery URL과 chart hierarchy가 불필요하게 바뀌지 않는다.

## Exact metadata contract

Roadmap 3의 `variant.json`은 다음 key만 허용한다.

```json
{
  "version": 1,
  "roadmap": "roadmap3",
  "phase": "phase2",
  "capability": "polar-point",
  "chart": "cars-polar-scatterplot",
  "variant": "baseline",
  "title": "Cars Polar Scatterplot",
  "userFacingCallChain": "chart()..."
}
```

- Path identity인 capability/chart/variant와 metadata identity가 다르면 실패한다.
- Phase, title 또는 call chain이 primitive/public render 사이에서 달라지면 conflict로 실패한다.
- Unknown key, missing key, unsafe path segment와 empty display text를 허용하지 않는다.
- Roadmap 2의 기존 metadata schema와 artifact location은 변경하지 않는다.

## Manifest and render flow

Roadmap 3 visual manifest는 기존 `defineVisualVariant`에 scope만 추가한다.

```javascript
defineVisualVariant({
  chart: "cars-polar-scatterplot",
  variant: "baseline",
  title: "Cars Polar Scatterplot",
  callChain: `chart()
    .createPointMark()
    .encodeTheta({ field: "Acceleration" })
    .encodeR({ field: "Horsepower" });`,
  artifact: {
    roadmap: "roadmap3",
    phase: "phase2",
    capability: "polar-point"
  },
  primitive,
  userFacing,
  width: 520,
  height: 520,
  regions
});
```

Render test는 이 manifest에서 두 program을 같은 run에 생성하고 다음을 검증한다.

1. Displayed call chain이 user-facing program state/trace와 일치한다.
2. Primitive와 user-facing PNG가 모두 non-empty plot-region evidence를 가진다.
3. 두 decoded pixel hash가 정확히 같다.
4. 두 render가 같은 `variant.json`을 공유한다.

Primitive approval 전에는 `userFacing`을 생략할 수 있다. 이때 gallery는 primitive image와
`Awaiting visual confirmation` 상태를 보여준다.

## Gallery contract

`npm run test:render`는 PNG root를 reset한 뒤 render suite를 실행하고 Roadmap 2와 Roadmap 3 gallery를
모두 생성·검증한다.

```text
Roadmap 3 gallery
└─ capability
   └─ chart
      └─ variant card
         ├─ Phase badge and review status
         ├─ exact target call chain
         ├─ primitive image
         └─ user-facing image or approval placeholder
```

Roadmap 3 artifact가 아직 없어도 valid empty gallery가 생성된다. 이후 첫 Gate manifest가 추가되면 같은
generator가 별도 script나 copied HTML 없이 자동으로 hierarchy를 수집한다.

## Executable evidence

Focused tests는 다음을 고정한다.

- Legacy flat, Roadmap 2와 Roadmap 3 path resolution
- Kebab-case path safety와 closed artifact options
- Roadmap 3 metadata creation, repeated pair reuse와 conflict detection
- Capability/chart/variant deterministic collection order
- Primitive 없는 public artifact rejection
- Metadata 없는 visible primitive rejection
- Escaped, responsive gallery와 relative image path
- Visual manifest의 exact Roadmap 3 scope requirement

## 범위 밖

- 실제 Roadmap 3 primitive 또는 user-facing chart
- Polar coordinate, child program과 facet runtime
- Current action catalog 또는 public TypeScript surface
- README와 user documentation
- Roadmap 2 artifact migration

다음 STEP은 이 evidence format을 사용해 Proposed inventory와 owning Phase를 최종 감사하고 Gate A에
Roadmap 전체 결정을 제시한다.
