# Phase 2 — 복합 경로와 공통 geometry

상태: **G-PATH ready-for-review**. STEP-010의 순수 topology kernel과 검토 준비 검증을 완료했다.
STEP-010–012 제품 통합 및 AT-11/12 완료는 아직 아니다.

사용자 “승인 계속 진행” (2026-10-27)에 따라 Phase 1 다음 작업을 시작했다.
앞선 [G-CORE](../phase1/G-CORE.json)는 D1–D8, STEP-004–009 승인으로 범위가 명시되어 있다.
이번에 구체화한 공개 fillRule·경로형 clip·시각 target은 [G-PATH](G-PATH.json)에서 함께 검토한다.
원안 G-CORE/G-VISUAL의 해당 결정을 하나의 검토 묶음으로 기록하며 기존 승인을 소급 확장하지 않는다.

- [설계 D1–D6](DESIGN.md): 정확한 공개 호출, 저장 결과, 호환성, 시각 의미
- [STEP1](STEP1.md): 완료한 독립 작업과 승인 후 통합 순서
- [소비자](consumers.json): 적용 범위와 남은 검증
- [검토 준비 검사](review-plan.json): 제품 완료와 구별한 필수 검사

## 검토 준비의 필수 검사

1. `node scripts/run-tests.js unit unit/grammar/compound-path-topology.test.js unit/grammar/path-command-limits.test.js`
2. `node scripts/run-tests.js gates`
3. `node scripts/run-tests.js contracts contracts/oracle-independence.test.js contracts/test-discovery.test.js contracts/agent-docs-navigation.test.js contracts/package-boundaries.test.js contracts/package-artifact.test.js`
4. 누적 `npm test`
5. `node scripts/run-tests.js render gates/compound-path/review.render.js`
6. `npm run package:check` 및 `npm run docs:machine:check`

실행 시작·종료 모두 같은 clean revision의 receipt/log를 저장한다. 렌더 검사는 네 backend의
native primitive 검증이다. 제품 renderer 또는 public/primitive 동등성 통과로 세지 않는다.
이미지는 `.artifacts/test/png/review/compound-path/`에 재생성하며 source·literal fixture·결과 hash로 원격 재현한다.
대형 검사와 package/render는 storage supervisor를 사용한다.

## 제품 통합의 완료 조건

G-PATH 승인 후 STEP-010–012의 공개 검증·geometry·네 renderer·scene·persistence·types·current contracts·docs를
연결한다. 공개 프로그램과 primitive를 같은 실행에서 비교하고 실제 소비자 전체를 통과해야 한다.
누적 coverage, 실데이터 두 shard, browser, 전체 render/gallery, installed package, package artifact,
generated metadata와 docs build/browser를 통합 checkpoint에서 요구한다. 실행계획에 이 검사들을 선언한다.
기존 exact cubic extrema owner를 재사용하고, 현재 단일 subpath 가정인 stroke/clip 소비자를 교체한다.
후속 hit runtime·animation과 신규 chart family는 원안의 뒤 단계에 남기며 geometry 의무를 누락하지 않는다.

## 검토 준비 검증 결과

기준 commit: `ebc63915af5837d7a7500bae420500b4f5c2d68c`. 아래 실행은 모두 시작·종료가 같은 clean revision이다.
이후 evidence 기록 commit은 제품·test source를 바꾸지 않는다.

| 검사 | 결과 |
|---|---|
| suite-unit | 15 passed, 0 failed; 2 files |
| suite-gates | 2 passed, 0 failed; 1 files |
| suite-contracts | 36 passed, 0 failed; 5 files |
| suite-all | 6360 passed, 0 failed; 1048 files |
| suite-render | 1 passed, 0 failed; 1 files |
| package-check | exit 0 |
| machine-docs | exit 0 |

[실행 집계](evidence/summary.json), [네 backend 출력 결과](evidence/render-results.json), [완료 증거](preparation.json), [검증 결과](preparation-validation.json)를 보존한다.
검토 준비만 complete이며 제품 STEP-010–012는 계속 열려 있다. 이미지는 아래 명령으로 재생성한다.

```sh
node scripts/run-tests.js render gates/compound-path/review.render.js
node scripts/verification-evidence.js agent_docs/impl/roadmap9/phase2/review-plan.json agent_docs/impl/roadmap9/phase2/preparation.json
```
