# Roadmap 6 Phase 10 — Comparison and composition

## 상태와 목표

상태: planned. 구현·사용자 승인 기록 없음.

하나의 chart를 반복·배치·편집하는 상위 계층을 확장하고 shared scale/guide와 child recipe의 책임을 보존한다.

## 선행 조건

- [Phase 9](../phase9/GOAL.md)의 R6-P9-X 승인과 필요한 결과.

## 구체적인 작업 묶음

### R6-P10-W1 — Facet grid·repeat·order

- 상대 규모: L. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D19, F19.
- 작업: Row×column facet과 field repeat를 목적별로 제공한다. Observed vs full category combinations, empty cells, order와 shared domain을 명시한다.
- 완료 조건: 2D facet identity/order, empty-cell policy, shared/independent scale 결과, legend 설명 보존. 전체 source edit 후 cell들이 같은 recipe로 재생성.

### R6-P10-W2 — Named child 구조 편집

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D19, F19.
- 작업: Concat에 insert/remove/reorder를 추가하고 stable child name을 target으로 한다. Facet-derived child는 arbitrary replacement 대신 허용된 override policy로만 편집한다.
- 완료 조건: 반복 삽입 ID conflict, 마지막 child 제거, reorder geometry, previous program 보존. Recipe와 concrete child가 어긋나는 편집 거부.

### R6-P10-W3 — 좌표 family와 guide 승격 matrix

- 상대 규모: L. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D19, F19.
- 작업: Cartesian/Polar/Parallel cell의 실제 supported matrix를 작성한다. Compatible guides의 부모 승격과 per-cell ownership을 family별로 검증한다.
- 완료 조건: 지원 셀에서 resize/data/scale/theme edit 수렴. Unsupported 조합은 explicit reason. Polar/Parallel 지원을 문서만으로 선언하지 않음.

## 검증과 종료

- [VALIDATION.md](../VALIDATION.md)의 공통 matrix와 각 작업의 acceptance를 적용한다.
- Runtime/type/contract/card/docs 변경은 각 conceptual change와 함께 완료한다.
- [STEP1.md](STEP1.md)의 실행 체크를 갱신하고 [GATES.md](GATES.md)에 실제 증거만 기록한다.
- R6-P10-X 승인 전 이 결과를 전제로 하는 다음 단계 구현을 시작하지 않는다.
- 구현하지 않은 후보는 완료로 표시하지 않고 [추적 원장](../TRACEABILITY.md)에 처분을 남긴다.
