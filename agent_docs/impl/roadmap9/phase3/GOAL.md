# Phase 3 — 안전한 AST v2와 데이터 입력

상태: **AST core 검토 준비 완료; G-EXPR ready-for-review**. 제품 구현과 AT-16은 미완료다. Phase 0–2/STEP-001–012는 완료 상태를 유지한다.

사용자 “검토하자” 뒤 기존 AST 보존과 v2 도입 방향을 제안했고, “진행”(2026-10-28)으로 구체화를 요청받았다.
[G-EXPR](G-EXPR.json)은 이 방향을 재질문하지 않고 정확한 신규 계약 D2–D6만 구분한다.
이번 검토 checkpoint는 AST core이며, 남은 원안 범위는 [obligations.json](obligations.json)에 보존한다.

- [설계안](DESIGN.md): 노드, null/missing, 함수, 비용, 저장 및 통합 경계
- [진행 상태](STEP1.md): 준비와 제품 구현 구별
- [후보 인벤토리](candidates.json): 미승인 API 후보; current/planned에 등록하지 않음
- [consumer matrix](consumers.json): 적용 대상과 후속 검증
- [검토 실행계획](review-plan.json): 승인 전에 요구하는 실행 증거

## 승인과 검증 경계

Repository [root AGENTS](../../../../AGENTS.md)의 “Before implementing an unresolved material decision
about public APIs, persisted schemas, or core architecture, present the concrete proposal and obtain explicit
user approval.”를 적용한다. 기존 D1 방향 승인은 유지하며 envelope·결측 저장·함수 조회 API 등의 새로운
세부 계약을 검토한다. [impl AGENTS](../../AGENTS.md)의 원격 재현 가능한 review checkpoint 절차를 따른다.

검토용 코드와 선언은 이 Phase 안에만 있으며 npm package/현재 API/안정 제품 테스트에 연결하지 않는다.
원본 제품 source를 바꾸지 않은 baseline과 제안용 수치 oracle를 분리 기록한다.
필수 준비 검사는 expression-review, expression-types, suite-unit, suite-contracts, suite-all, machine-docs다.
전체 source coverage·realistic·browser/render·package consumer는 제품 통합 checkpoint에서 실행하며,
준비 단계의 baseline 성공을 제품 v2 성공으로 재사용하지 않는다.

## 재현

```sh
node agent_docs/impl/roadmap9/phase3/review/verify.mjs
node node_modules/typescript/bin/tsc --strict --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext agent_docs/impl/roadmap9/phase3/review/calls.ts
node scripts/run-tests.js unit unit/actions/data/computed-data.test.js unit/actions/data/computed-access-and-replacement.test.js unit/actions/data/computed-calendar-year.test.js unit/actions/data/computed-floor.test.js
node scripts/run-tests.js contracts contracts/agent-docs-navigation.test.js
npm test
npm run docs:machine:check
```

verify.mjs의 JSON stdout은 .artifacts/checks/expression-review.log와 아래 증거 manifest에 보존한다.
소비자 연결이 남아 있으므로 STEP-013 progress를 complete로 생성하지 않는다.

## 검토 준비 실행 결과

검토 code commit은 `c555ec14f36aa55ae5590ce2ac4f68d04df806fd`다. 모든 필수 검사는 이 clean commit에서
시작하고 끝났다. 제품 source는 Phase 2 기준 `374222f94860f44ed8c174d0c12b740bc7c3a8a4`와 같다.
후속 증거 기록 commit은 검증한 설계/선언/runner 및 제품 source를 변경하지 않는다.

| 검사 | 결과 |
|---|---|
| Review baseline·독립 oracle·접근자 실험 | 28 checks passed |
| 제안 TypeScript 선언 | positive 및 10 negative 호출 통과; 전체 함수 이름 union 일치 |
| 현재 computed 회귀 | 23 passed, 0 failed/skipped |
| 문서 경로/상태 | 7 passed, 0 failed/skipped |
| 현재 전체 정상 suite | 6,392 passed, 0 failed/skipped |
| 생성 metadata | exit 0 |

[집계](evidence/summary.json), [실행 receipt와 hash manifest](preparation.json),
[완료 증거 검증](preparation-validation.json)에 재현 근거를 보존한다.
현재 제품의 AST getter 실행은 재현된 결함으로 남아 있다. descriptor 실험의 성공은 제품 수정 완료가 아니다.
이번 준비 완료는 G-EXPR의 D2–D6 승인 또는 STEP-013/AT-16 완료를 의미하지 않는다.
