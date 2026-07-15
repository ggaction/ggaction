# Roadmap 2 — Phase 3 Step 8: Position and Orientation Primitives

## 목표

Broader position compatibility 구현 전에 vertical temporal bar와 horizontal ordinal bar의 final scale,
rect, axes와 grid geometry를 raw primitive로 승인받는다.

## 진행 상태

- [x] `temporal-x` jobs-derived UTC-compatible reference
- [x] `horizontal-bar` quantitative x/ordinal y reference
- [x] Orientation inference target state
- [x] Temporal/ordinal/quantitative scale domain과 range fixtures
- [x] Rect x/y/width/height reference
- [x] Top-level drawing order, axes와 directional grids
- [x] Inferred guide title/format target
- [x] Expanded target chain metadata
- [x] Browser와 2× primitive PNG 생성
- [ ] Gate D 사용자 visual confirmation
- [ ] Feedback 반영과 primitive 재확인
- [x] STEP status, conceptual commit와 push

## Primitive 원칙

- Reference scale mapping과 orientation은 production position/bar materializer와 독립적으로 계산한다.
- Primitive는 future broader field-type compatibility 또는 orientation inference를 호출하지 않는다.
- `temporal-x` input derivation은 manifest가 소유하고 normalized timestamps를 concrete values와 혼동하지 않는다.
- Horizontal bar는 x measure와 y category의 역할을 graphic dimensions까지 명시한다.

## 완료 조건

두 orientation primitive의 scale/rect/guide geometry와 target public chain이 승인된다.

## Gate D 대상

### `temporal-x`

- Manifest가 각 jobs row에 UTC `yearDate` timestamp를 추가하고 primitive dataset이 그 값을 소유한다.
- 15개 observed year와 `men → women`을 집계해 30개 grouped rect를 만든다.
- Time domain은 1850–2000이고 auto graphical range는 첫/마지막 bar가 plot 안에 들어오도록 inset된다.
- 1890 tick은 존재하지만 row가 없으므로 bar가 없고, 1880–1900 간격은 실제 시간 간격을 보존한다.

### `horizontal-bar`

- x는 quantitative `mean(perc)`, y는 ordinal `year`이며 별도 orientation property를 저장하지 않는다.
- 각 year에서 `men → women`을 zero부터 누적한 30개 horizontal rect를 만든다.
- x domain은 `[0, 0.004]`, y category bandwidth는 `350 / 15`, bar height는 그 band의 `0.72`다.
- Horizontal orientation에 맞춰 x scale 기반 vertical grid와 `mean(perc)` x title을 사용한다.

두 primitive trace에는 future `encodeX`, `encodeY`, `encodeColor`, `encodeBarWidth`, `createGuides`가 없다.
