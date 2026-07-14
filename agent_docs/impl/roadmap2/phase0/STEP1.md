# Roadmap 2 — Phase 0 Step 1: Artifact and Gallery Infrastructure

## 목표

Roadmap 2 chart variant의 primitive/public PNG pair를 안전한 계층에 생성하고 한 HTML gallery에서
비교할 수 있는 reusable test infrastructure를 완성한다.

## 진행 상태

- [x] `name` 기반 legacy flat output 유지
- [x] `{ roadmap, chart, variant, kind }` structured output 추가
- [x] kebab-case segment와 closed kind validation
- [x] Recursive directory creation과 cleanup
- [x] Gallery filesystem discovery와 stable lexical order
- [x] HTML escaping, relative image path와 responsive two-column layout
- [x] Primitive-only와 complete pair status
- [x] Public-only invalid state rejection
- [x] Cars scatterplot baseline pair
- [x] Variant title과 목표 user-facing call chain metadata
- [x] Primitive/public metadata conflict rejection
- [x] Unit, contract, chart와 render regression
- [x] Static gallery browser smoke verification

## Artifact 호출 계약

기존 chart regression은 계속 `name`을 사용할 수 있다.

```javascript
await assertRenderedPNG(program, {
  name: "cars-scatterplot",
  width: 640,
  height: 400
});
```

Roadmap 2 variant는 structured artifact를 사용한다.

```javascript
await assertRenderedPNG(program, {
  artifact: {
    roadmap: "roadmap2",
    chart: "cars-scatterplot",
    variant: "baseline",
    kind: "primitive",
    title: "Cars scatterplot baseline",
    userFacingCallChain: `ggaction()
  .createCanvas(...)
  .createData(...)
  .createPointMark(...)
  .encodeX(...)
  .encodeY(...)
  .encodeColor(...)
  .createGuides();`
  },
  width: 640,
  height: 400
});
```

`name`과 `artifact`를 함께 사용할 수 없다. `roadmap`은 현재 `"roadmap2"`, `kind`는
`"primitive" | "user-facing"`만 허용한다. Chart와 variant는 안전한 kebab-case segment다.
`title`과 `userFacingCallChain`은 variant의 필수 metadata이며 첫 render에서 같은 directory의
`variant.json`에 기록된다. Primitive와 user-facing render가 서로 다른 metadata를 제시하면 실패한다.

## Gallery 계약

- Filesystem의 chart/variant directories와 그 안의 `variant.json`이 canonical metadata다.
- 별도 수동 gallery registry를 만들지 않는다.
- `primitive.png`는 entry의 필수 기준이다.
- `user-facing.png`는 primitive 승인 뒤 추가되는 optional pair다.
- Gallery는 각 variant의 목표 user-facing call chain을 PNG pair 위에 표시한다.
- Gallery source와 image URL은 HTML escape한다.
- Desktop은 two-column, mobile은 one-column layout이다.
- Gallery는 generated artifact이므로 git에 commit하지 않는다.

## 검증

- `test/unit/support/artifacts.test.js`: path, traversal, cleanup, discovery, ordering, HTML과 invalid state
- `test/charts/cars-scatterplot/png.render.js`: Roadmap 2 baseline pair
- `npm run test:render`: cleanup → all render tests → gallery generation
- `scripts/test-roadmap-gallery.js`: desktop/mobile layout, call chain, image load, heading/status와 console/page error
