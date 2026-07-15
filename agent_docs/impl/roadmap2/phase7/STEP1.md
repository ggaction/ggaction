# Roadmap 2 — Phase 7 Step 1: Contract and Baseline Audit

## 목표

Phase 7 Planned inventory, existing interval/area/range/regression boundaries와 gapminder/cars fixtures를 감사해
error-band implementation baseline을 고정한다.

## 진행 상태

- [x] Phase 7 direct action/capability and Planned contract mapping audit
- [x] Existing area/line/interval/position implementation boundary audit
- [x] Gapminder canonical vertical and Cars horizontal dataset audit
- [x] Public defaults, inference, ownership and identity contract
- [x] Statistical/explicit independent-reference policy
- [x] Variant/Gate, manifest and artifact ownership
- [x] STEP status and conceptual documentation change

## Audit 결과

### Planned inventory

Phase 7 owns `createErrorBand`, `encodeXRange`, area `encodeY2`/`encodeYRange` reassignment,
regression delegation and composite ownership/storage. Area curve support is a shared accepted mark capability whose
first full consumer is this Phase. Existing `createIntervalData`, `encodeX2`, `encodeY2`, line curve and appearance
actions are reused rather than duplicated.

### Current implementation boundary

- Area materialization currently closes vertical x + y/y2 paths only.
- `encodeYRange` exists as wrapped y/y2 assignment; `encodeXRange` and area x/x2 are absent.
- Line marks already own all accepted curve interpolation and boundary appearance primitives.
- Regression band directly composes area + y range today; it delegates only after generic error band is complete.
- Renderer path dispatch is already backend-neutral, so Phase 7 extends path construction rather than renderer inference.

### Dataset audit

- Cars: 406 rows, ISO-like Year values, three Origin groups and finite Acceleration subset.
- Gapminder: 682 rows, 62 countries, 11 numeric years from 1955 through 2005, six cluster values and finite
  `life_expect`/`fertility`/`pop` fields.
- Gapminder owns grouped vertical and numeric-temporal coverage; Cars owns ungrouped horizontal range and
  string-temporal normalization coverage.
- Independent expected interval rows use sample variance and Student-t critical values without importing production code.

### Ownership

- Statistical rows: immutable derived dataset
- Interval/group/coordinate/scales: ordinary semantic encodings
- Area and optional boundaries: ordinary semantic layers
- Concrete commands/style: `graphicSpec` only
- Owner role: `errorBand`; deterministic interval/lower/upper child suffixes
- Rematerialization: ordered deduplicated union of area and boundary consumers

## 완료 조건

Implementation 전에 public contract, data roles, reusable owners, three visual Gates와 closeout boundary가 모호하지 않다.
