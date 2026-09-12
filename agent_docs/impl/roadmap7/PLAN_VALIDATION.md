# 로드맵 문서 작성 검증

검증일: 2026-09-07. 기준 코드 commit: c0e47da6e213852213bcb04eb19031a1a6a63cd7.

이 첫 절은 2026-09-07 계획 작성 당시의 역사적 검증 기록이다. 아래 결과는 당시 계획의 완결성·탐색 일관성에 대한 검증이며, 현재 구현 상태는 ROADMAP과 Phase STEP 원장을 따른다.

| 검증 | 실제 결과 |
| --- | --- |
| 사용자 선택 번호와 PROPOSALS | 정확히 25개, 중복·누락 없음 |
| Feature와 primary Phase/CANDIDATES | 25개 모두 일치, 각 항목의 단일 owner 확인 |
| 의존성 | 순환 없음, 뒤 Phase를 선행 기능으로 잘못 지정한 항목 없음 |
| 계약 구성 | 모든 feature에 API·기본값/오류·상태/생명주기·구현 순서·독립 oracle·완료 조건 존재 |
| 기존 source 연결점 | 참조 109개 모두 저장소 안의 실제 파일 |
| 상대 Markdown 링크 | 검증 시 316개 모두 유효 |
| JSON | 16개 모두 parse 성공 |
| 상태 | 모든 세부 기능 Proposed, 모든 Gate planned, 승인 기록을 만들지 않음 |
| 제품 변경 경계 | src/types/contract/knowledge/package의 tracked diff 없음 |
| 탐색 계약 | `node --test test/contracts/agent-docs-navigation.test.js`: 7/7 통과 |
| 누적 계약 | `npm run test:contracts`: 329/329 통과, 실패·skip 0 |
| Diff 형식 | `git diff --check` 통과 |

탐색·계약 테스트는 현재 저장소 명령으로 재현할 수 있다. 25개 번호와 의존성·경로 검사는 이번 작성의 일회성 검증기로 PROPOSALS/CANDIDATES/Markdown을 순회하여 확인했다. 이 검증기를 제품 실행 의존성으로 추가하지 않았다.

코드, declarations, current public contracts는 그대로다. 새 API의 runtime/type/render/package 검증은 [VALIDATION.md](VALIDATION.md)의 향후 구현 의무이며 이번에는 실행하지 않았다. audit 폴더의 probe JSON은 이전 감사의 관측 snapshot으로 별도 구분했다.

## 2026-09-13 상세 구현 스펙 검증

시작 revision은 3b61e789, 제품 코드 baseline은 그대로 c0e47da6이다. 기존 로드맵 위에 25개 feature의 구현 고정 명세, 실제 저장 경로 제안, 타입 설계, 작업 연결표, 인수 사례 인덱스를 추가했다. 아래는 문서 검증 결과이며 154개 제안 동작의 runtime 통과 기록이 아니다.

| 검증 | 실제 결과 |
| --- | --- |
| 선택 범위·primary Phase·의존성 | 25개 일치, 순환 없음, Phase/CANDIDATES 일치 |
| 신규 public method 제안 | 32개, 중복 없음, 현재 runtime에 모두 없음 확인 |
| 기능별 인수 사례 | 154개, 모든 기능에 N(정상)/E(오류)/L(생명주기), planned/runtimeEvidence:null |
| 코드·기존 테스트 연결 | source 참조147개와 기존 test 참조44개 모두 실제 파일 |
| 상대 Markdown 링크·JSON | 링크392개와 JSON18개 유효 |
| 제안 타입 정합성 | tsc strict/noEmit 성공, 유효 예제25개와 expected type error22개 |
| 현재 계약 회귀 | npm run test:contracts 329/329 통과, 실패/skip0 |
| 수치·timezone 예제 점검 | nonzero-domain pow/sqrt 수식, Lord_Howe/Apia/NY Intl 경계 성분 별도 확인 |
| 변경 경계 | tracked 변경은 roadmap7 내부 문서만, src/types/current contracts/knowledge/package 변경 없음 |
| Diff 형식 | git diff --check 통과 |

제안 타입 검사 명령은 VALIDATION의 문서 단계 항목에 있다. 범위·case ID·경로·링크 검증은 이번 작업의 일회성 검사로 수행했으며 .artifacts/roadmap7-spec/validation.json은 로컬 관측 결과다. 구현 테스트가 이 ignored artifact에 의존하지 않도록 한다.

