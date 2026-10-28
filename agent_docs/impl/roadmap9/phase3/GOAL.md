# Phase 3 — 안전한 AST v2와 데이터 입력

상태: **공개 AST v2/parameter 제품 checkpoint 검증 완료; G-DATA 공개 연결 구현 후 최종 통합 검증 중**. [이전 제품 증거](product-implementation.json)와 [STEP3](STEP3.md)를 보존하고 [STEP6](STEP6.md)가 최신 데이터 갱신 진행 상태를 소유한다. AT-16 공개 실행을 검증했으며 전체 aggregate와 STEP-013 closeout은 진행 중이다. Phase 0–2/STEP-001–012는 완료 상태를 유지한다.

사용자 “검토하자” 뒤 기존 AST 보존과 v2 도입 방향을 제안했고, “진행”(2026-10-28)으로 구체화를 요청받았다.
[G-EXPR](G-EXPR.json)은 이 방향을 재질문하지 않고 정확한 신규 계약 D2–D6만 구분한다.
아래의 최초 검토·core checkpoint 수치는 역사 기록이며 현재 제품 검증과 구분한다. 남은 원안 범위는 [obligations.json](obligations.json)에 보존한다.

- [설계안](DESIGN.md): 노드, null/missing, 함수, 비용, 저장 및 통합 경계
- [진행 상태](STEP1.md): 준비와 제품 구현 구별
- [후보 인벤토리](candidates.json): 승인된 설계와 남은 공개 통합; current/planned에 등록하지 않음
- [consumer matrix](consumers.json): 적용 대상과 후속 검증
- [검토 실행계획](review-plan.json): 승인 전에 요구하는 실행 증거
- [G-PARAM 검토](parameter/DESIGN.md): 신규 scalar resource와 exact computed binding 제안
- [Parameter 진행 상태](STEP2.md): 검토 패키지와 실제 제품 구현 구별
- [공개 제품 통합](STEP3.md): v2/parameter, CSV/JSON kernel 및 누적 검증
- [Prepared source 제품 통합](STEP6.md): 실제 원본 receipt, URL parameter, offline lifecycle과 최종 검증
- [전체 실행 승인](../AUTHORIZATION.json): STEP-077까지 승인된 범위를 이어간다.

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
위 c555ec14 검토 baseline에서 AST getter 실행은 재현된 결함으로 남아 있었다. descriptor 실험의 성공은 제품 수정 완료가 아니다.
당시 검토 준비만으로는 G-EXPR 승인 또는 STEP-013/AT-16 완료를 의미하지 않았다. 이후 승인은 아래에 별도로 기록한다.

## AST core 구현 승인

사용자 “구현해”(2026-10-28)는 `a08836f0` 검토 자료의 D2–D6를 승인했다.
이 단계는 pure kernel와 getter 안전성, 독립 검증을 구현한다. D6에 따라 공개 v2 authoring 및
STEP-013 종료는 parameter/resolver 계약과 전체 소비자 통합 뒤에 진행한다.
핵심 검사는 focused unit/contract, 누적 suite, 신규 critical coverage, package/metadata 검사다.

## Private core 구현 checkpoint

8종 AST node, closed standard@1 30함수, explicit dependency, null/missing·lazy evaluation·typed output,
calendar/DST, immutable 결과와 structured resource-limit를 구현했다. Action summary는 descriptor로
읽으며 전용 computed action뿐 아니라 범용 editDerivedData의 복사 전 검증도 포함한다.
현재 v1 결과·공개 exports·저장 schema는 유지한다. 내부 계약은
[EXPRESSION_CORE](../../../architecture/EXPRESSION_CORE.md), 실행 증거는 [core-implementation.json](core-implementation.json)에 기록한다.

검토용 review/verify.mjs는 c555ec14의 getter 결함을 재현하는 역사적 runner다. 수정한 HEAD에서
그 baseline assertion을 재실행해 안전성 결과로 사용하지 않는다. 안정 시험은
`test/unit/grammar/expression-*.test.js`와 기존 computed/action suite가 소유한다.

Package는 기존 staging 규칙으로 678 entries, packed 1,009,983 bytes, unpacked 4,712,832 bytes다.
신규 private kernel 4개와 own-data/transform-input owner 2개에 맞춰 entry 한도를 672→678로 조정하고
bytes는 기존 1,000 단위 올림으로 1,010,000 / 4,713,000만 허용한다. Full/Basic gzip은
507,597 / 285,702 bytes로 기존 508,000 / 286,000 한도 안이다.

이 checkpoint는 G-PARAM/G-DATA, 공개 registry query, create/edit/revise·schema·lineage·codec·
Full/Basic 선언·렌더러 소비자와 AT-16을 닫지 않는다. 전체 source coverage/실데이터/browser/render/
installed-package 통합 검사는 기존 정책대로 공개 통합 checkpoint에 남긴다.

최종 검증: 정상 suite **6,449 passed, 0 failed/skipped**; 핵심 및 입력 경계 **62 passed**.
영향받은 kernel/own-data/transform-input source coverage는 line99.63%, branch99.33%, function100%이며
신규 critical family/file 기준을 모두 통과했다. 이 수치는 전체 repository coverage가 아니다.
Package·Full/Basic bundle 및 생성 machine metadata 검사도 exit0이다. 전체 suite raw log는 gzip으로
보존하고 receipt·입력 파일 hash와 함께 같은 source bytes를 재현할 수 있게 기록했다.

Runtime commit은 `3a022aea`다. Commit 후 source reference를 갱신한 공개 문서 158개 검사도
모두 통과했다. 증거 receipt의 pre-commit working tree를 clean 실행이라고 바꾸지 않았으며,
기록한 source/test/script 2,386개 hash와 이 commit의 동일성을 별도로 확인했다.

## G-PARAM resource 검토 준비 — 승인 전 기록

[STEP2](STEP2.md)의 P1–P6 계약 패키지는 검증·push 완료이며 [G-PARAM](G-PARAM.json)은
ready-for-review다. 아직 parameter 제품 구현이나 공개 v2 통합 완료를 뜻하지 않는다.
기존 core와 같은 Node22.23.1에서 normal suite6,449개가 통과했고, 현재 Node22.23.2 압축 한도와
기존 stricter TypeScript 선언 한계는 [compatibility](parameter/compatibility.md)에 별도로 보존했다.

이 단락은 승인 전 검토 상태다. 이후 사용자의 전체 실행 승인과 P1–P6 승인은
[G-PARAM](G-PARAM.json)에 기록했으며 현재 구현·검증 상태는 [STEP3](STEP3.md)가 소유한다.
