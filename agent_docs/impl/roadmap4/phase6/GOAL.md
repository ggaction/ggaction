# Roadmap 4 Phase 6 — FillPaint의 linear-gradient variant와 categorical gradient plot

## 목표

NCP-002를 범용 backend-neutral `FillPaint` concrete property contract의 첫 structured variant인
`LinearGradientPaint`로 구현한다. 그 위에 BoxPlot과 동일한 x/y positional family를 사용하는
`createGradientPlot`과 `editGradientPlot`을 complete vertical slice로 구현한다.

대표 차트 계약은 [Cars acceleration gradient plot](../chart/cars-acceleration-gradient-plot.md)이다.

## 진행 상태

- [x] P5-Exit 승인 상태와 string fill baseline 확인
- [x] exact `FillPaint`/profile/action parameter candidate contract
- [x] independent paint/density/profile oracle
- [x] Cars primitive gradient plot과 P6-A 승인
- [ ] `createGradientPlot`/`editGradientPlot` vertical slice와 P6-B 승인
- [ ] lifecycle, consumer matrix, declarations, docs와 package parity
- [ ] P6-Exit 사용자 승인

## 확정된 public 방향

- `createGradientPlot`/`editGradientPlot` 이름과 stable owner lifecycle을 사용한다.
- Gradient 종류별 action은 만들지 않는다. Existing solid string과 structured linear gradient는 같은 concrete
  `fill` property의 `FillPaint` 값이다.
- BoxPlot과 같이 x/y 중 정확히 하나가 categorical, 하나가 quantitative다. `category`/`value` alias는 만들지 않는다.
- Orientation, data, coordinate, scales와 target은 같은 family inference를 사용한다.
- create-before-encode와 encode-before-create를 모두 지원하고 같은 final state로 수렴한다.
- Category당 한 gradient strip과 optional center rule을 만든다.
- Future violin과 다른 categorical uncertainty view도 같은 positional family contract를 따른다.

## P6-A에서 확정할 후보 defaults

- Density: Gaussian, `bandwidth: "auto"`, shared auto extent, `steps: 64`, `normalization: "unit"`
- Width: `{ band: 0.7 }`
- Gradient: sequential `blues`, opacity `[0, 1]`, global density range. Opacity는 materialization이 각 stop의
  alpha-bearing concrete color에 반영하며 paint schema에 별도 renderer opacity 명령을 저장하지 않음
- Center: median, dark stroke, `1.5` logical pixels; `false`로 완전 제거
- Paint: `FillPaint = string | LinearGradientPaint`, item-local normalized endpoints와 `{ offset, color }` ordered
  stops; equal adjacent offsets는 hard stop

후보는 P6-A 승인 전 구현 근거를 확인해 조정할 수 있다. Public parameter 이름을 source에 고정하기 전에 primitive
source, concrete state와 image를 함께 검토한다.

## State ownership

- Requested density/profile policy와 resolved sample extent/range: generated semantic transform provenance
- Category당 sampled value/intensity, range endpoints와 center: immutable profile dataset
- Palette와 opacity mapping intent: stable GradientPlot materialization config
- Item-local normalized endpoints와 concrete stops: `graphicSpec`의 `FillPaint`
- Backend gradient object: renderer-local ephemeral value이며 program state에 저장하지 않음
- Stable owner/revision/rebind/release: `editGradientPlot`

Profile은 raw source를 직접 참조하는 하나의 generated revision이다. Derived-on-derived replacement cascade를
만들지 않으며 density pure grammar를 재사용해 category당 one-row profile을 계산한다.

## 단계

1. [STEP1](./STEP1.md) — exact contract와 independent oracle
2. [STEP2](./STEP2.md) — paint primitive, Cars visual target와 P6-A
3. [STEP3](./STEP3.md) — gradient-profile semantic lifecycle
4. [STEP4](./STEP4.md) — create/edit facade와 P6-B
5. [STEP5](./STEP5.md) — inference, lifecycle와 consumer matrix
6. [STEP6](./STEP6.md) — docs/package/cumulative closeout와 P6-Exit

## 승인 Gate

| Gate | 상태 | 승인 대상 | 승인 전 차단되는 작업 |
| --- | --- | --- | --- |
| P6-A | approved | exact `FillPaint`/profile/API contract, primitive source와 Cars PNG | public facade 구현 |
| P6-B | ready-for-review | create/edit public chains, state/trace와 primitive/public Browser/PNG parity | Phase closeout |
| P6-Exit | planned | lifecycle/consumer matrix, Current inventory, docs/package와 누적 test | Phase 7 |

모든 Gate는 hard pause다.

## Non-goals

- 별도 paint create/edit action, radial/conic/pattern gradient, gradient stroke 또는 user-space paint coordinates
- lower/upper interval을 주 입력으로 받는 별도 GradientIntervalPlot
- independent per-category intensity domain, subgroup offset 또는 multiple profile overlay
- violin geometry, ridgeline 또는 raincloud component를 Phase 6에 함께 구현
- Canvas/backend gradient object를 semantic/graphic state에 저장