이 2026-09-13 상세화 절도 구현 시작 전의 역사적 기록이다. 이후 사용자가 Phase 0–12 Gate를 모두 승인했고 Phase 1이 구현됐다. 현재 승인·구현·인수 case 상태는 각 `GATES.md`, `STEP1.md`, `IMPLEMENTATION_MAP.json`, `ACCEPTANCE_CASES.json`이 소유한다.

## 2026-09-13 실행 runbook 검증

[EXECUTION_RUNBOOK.md](EXECUTION_RUNBOOK.md)를 추가해 승인된 25개 기능을 Phase별 입력 검증, pure core, transaction, consumer replay, public surface, test와 종료 조건으로 분해했다.

| 검증 | 실제 결과 |
| --- | --- |
| 선택 범위 | runbook, PROPOSALS, IMPLEMENTATION_MAP, ACCEPTANCE_CASES 모두 동일한 25개 |
| 인수 사례 | 총 154개, R06/R07의 실행 상태와 나머지 planned 상태 보존 |
| 상태 의미 | Gate 승인과 제품 Current 상태를 분리하고 재승인 오해 문구 제거 |
| 구현 순서 | Phase 1 후속 의무와 Phase 2–12 작업·선행 관계·종료 기준 명시 |
| 문서 링크 | roadmap7 Markdown 38개 상대 링크 검사 통과 |
| 제품 변경 경계 | 이 runbook checkpoint는 `agent_docs/impl/roadmap7` 문서만 변경 |

## 2026-09-13 구현자 작업 패킷 보강

상세 구현 작업 패킷의 기준 checkpoint를 `68843532`로 갱신하고, 기능별 계약을 복제하지 않는 실행 규약을 추가했다. 구현자가 한 WP를 독립적으로 수행할 때 필요한 입력표, Core/Transaction/Consumers/Surface 네 구간, 정상·경계·오류 원자성·생명주기·통합의 다섯 테스트 묶음, 생성물과 packed package까지의 체크포인트 기록 순서를 고정했다.

| 검증 | 실제 결과 |
| --- | --- |
| canonical owner | API·기본값·수식은 feature에 남고 작업 패킷은 실행 순서만 소유 |
| 구현 누락 방지 | state owner, resolved output, cleanup, consumer, oracle, public surface를 작업 전에 모두 식별 |
| 거짓 완료 방지 | 네 patch 구간과 다섯 test 묶음이 닫히기 전 Current 승격 금지 |
| 원자성 | program의 8개 canonical branch와 caller input까지 오류 전후 비교 |
| 생성물 순서 | owner 수정 → generator → stale check → packed consumer → 상태 원장 순서 |
| 현재 작업 보호 | 기존 R22 source 변경은 이 문서 보강에 포함하거나 되돌리지 않음 |
| 문서 탐색 계약 | `node --test test/contracts/agent-docs-navigation.test.js`: 7/7 통과 |
| 제안 타입 | `IMPLEMENTATION_TYPES.examples.ts` strict/noEmit 통과 |
| Diff 형식 | `git diff --check` 통과 |

## 2026-09-13 Phase 2 구현 검증

`9d4d0840`에서 R05 complete/impute, R08 week/weekday/IANA timeZone, R09 elapsed-duration window의 primary create 경로를 구현했다. R02가 소유하는 edit/revision 경로는 Phase 4의 명시적 후속 의무로 유지한다.

| 검증 | 실제 결과 |
| --- | --- |
| 고정 인수 사례 | R05 6개 전부 passed, R08 정상·오류 9개 passed와 lifecycle partial, R09 정상·오류 6개 passed와 lifecycle partial |
| 핵심 통합 | complete → impute → duration window → point encoding → facet-local replay |
| 누적 unit | 2,315/2,315, 실패·skip 0 |
| 누적 contract | 331/331, 실패·skip 0 |
| public docs | 47/47, generated reference/cards/machine/LLM artifacts 동기화 |
| installed package | Node·strict TypeScript·MCP·tutorial consumer 통과 |
| package artifact | 493 entries, packed 611,829 bytes, unpacked 3,059,221 bytes |
| browser bundle | Full/basic/SVG gzip 306,231/152,450/6,418 bytes; ceiling 308,000/153,000/25,000 |
| appearance | data-only Phase라 새 visual target 없음; 기존 Cartesian/facet Canvas consumer 실행 |
| Diff 형식 | `git diff --check` 통과 |

