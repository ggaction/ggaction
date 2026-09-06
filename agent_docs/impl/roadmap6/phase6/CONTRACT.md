# Phase 6 구현 계약 — Data statistics and composite lifecycle

## 기준과 승인

- 기준 source commit: `3c472321fba067efc131f8335f1383333481e575`.
- [Roadmap 6 전체 실행 승인](../APPROVAL.md)이 A/V/X와 0.0.13 release까지 포함한다.
- Phase 6의 통계·data action은 concrete values와 immutable provenance를 같은 호출에서 완성한다.
  `createDerivedData`의 definition-only advanced 경계는 유지한다.

## W1 — snapshot, owner revision, safe binding

- `createData`는 immutable source snapshot이며 values replacement API를 추가하지 않는다.
- 일반 materializing transform create는 새 immutable dataset ID를 만든다.
- 편집할 의미 단위가 있는 transform/composite만 stable logical owner와 새 revision을 사용한다.
- Bin2D의 same-ID create reauthor는 compatibility로 유지하고 `editBin2DData`를 권장 경로로 둔다.
- `bindMarkData({ target, data })`는 independent mark에만 공개한다. Materialized data, field/type/grain,
  coordinate, shared scales, guides, labels, selection/highlight를 포함한 전체 dependency plan을 immutable
  speculative branch에서 성공시킨 뒤 같은 transition을 반환한다.
- Composite와 owned transform은 한 layer만 바꾸지 않고 각각의 owner edit/filter lifecycle을 사용한다.

## W2 — reusable materializing transforms

- `createSummaryData`: explicit `groupBy`와 여러 named aggregate output을 final group grain으로 materialize한다.
- `createBinData`: 기존 histogram bin grammar를 재사용해 1D lower/upper/count와 optional members를 만든다.
- `createFoldData`: selected wide fields를 key/value row grain으로 펼치며 source fields를 보존한다.
- `createComputedData`: callback/eval 없이 closed arithmetic expression을 source-row grain에 적용한다.
- `createStackData`: Phase 4 stack grammar를 재사용해 group/category별 start/end/value/share를 materialize한다.
- 모든 action은 alias collision, missing/type, non-finite 결과와 bounded work를 첫 state change 전에 거부한다.

## W3 — interval method와 level

- CI provenance에 `method: "normal" | "student-t"`와 `level`을 저장한다.
- 기존 `ciLower`/`ciUpper` 결과는 normal approximation, 기존 Interval/Regression 결과는 Student-t로
  보존하여 migration 없이 명칭만 합치지 않는다.
- n=0/1, constant, grouped, missing과 invalid level/method를 별도 검증한다.

## W4 — filter lifecycle

- Final-item filter owner는 canonical source와 active recipe를 저장한다.
- repeated call은 `replace | compose`를 명시하고 `removeMarkFilter`가 원래 source로 복원한다.
- Empty 결과는 기존/explicit domain을 보존하고 mark items, labels, selection/highlight의 stale graphic을 정리한다.

## W5 — composite role revision

- `editViolinPlot`은 source/category/value/split/orientation을 한 owner edit에서 처리한다.
- ErrorBar/ErrorBand edit는 source, position, lower/upper 또는 interval summary 역할을 함께 preflight한다.
- 새 derived revision, owned siblings, scales, guides, labels와 highlights가 한 immutable 결과로 수렴한다.
- Appearance-only child actions은 유지하며 role editor가 ordinary resource 편집을 숨기지 않는다.

## 시각 범위

Data 값과 geometry가 달라지는 W2–W5 representative variant는 승인된 전체 실행 범위에서 stable
capability fixture로 작성한다. 각 variant는 independent primitive/reference와 public 결과의 semantic,
graphic, Canvas/PNG parity를 검증한다. W1의 generic bind 자체는 기존 mark recipe를 재물질화하므로 별도
새 모양 target 없이 compatible/incompatible state oracle로 검증한다.
