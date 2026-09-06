# Phase 6 W1 결과 — Dataset lifecycle와 안전한 bind

## 결과

- `bindMarkData({ target, data })`를 Full public action으로 추가했다.
- Existing materialized dataset만 받으며 definition-only `createDerivedData` 결과를 명시적으로 거부한다.
- 전체 `rebindLayerData` + scale→mark→guide→layout→highlight plan을 immutable speculative branch에서
  선실행하여 field/type/coordinate/shared-consumer failure가 partial trace/state를 만들지 않는다.
- Box/ErrorBar/ErrorBand/Regression/Gradient owner와 density/horizon/final-item filter consumer는 generic
  single-layer bind를 거부하고 owner lifecycle로 안내한다.
- `createData` snapshot, general immutable transform create, stable owner revision의 차이를 current contract와
  public data documentation에 명시했다. Bin2D compatibility reauthor와 preferred edit 경계는 유지했다.

## 검증

- Focused: `node --test test/unit/actions/data/bind-mark-data.test.js` — 3/3 pass.
- Unit: `npm run test:unit` — pass.
- Contracts: `npm run test:contracts` — 310/310 pass.
- Packed consumer: `npm run test:package` — pass.
- Packed artifact SHA-256: `c3684fb72b0f6c3d77c329272334a1a37577eb84542b86a8e435e69b40b7f94d`.
- Bundle: Full 266,246 gzip bytes, Basic 147,958, SVG 6,437; current caps 안에서 통과했다.
- Generated action cards: 202, schema/type/snippet contract 통과.

## 호환성과 남은 범위

- `rebindLayerData`는 internal wrapped transition으로 유지되어 기존 composite/facet trace를 바꾸지 않는다.
- Basic entry에는 새 lifecycle action을 추가하지 않았다.
- W2의 reusable transforms가 만드는 materialized dataset은 compatible independent mark에서 이 action으로
  소비할 수 있다.
- W4/W5가 owned filter/composite의 aggregate source revision을 완성한다.
