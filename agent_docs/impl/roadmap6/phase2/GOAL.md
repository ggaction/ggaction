# Roadmap 6 Phase 2 — Shared authoring semantics

## 상태와 목표

상태: completed. 2026-09-05 사용자가 [R6-P2-X 결과](REVIEW.md)를 “승인한다”로 승인했다. W1–W5와 여섯 public 흐름의 구현·검증을 마쳤으며 남은 D04/D14 등의 후속 owner는 결과 문서에 명시했다.

새 facade가 물려받을 guide, group, appearance, inference, incomplete-state 계약을 정리한다. 같은 결정을 여러 owner가 다르게 수행하지 않게 한다.

정확한 signature·오류/migration·owner·entry 범위는 [CONTRACT_REVIEW.md](CONTRACT_REVIEW.md), 실제 baseline 및 미래 acceptance는 [VALIDATION.md](VALIDATION.md)가 소유한다.

## 선행 조건

- [Phase 1](../phase1/GOAL.md)의 R6-P1-X 승인과 필요한 결과.

## 구체적인 작업 묶음

### R6-P2-W1 — Complete facade와 guide 확보

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D04, D05.
- 작업: Box/Gradient deferred 역할을 metadata에 명시한다. H0는 compatible guide를 재사용하고 missing만 생성한다. Low-level create strictness는 유지한다. Box guides default는 초기에는 유지하는 안을 확정한다.
- 완료 조건: Scatter→Line 기본 조합 성공, incompatible scale guide는 atomic conflict. omitted/{} /false matrix가 facade와 child별로 명시됨.

### R6-P2-W2 — Series와 appearance 분리

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D02, D10.
- 작업: encodeGroup의 identity와 color/dash/width의 final-series appearance를 분리한다. Multi-key group을 충돌 없는 구조로 다룬다. Existing inferred grouping의 호환 경로를 유지한다.
- 완료 조건: country group+continent color 성공; 한 series의 모호한 appearance 거부; field 작성 순서와 group edit 뒤 수렴.

### R6-P2-W3 — Style mode와 shorthand 정합성

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D06.
- 작업: Line constant/field width·opacity, Scatter point radius와 basic child, Rule 생성·편집을 공통 owner로 연결한다. ErrorBand fill·Point opacity·Line width의 field 충돌과 명시적 assignment 교체, ErrorBand override 해제를 정리한다.
- 완료 조건: create/edit/field/constant 지원 matrix 일치. Override 뒤 scale·legend가 거짓 의미를 설명하지 않음. Local highlight override 별도 유지.

### R6-P2-W4 — Inference·JSON opt-out·분석 defaults

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D09, D10.
- 작업: Explicit type/temporalUnit/aggregate를 우선하는 선택표를 검토한다. 현재 owner가 없는 source schema API는 이번 단계에 추가하지 않는다. Create-side groupBy:false의 JSON round trip을 제공하고 create omission과 edit preservation을 구분한다.
- 완료 조건: numeric nominal color, mean Bar, year/timestamp 기존 결과 비교. 생략·false·undefined·auto의 source/trace/serialization 의미를 검사.

### R6-P2-W5 — 유효한 incomplete intent 보존

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D14, B01의 lower measure-first 관측 P37. [W5 구현·검증 결과](RESULTS.md#w5--bar-incomplete-authoring)를 기록했다.
- 작업: Bar width와 measure-first encoding 중 geometry 없이 검증 가능한 intent를 보존한다. Missing positions 완료 시 원래 requested width와 role을 적용한다.
- 완료 조건: width-first/last, category-first/measure-first의 semantic/graphic 동등성. Invalid field/width는 즉시 거부, placeholder graphics 없음.

## 검증과 종료

- [VALIDATION.md](../VALIDATION.md)의 공통 matrix와 각 작업의 acceptance를 적용한다.
- Runtime/type/contract/card/docs 변경은 각 conceptual change와 함께 완료한다.
- [STEP1.md](STEP1.md)의 실행 체크를 갱신하고 [GATES.md](GATES.md)에 실제 증거만 기록한다.
- R6-P2-X 승인 전 이 결과를 전제로 하는 다음 단계 구현을 시작하지 않는다.
- 구현하지 않은 후보는 완료로 표시하지 않고 [추적 원장](../TRACEABILITY.md)에 처분을 남긴다.