## 2026-09-13 Phase 5 R22 구현 검증

`3fc40a66`에서 고정 stroke를 일반 mark family의 독립 field channel로 확장하고
`editStrokeScale`, categorical/gradient/interval stroke legend, selection, facet, theme,
renderer와 installed package 경로를 Current로 승격했다. 같은 scale ID에서
categorical↔quantitative field를 재할당하면 호환되지 않는 이전 domain/range는 새 계열의
기본값으로 초기화하고, 기본 범례는 공통 배치·텍스트 스타일을 보존해 새 family로 교체한다.
대상 family에서 손실되는 custom symbol/count/layout은 원본 프로그램을 유지한 채 명시 오류로 거부한다.

| 검증 | 실제 결과 |
| --- | --- |
| R22 고정 인수 사례 | R22-N01/N02/N03/L01/E01/L02 전부 passed; `test/contracts/stroke-color.test.js` |
| 추가 전환 회귀 | stroke와 color categorical↔quantitative 재할당, 기본 범례 family 교체, custom family 설정의 원자적 오류 |
| 지원 mark | Point/Line/Area/Bar/Rect/Arc/Rule/Tick의 constant/field stroke; Text는 명시 거부 |
| 생명주기 | field↔constant, scale type/palette, shared color+stroke scale, legend, selection/highlight, facet, theme/Canvas replay |
| 누적 unit·contract | 2,361/2,361 unit, 357/357 contract, 실패·skip 0 |
| chart·docs | 578/578 chart, 47/47 docs, generated catalog/cards/signatures/search/LLM 동기화 |
| renderer·browser | 216/216 render, 73/73 browser, Canvas/SVG/PNG/PDF 경로 통과 |
| installed package | Node·strict TypeScript·MCP·browser entry·stroke encoding/legend/scale editing 통과 |
| package artifact | sha256 `ff1471e13b576b850247dfa90b2fb122227f47e4dc427e2274fa058857bc306e`; Full/Basic/SVG gzip 323,125/159,342/6,418 bytes |
| Diff·syntax | 모든 변경 JavaScript `node --check`, generated freshness checks, `git diff --check` 통과 |

R19의 한 요청 다중 채널 final-state transaction과 R43의 advanced facet matrix는 각각의
후속 owner에 남아 있다. 이 후속 cell은 R22 primary 구현을 Planned로 되돌리는 사유가 아니며,
해당 기능 완료 시 R22 조합 회귀를 다시 실행한다.

## 2026-09-13 저성능 구현 모델용 실행 명세 보강

Roadmap 7의 기능별 행동 계약을 새 문서로 복제하지 않고, 기존 canonical 작업 패킷의 실행 분해를 보강했다.

- 마지막 완료 checkpoint를 R22 기록 revision `0a2fed94`로 갱신하고 R22를 완료 checkpoint 표에 추가했다.
- 미완료 14개 기능을 공개 표면, requested owner, pure/transaction 중심, 필수 후속 consumer로 연결한 라우팅 표를 추가했다.
- 모든 WP에 동일하게 적용할 17단계 무추론 실행 순서를 고정했다. read-only resolve와 final candidate preflight 전에는 trace/ID/state write를 금지한다.
- 현재 활성 WP5.3 R19에 대해 public type, 19-key canonical 순서, private plan shape, scale patch 병합, final-state validation, commit/materialization 순서, 금지 구현, 12개 고정 fixture를 명시했다.
- 특히 순차 focused action reduce, staged `_clone`을 planner 대체로 사용하는 방식, 동일 scale patch last-write, 실패 후 보상 rollback을 명시적으로 금지했다.
- `IMPLEMENTER_START_HERE.md`와 `IMPLEMENTATION_SPEC.md`가 이 실행 규약과 활성 WP를 직접 가리키도록 연결했다.

검증:

- `node --test test/contracts/agent-docs-navigation.test.js`: 7/7 통과.
- `tsc --noEmit --strict ... agent_docs/impl/roadmap7/IMPLEMENTATION_TYPES.examples.ts`: 통과.
- `git diff --check`: 통과.
