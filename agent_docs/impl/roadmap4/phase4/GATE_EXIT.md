# P4-Exit — Deterministic bounded point jitter closeout

## 진행 상태

- [x] P4-A contract/primitive 승인
- [x] P4-B public vertical slice 승인
- [x] runtime, strict declarations와 package root type exports 동기화
- [x] Current contract owner와 Planned cleanup
- [x] canonical public examples, Browser Canvas와 2x Node PNG
- [x] executable Phase closeout audit
- [x] full tests, coverage, render, packed-package와 built-docs verification
- [x] 사용자 승인

Gate 상태: `approved` (2026-07-20)

Closeout checkpoint: `d2b34af` (`origin/main`)

P4-Exit 승인 전에는 Phase 5 implementation을 시작하지 않는다.

## 확정 public surface

```typescript
type JitterMaxOffset =
  | { pixels: number; band?: never }
  | { pixels?: never; band: number };

interface JitterPointsOptions {
  target?: string;
  channel: "x" | "y";
  maxOffset: JitterMaxOffset;
  seed?: string | number;
  key?: string;
}

interface RemoveJitterOptions {
  target?: string;
}

jitterPoints(options: JitterPointsOptions): ChartProgram;
removeJitter(options?: RemoveJitterOptions): ChartProgram;
```

세 option type과 두 method는 package root TypeScript declaration에서 export된다. Runtime action은 default
`ggaction` entry의 `ChartProgram`에 등록되며 extension primitive나 renderer API를 추가하지 않는다.

## 최종 계약

- Point의 semantic x/y mapping과 source values는 보존하고 concrete center만 이동한다.
- Requested/resolved state는 `materializationConfigs.jitters[target]`이 소유한다.
- 같은 target 재호출은 semantic base에서 assignment를 교체하며 offset을 누적하지 않는다.
- `removeJitter`는 assignment를 structural remove하고 base scale position을 복구한다.
- Pixel offset은 logical Canvas pixels다. Band offset은 categorical effective slot width의 `(0, 0.5]` 비율이다.
- Portable `jitter-uniform-v1` hash와 explicit seed를 사용하며 implicit randomness는 없다.
- Optional unique key는 data reorder 뒤 identity를 유지하고, 생략 시 source item index를 사용한다.
- Complete shape/radius/stroke extent가 plot과 applicable category slot 안에 남도록 clamp한다.
- Canvas, scale, data/filter, size, shape, stroke, selection/highlight와 facet replay가 assignment를 재적용한다.
- Renderer는 fully materialized `graphicSpec`만 읽는다.
- Polar jitter, collision-free beeswarm/packing, density placement와 source-value noise는 지원하지 않는다.

## Current inventory와 ownership

- `jitterPoints`와 `removeJitter`는 `ACTION_INDEX` Current에 각각 정확히 한 번 존재한다.
- 두 action은 Planned action/capability와 `MARKS_AND_PATHS.md`에 남지 않는다.
- `agent_docs/contract/current/MARKS.md`가 signature, lifecycle, state/effect, errors와 coverage의 canonical owner다.
- `test/contracts/roadmap4-phase4-closeout.test.js`가 inventory, root types, docs/package evidence와 두 visual pair를 고정한다.
- `test/gates/point-jitter`의 승인 primitive는 complete vertical slice가 된 뒤
  `test/charts/point-jitter`로 이동했다.

## 실행 증거

- Phase closeout audit: `4/4` pass.
- Full suite: `1650/1650` pass.
- Coverage: `94.86%` lines, `90.24%` branches, `98.55%` functions; critical floors `55/55` pass.
- Browser Canvas: `31/31` pass, including canonical `cars-origin-jitter` browser example.
- Node render: `117/117` pass; Roadmap 2/3/4 galleries verified in Chromium.
- Primitive/public pairs: exact semantic, graphic, Canvas-call and decoded-pixel equality.
- Package artifact: `330` entries, `290093` packed bytes, `1352893` unpacked bytes.
- Installed tarball SHA-256: `6e6b437f2c2fb3f931ce0206338b02d5324298ce349c63ba9f933fcfacb1eac1`.
- Installed package: Node runtime, point jitter/removal, Browser-safe entry, PNG, strict TypeScript named types,
  tutorials와 private-export rejection pass.
- Docs source/generation: `27/27` pass.
- Jekyll: `85` built pages validated. Desktop search and every page at `320px`, `390px`, `768px` pass.

## 대표 코드와 이미지

Canonical executable source: `examples/point-jitter/program.js`.

```javascript
.jitterPoints({
  target: "observations",
  channel: "x",
  maxOffset: { band: 0.168 },
  seed: "cars-origin-strip",
  key: "Name"
})
```

- Cars public PNG:
  `.artifacts/test/png/roadmap4/point-jitter/cars-origin-jitter/vertical-band/user-facing.png`
- Gapminder public PNG:
  `.artifacts/test/png/roadmap4/point-jitter/gapminder-cluster-jitter/horizontal-band/user-facing.png`

## 호환성과 다음 단계

- Additive API이며 existing point encoding, selection, Canvas/PNG renderer와 package exports를 깨지 않는다.
- Phase 5의 window/2D-bin derived data는 이 jitter state owner와 독립적으로 진행한다.
- 2026-07-20 사용자 승인으로 Phase 4를 `completed`로 전환했다.
- Phase 5는 별도 시작 요청 전까지 구현하지 않는다.
