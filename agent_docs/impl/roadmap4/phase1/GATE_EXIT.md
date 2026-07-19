# P1-Exit — Runtime stabilization closeout

## 진행 상태

- [x] B-002 current-source 최소 재현
- [x] B-001 current-source 최소 재현
- [x] B-004 current-source 최소 재현
- [x] finding별 Browser Canvas와 Node PNG 회귀
- [x] 누적 전체 test suite
- [x] coverage와 critical floor
- [x] package artifact와 installed-package consumer
- [x] current contract와 generated catalog 동기화
- [x] 사용자 승인

Gate 상태: `approved` (2026-07-20)

## 누적 runtime 결과

### B-002 — default point radius

- Size와 radius를 모두 생략한 complete Cartesian/Polar point는 concrete child radius `3`을 가진다.
- Field-driven size와 explicit `encodeRadius`가 default보다 우선하며 earlier program은 바뀌지 않는다.
- Renderer에는 새 fallback이 없고 fully materialized `graphicSpec`만 소비한다.
- 회귀: `test/contracts/point-default-radius.test.js`
- PNG: `.artifacts/test/png/roadmap4/phase1/B-002/default-point-radius.png`

### B-001 — layered datum rule

- Layered position을 상속한 rule에 datum y를 지정하면 inherited x만 제거되어 horizontal full-span 한
  개가 생긴다. Datum x는 대칭적으로 vertical full-span을 만든다.
- Field endpoint는 inherited orthogonal field를 보존하고 explicit-data rule은 provenance 정리를 적용하지 않는다.
- 0-item silent success 대신 renderable item 또는 명시적 validation 결과만 남는다.
- 회귀: `test/contracts/rule-inherited-datum-span.test.js`
- PNG: `.artifacts/test/png/roadmap4/phase1/B-001/layered-datum-full-span.png`

### B-004 — quantitative line order

- `encodeX`→`encodeY`와 `encodeY`→`encodeX`는 같은 line layer, ID-normalized scale set,
  resolved scales, `graphicSpec`과 Canvas calls를 만든다.
- `semanticSpec.scales`의 배열 삽입 순서는 action history를 보존하므로 전역 정렬하지 않는다.
- Quantitative x partial에 aggregate y를 붙이는 invalid completion은 temporal-x 요구 오류로 원자적으로 거부한다.
- 회귀: `test/contracts/line-position-order.test.js`
- PNG: `.artifacts/test/png/roadmap4/phase1/B-004/quantitative-line-x-then-y.png`

## 검증 증거

- Current-source 최소 재현: B-002 radii `[3, 3, 3]`; B-001 semantic channels `["y"]`와 item count `1`;
  B-004 두 순서 모두 item count `1`, `graphicSpec` equality `true`.
- Full suite: `1559/1559` 통과.
- Coverage: lines `94.89%`, branches `90.26%`, functions `98.54%`; critical floors `55/55` 통과.
- Package check: `ggaction@0.0.4`, 320 entries, packed 279,952 bytes, unpacked 1,300,979 bytes.
- Installed-package consumer: 통과.
- Contract suite: `140/140` 통과. Generated action catalog check 통과.
- 기본 `~/.npm` cache의 root-owned file 문제는 제품 실패가 아니다. Package 관련 검증은
  `npm_config_cache=/tmp/ggaction-npm-cache`로 실행했다.
- `git diff --check`: 통과.

## API와 문서 영향

- Public action signature, TypeScript declaration, runtime export와 semantic schema 변경 없음.
- Current internal contracts와 generated action catalog는 구현과 동기화했다.
- Public `docs/`와 `README.md`는 release-scoped 원칙에 따라 수정하지 않았다.
- Point default, rule inheritance precedence, quantitative line 양방향 authoring은 Phase 15 checklist에 전달했다.

## 승인 후

2026-07-20 사용자 승인으로 Phase 1을 닫고 Phase 2 진입 조건을 열었다.
