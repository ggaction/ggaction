# STEP2 — Parameter resource 계약

## 진행 상태

- [x] 기존 resource·computed·revision·persistence owner와 G-EXPR 승인 경계 확인
- [x] P1–P6 계약, 제안 타입과 검토 전용 reference model 작성
- [x] focused·누적 suite·타입·metadata 검증과 evidence 고정
- [x] 검증된 패키지 commit/push
- [x] G-PARAM P1–P6 승인 — [전체 실행 승인](../AUTHORIZATION.json)
- [ ] 승인 범위의 내부 구현과 안정 시험
- [ ] G-DATA 이후 공개 v2/parameter 통합 및 제품 lifecycle 검증

[설계](parameter/DESIGN.md), [Gate](G-PARAM.json), [후보](parameter/candidates.json),
[소비자](parameter/consumers.json)를 함께 검토한다. 모델·제안 타입 성공은 제품 구현 성공이 아니다.
STEP-016 조건부 dataflow와 G-DATA 의무는 [obligations.json](obligations.json)에 유지한다.

## 재현

누적 baseline은 기존 AST core와 같은 Node22.23.1/npm10.9.8을 사용한다.
다른 지원 runtime에서 발견한 패키지 한도 실패는 아래 compatibility 기록에 남긴다.

```sh
node agent_docs/impl/roadmap9/phase3/parameter/verify.mjs
node node_modules/typescript/bin/tsc --strict --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext agent_docs/impl/roadmap9/phase3/parameter/calls.ts
node node_modules/typescript/bin/tsc --strict --exactOptionalPropertyTypes --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext agent_docs/impl/roadmap9/phase3/parameter/exact-options.ts
node scripts/run-tests.js unit unit/grammar/expression-calendar.test.js unit/grammar/expression-evaluation.test.js unit/grammar/expression-functions.test.js unit/grammar/expression-limits.test.js unit/grammar/expression-validation.test.js unit/core/resource-state.test.js unit/core/resource-references.test.js unit/actions/data/source-revision.test.js unit/actions/data/derived-editing.test.js unit/actions/resources/remove.test.js unit/persistence/
node scripts/run-tests.js contracts contracts/agent-docs-navigation.test.js
npm test
npm run docs:machine:check
```

필수 검사를 한 번에 실행하고 receipt/hash/raw log를 남기는 runner는
[qualify.mjs](parameter/qualify.mjs)다. source 변경 없는 baseline 결과와 검토 모델 결과를 구별한다.
기존 범례 선언의 stricter compiler 한계는 [compatibility.md](parameter/compatibility.md)에 기록한다.
현재 머신에서 동일 baseline runner 실행은 다음과 같다. 이는 제품 engines 범위를 변경하지 않는다.

```sh
env PATH=/opt/homebrew/Cellar/node@22/22.23.1/bin:$PATH node agent_docs/impl/roadmap9/phase3/parameter/qualify.mjs
```

## 검증 결과

Node22.23.1/npm10.9.8 기준: review22개, 타입 negative17개와 positive 호출, focused131개,
navigation7개, 전체 정상 suite6,449개가 통과했다. test fail/skipped는0이며 machine metadata도 exit0이다.
[summary](parameter/evidence/summary.json), [입력 hash](parameter/evidence/inputs.json),
[증거 무결성 검사](parameter/evidence/validation.json)에 receipt·압축 raw log와 환경을 연결했다.
실행은 검토 파일이 있는 dirty working tree에서 했으며 제품 파일은 baseline7e0f2b46과 동일하다.
Clean commit에서 실행했다고 바꾸어 기록하지 않는다.

현재 기본 Node22.23.2의 package ceiling 실패와 기존 exactOptionalPropertyTypes 범례 충돌은
[호환성 기록](parameter/compatibility.md)에 남아 있다. 전자는 동일 tar bytes의 compressor 차이로
확인했고 이번 검토에서 한도를 바꾸지 않았다. 제품 통합 전 해결해야 하는 제한이며 baseline 성공으로
상쇄하지 않는다. P1–P6은 후속 사용자 메시지로 승인했다. 실제 parameter lifecycle 및 STEP-013/AT-18 완료는 아직 아니다.

검토 source/evidence commit: `49f6bb9283e6ba34dba78508118b9d321a8417f5` (`main` push 완료). 후속 Gate metadata 기록은
검증한 제안 코드·타입·모델·evidence bytes를 변경하지 않는다. 후속 사용자 승인은 G-PARAM 및 전체 실행 승인 기록에 연결했다.
