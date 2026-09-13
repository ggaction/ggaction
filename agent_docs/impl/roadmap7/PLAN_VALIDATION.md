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

## 2026-09-13 Phase 6 closeout와 무추론 명세 검증

R29 Polar frame을 `4aa9da65`에서 구현한 뒤 Phase 6을 closed-primary로 기록하고, Phase 7 이후 구현자가 설계 판단을 다시 하지 않도록 [LOW_INFERENCE_IMPLEMENTATION_SPEC.md](LOW_INFERENCE_IMPLEMENTATION_SPEC.md)를 추가했다. 이 문서는 R31/R32/R33/R36/R37/R38/R39/R47/R49/R43/R25와 Phase 12 closeout을 public union, exact requested-state path, pure helper, preflight/commit 순서, cleanup transition, literal oracle, renderer/package 종료 조건으로 분해한다.

| 검증 | 실제 결과 |
| --- | --- |
| R29 focused | 61/61 통과 |
| R29 누적 | unit 2,365/2,365; contracts 399/399; docs 47/47 |
| installed package | 505 entries; packed 654,251; unpacked 3,291,157; SHA-256 `a968d1faf1a4f59b3a32c317de4dbfdf6cbb45cc4744de7d29a8e6b2475e5c96` |
| browser bundles | Full/Basic/SVG gzip 328,676/162,451/6,418 bytes |
| 상태 연결 | Phase 6 completed-primary, Phase 7 active, R31이 다음 WP |
| 문서 탐색 계약 | `node --test test/contracts/agent-docs-navigation.test.js`: 7/7 통과 |
| 명세 적용 범위 | 완료 checkpoint 재구현 금지; 남은 11개 feature와 Phase 12의 exact execution owner |
| 오류 원자성 | program 8개 canonical branch, caller input, trace/ID sequence 비교를 공통 test 형식으로 고정 |

## 2026-09-13 R31 primary 구현 검증

R31 `removeMarkLabels`를 `73e3d53e`에서 Full 전용 public action으로 구현했다. `target`과 `source`는 정확히 하나만 허용하며 자동 대상 추론은 없다. 삭제 plan은 모든 대상 label과 외부 참조를 쓰기 전에 수집·검증하고, label semantic/graphic/config/leader 및 label-target selection/highlight만 제거한다. source mark와 source selection은 보존하며, 존재하는 source의 label 0개 호출은 reference-identical 성공 no-op이다.

| 검증 | 실제 결과 |
| --- | --- |
| R31 acceptance | R31-N01/N02/N03/E01/L01 passed; `test/contracts/remove-labels.test.js` |
| 누적 | unit 2,365/2,365; contracts 406/406; docs 47/47 |
| public knowledge | Full runtime/type/Current catalog; 270 compact cards; removal intent·relationship·MCP routing |
| installed package | 506 entries; packed 655,742; unpacked 3,299,314; SHA-256 `f9065e1f4e93aa708ebb87d34c96905778acb563c99a61e86254057a25ccd55f` |
| browser bundles | Full/Basic/SVG gzip 329,513/162,451/6,418 bytes; Basic method surface 불변 |
| lifecycle | remove → source edit/reencode → Canvas → theme 뒤 label/config/leader 0, source 생존 |
| 열린 통합 cell | R31-L02의 source-owned Text facet/repeat replay는 해당 family를 구현하는 R43에서 검증 |
| 상태 연결 | Phase 7 active, R31 Implemented-primary, R32가 다음 WP |

## 2026-09-13 R32 primary 구현 검증

R32는 `ee3f3b02`에서 `createMarkLabels`의 inline/named/all membership과 Full 전용 `editMarkLabelSelection`을 구현했다. canonical requested state에는 selector 또는 named ID만 저장하고 resolved index는 저장하지 않는다. membership은 현재 source final items에서 다시 계산하며 label 순서는 source 순서를 유지한다. `content:"share"`의 분모도 선택된 부분집합이 아니라 전체 final source items로 고정했다.

| 검증 | 실제 결과 |
| --- | --- |
| R32 acceptance | R32-N01/N02/N03/L01/E01/L02 passed; `test/contracts/selected-labels.test.js` |
| 누적 | unit 2,365/2,365; contracts 417/417; docs 47/47; browser 73/73 |
| public knowledge | Full runtime/type/Current catalog; 271 compact cards 중 264 user-facing; selection intent·relationship·MCP routing |
| installed package | Node·strict TypeScript·MCP·tutorials·browser 통과; 508 entries; packed 658,057; unpacked 3,310,799; SHA-256 `8a650ee9bedc3d93e1a77a5393426c0ff64ea7d6a4345dd0a1e85f70f4c2067c` |
| browser bundles | Full/Basic/SVG gzip 330,551/162,451/6,418 bytes; Basic method surface 불변 |
| lifecycle | source edit·named selection edit·category order·label layout·highlight 뒤 membership과 geometry 재생성; named dependency removal 보호 |
| coverage 관측 | 전체 coverage 실행은 완료됐으나 이번 변경 파일 밖의 기존 `legends/transition.js`, `legends/creation.js`, `scales/definition.js`, `transforms.js` 기준 미달로 policy exit만 실패 |
| 열린 통합 cell | child-local facet/repeat와 named selection namespace는 R43에서 검증 |
| 상태 연결 | Phase 7 active, R32 Implemented-primary, R33이 다음 WP |

## 2026-09-13 R33 primary 구현 검증

R33은 `95968031`에서 `createMarkLabels({placement})`와 Full 전용
`editMarkLabelPlacement`를 구현했다. requested anchor/gap/overflow/leader는 label owner
config에 저장하고, 실제 좌표·bbox·fallback은 source의 현재 final item geometry에서 매번
재질화한다. Bar는 부호·reverse·0·stack segment의 semantic endpoints, Rect는 유일한
interval axis, Arc는 angular-midpoint의 annular sector, Polar Point는 radial outward
boundary를 사용한다.

| 검증 | 실제 결과 |
| --- | --- |
| R33 acceptance | R33-N01/N02/N03/E01/L01/L02 passed; `test/contracts/semantic-label-anchors.test.js`, `test/unit/layout/semantic-label-placement.test.js` |
| fit·오류 정책 | bbox edge gap; hide/outside 1회 fallback/allow; Arc inner-hole·angular fit; Point/Line/Rule/방향 없는 Rect의 미지원 anchor 사전 오류 |
| leader 생명주기 | source boundary→최종 bbox nearest edge; hidden/empty/이동0은 0개; placement/collision leader 중복 거부; auto·label/source removal cleanup |
| 누적 | unit 2,373/2,373; contracts 428/428; docs 47/47; browser 73/73; 실패·skip 0 |
| public knowledge | Full runtime/type/Current catalog; 272 compact cards 중 265 user-facing; placement intent·relationship·MCP routing |
| installed package | Node·strict TypeScript·MCP·tutorials·browser 통과; 508 entries; packed 664,519; unpacked 3,341,308; SHA-256 `a09a1c895f3394b9ef7d2ac9fd55fa0d0c04d2bf7dc997a9df880e2b761fcedc` |
| browser bundles | Full/Basic/SVG gzip 334,645/162,451/6,418 bytes; Basic method surface 불변 |
| generated artifacts | catalog/relationships/cards와 capabilities/reference/actions/signatures/metadata/search/machine freshness checks 통과 |
| docs build 환경 | source generation과 47개 docs tests는 통과; host Ruby 2.6.10이라 Ruby 3.2+가 필요한 locked Jekyll build는 미실행 |
| 열린 통합 cell | source-owned Text facet/repeat child-local replay와 R31/R32 조합은 R43에서 검증 |
| 상태 연결 | Phase 7 active, R33 Implemented-primary, R36이 다음 WP |

## 2026-09-13 R36와 Phase 7 closeout 검증

R36은 `d7136174`에서 literal reference와 구별되는 dynamic statistical reference를 구현했다. reference owner는 source·axis·statistic·population·field mode를 requested state로 보존하고, generated dataset의 scalar 또는 band datum을 현재 source에서 다시 계산한다. `boundData`는 transparent mark filter 앞 authoring binding을, `visibleItems`는 최종 filter 뒤 item grain을 사용한다. source scale domain을 먼저 확정하고 reference consumer의 domain contribution을 차단해 통계값과 scale 사이의 feedback cycle도 제거했다.

통합 검증에서 두 결함을 추가로 찾고 `5832228c`에서 고쳤다. 첫째, statistical reference가 aggregate series와 binned-position scale policy의 direct consumer로 계산돼 기존 source scale을 잘못 바꿀 수 있었다. statistical materialization의 scale policy 참여를 끄고 두 policy가 해당 consumer를 제외하도록 고쳤다. 둘째, derived data edit가 downstream `markFilter`를 새 upstream revision에 rebind하기 전에 filter revision을 materialize해 stale rows를 유지했다. filter target binding을 먼저 바꾼 뒤 새 revision을 계산하도록 순서를 고쳤다.

| 검증 | 실제 결과 |
| --- | --- |
| R36 acceptance | R36-N01/N02/N03/N04/E01/L01 passed; `test/contracts/statistical-references.test.js`, `test/contracts/label-reference-lifecycle.test.js` |
| lifecycle | derived revision → markFilter → named selection → selected semantic label/layout → bound/visible reference → highlight → source removal; facet-local reference; aggregate/binned scale policy |
| 누적 | unit 2,373/2,373; contracts 438/438; docs 47/47; browser 73/73; 실패·skip 0 |
| public knowledge | Full runtime/type/Current catalog; 272 compact cards 중 265 user-facing; statistical reference intent·relationship·MCP routing |
| installed package | Node·strict TypeScript·MCP·browser 통과; 509 entries; packed 669,178; unpacked 3,366,497; SHA-256 `6fa1a3bb32be99744333688f813146dd18b8d3aeaa4ab67e0fd0725e2a3dd5e4` |
| browser bundles | Full/Basic/SVG gzip 337,773/162,623/6,418 bytes |
| generated artifacts | catalog/relationships/cards와 capabilities/reference/actions/signatures/metadata/search/machine freshness checks 통과 |
| docs build 환경 | source generation과 47개 docs tests는 통과; host Ruby 2.6.10이라 Ruby 3.2+가 필요한 locked Jekyll build는 미실행 |
| 남은 통합 cell | R31/R32/R33 advanced facet/repeat는 R43, 범용 statistical reference resource edge는 R25에서 검증 |
| 상태 연결 | Phase 7 completed-primary, Phase 8 active, R37 exact legend values가 다음 WP |

## 2026-09-13 R37 primary 구현과 시각 동등성 검증

R37은 `8760111d`에서 sampled continuous legend의 exact value state machine을 구현했다. 요청 상태는 각 legend config의 `sampling` 한 곳에 저장되며, exact mode에서도 이전 automatic count를 보존한다. size, opacity, strokeWidth 값은 실제 scale mapper로 계산하고 raw sample 순서는 reverse와 독립적으로 유지한다. scale/domain/data/facet replay에서 저장된 값이 invalid해지면 변경 전 상태와 trace를 보존한 채 상위 연산 전체를 거부한다.

`547eae1b`에서는 동일 base에서 만든 lower-level `editGraphics` 프로그램과 public `createLegend({values})` 프로그램을 같은 실행에서 렌더링해 graphic hierarchy와 decoded PNG pixel hash가 같은지 검증했다.

| 검증 | 실제 결과 |
| --- | --- |
| R37 acceptance | R37-N01/N02/E01/L01/L02 passed; `test/contracts/legend-values.test.js` 9/9 |
| 상태 전이 | auto count5 → exact values → exact replacement → `values:"auto"` count5 복구; exact에서 count-only와 values+count 충돌 거부 |
| 값 검증 | 길이 1..100, finite, strictly increasing, -0/0 중복, domain/log positivity, unsupported/discrete/gradient/multi-block 오류 |
| mapper·layout | size area, opacity, strokeWidth 실제 mapper; mapped zero의 label/slot 유지; reverse는 mapped appearance만 역전; horizontal one-value 유한 좌표 |
| lifecycle | scale shrink와 inferred-domain data rebind 원자적 오류; shared/independent facet 검증; theme/layout/Canvas replay |
| renderer | Browser Canvas, SVG, Node PNG, PDF 통과; lower-level/public decoded PNG pixel hash 일치 |
| 누적 | unit 2,373/2,373; contracts 447/447; docs 47/47; browser 73/73; 실패·skip 0 |
| public/package | runtime types, Current contracts, catalog/cards/relations/MCP/generated docs, installed Node·strict TypeScript·browser consumer 동기화 |
| package artifact | 510 entries; packed 670,837 bytes; unpacked 3,373,720 bytes; SHA-256 `f1e4b9d0c31bb1a8e6f34efbaef308b382b11bcaf2a276736fae99c8a8d2298d` |
| browser bundles | Full/Basic/SVG gzip 338,739/163,400/6,418 bytes |
| docs build 환경 | source generation과 docs tests는 통과; host Ruby 2.6.10이라 Ruby 3.2+가 필요한 locked Jekyll build는 미실행 |
| 열린 통합 cell | combined/multi-block selection은 R38, custom theme replay는 R47, Polar/Parallel facet/repeat consumer는 R43 |
| 상태 연결 | R37 Implemented-primary, Phase 8 active, R38 `editLegendBlock`이 다음 WP |

## 2026-09-13 R38 primary 구현 검증

R38은 `7ffafe02`에서 Full 전용 `editLegendBlock`을 구현했다. Selector는 explicit legend target과 현재
block의 member channel을 요구하며 canonical identity는 ASCII 정렬 channel 집합이다. Block-local title,
gap, item text와 지원되는 symbol patch는 각 legend kind config의 `blockOverrides[key]`에 저장한다. Exact
sample은 R37 sampling owner, categorical order는 기존 semantic guide order owner를 그대로 사용한다.
Rematerializer는 persisted base config를 바꾸지 않고 effective block config로 geometry와 occupied bounds를
다시 계산한다.

Content replacement, partial legend removal, encoding removal과 color scale family transition은 graphic 삭제
전에 old/new descriptors를 비교한다. 같은 key는 상태를 유지하고, compatible style은 새 key로 옮기며,
서로 다른 blocks의 override/order가 충돌하거나 gradient가 symbol override를 받을 수 없으면 원본 program과
trace를 보존한 채 거부한다. Root title edit 뒤에도 explicit block title visibility가 우선하며 block 제거 후
재생성에는 stale override와 exact sample이 돌아오지 않는다.

| 검증 | 실제 결과 |
| --- | --- |
| R38 acceptance | R38-N01/N02/E01/L01/E02 passed; `test/contracts/legend-blocks.test.js` 12개 runtime cases와 `legend-block-types.test.js` |
| family 범위 | categorical merged members, continuous size/opacity/strokeWidth samples, color/stroke interval, color/stroke gradient style validation |
| 상태·전이 | same-key preserve, membership migration, conflicting merge, ordinal↔interval↔gradient compatible migration, removal/recreate, root title precedence |
| 독립 시각 oracle | lower-level literal graphic edit와 public block symbol edit의 graphic hierarchy 및 same-run decoded PNG pixel hash 일치 |
| 누적 | unit 2,373/2,373; contracts 460/460; docs 47/47; charts 578/578; render 216/216; browser 73/73 |
| public knowledge | Full runtime/type/Current catalog; 273 compact cards; relations, MCP metadata, action reference, signatures, search, machine/LLM docs freshness 통과 |
| installed package | Node·strict TypeScript·MCP·tutorials·browser 통과; 511 entries; packed 677,508; unpacked 3,405,192; SHA-256 `4f41e6bbbfe63558aff7fcc28a7dfa19a8c1c8bedee5ea06df191ed376be1b91` |
| browser bundles | Full/Basic/SVG gzip 342,342/166,468/6,418 bytes; `editLegendBlock`은 Basic method surface에 없음 |
| package 예산 | R38 전 tarball이 510 entries·670,837 packed·3,373,720 unpacked로 기존 상한 여유 1 entry/163/280 bytes뿐이어서 511/680,000/3,410,000으로 조정. 공용 replay 증가를 반영해 Full/Basic ceiling은 343,000/167,000으로 조정하고 SVG는 유지 |
| coverage | 이번 변경의 critical `legends/transition.js`는 95% lines·85% branches·100% functions 기준 통과. 전체 명령은 기존 `legends/creation.js`, `scales/definition.js`, `transforms.js` 미달 때문에 exit 1이며 이를 성공으로 기록하지 않음 |
| docs build 환경 | source generation과 docs tests는 통과; host Ruby 2.6.10이라 Ruby 3.2+가 필요한 locked Jekyll build는 미실행 |
| 열린 통합 cell | R39 labelMap/header, R19 atomic reencoding, R47 custom theme tokens, R43 facet/repeat consumer |
| 상태 연결 | R38 Implemented-primary, Phase 8 active, R39 display names와 facet headers가 다음 WP |

## 2026-09-13 R39와 Phase 8 closeout 검증

R39는 `20a25911`에서 raw category identity와 표시 문자열을 분리하는 typed `labelMap`을 Cartesian
categorical axis, Polar theta categorical axis, categorical legend block에 연결했다. facet header는
legacy common mode를 보존하면서 명시 row/column role mode, side, align, occupied strip reservation을
추가했다. 동일 display label은 raw domain을 합치지 않고 explicit empty label은 빈 concrete text로
유지된다. 연속·radial·sampled surface와 잘못된 typed map은 candidate materialization 전에 거부한다.

| 검증 | 실제 결과 |
| --- | --- |
| R39 acceptance | R39-N01/N02/E01/L01/L02 passed; grammar/axis/legend/facet literal-oracle tests |
| public surface | 기존 axis label actions와 aggregate facades, `editLegendBlock`, `editFacetHeaders`; 새 public action count 0 |
| lifecycle | domain/source replay, legend transition/reorder/remove, facet source/layout/theme/Canvas 뒤 requested map과 raw identity 유지 |
| 시각 oracle | lower-level/public concrete graphic hierarchy와 same-run decoded PNG pixel hash 일치 |
| 누적 | unit 2,390/2,390; contracts 465/465; docs 47/47; charts 578/578; render 216/216; browser 73/73; realistic 243/243 |
| generated artifacts | contracts catalog/relations/cards와 docs capabilities/actions/machine/search/reference/metadata/signatures/examples freshness 11개 통과 |
| installed package | 513 entries; packed 682,551; unpacked 3,429,929; SHA-256 `06cea24893e9e4d6570ae272680aedd834dcba2f139c0404b87d351ac09fe48d` |
| browser bundles·MCP | Full/Basic/SVG gzip 345,403/167,086/6,432 bytes; MCP cold start 577 ms |
| coverage 관측 | R39 추가 source의 기준 미달 없음; 전체 명령은 기존 `legends/creation.js`, `scales/definition.js`, `transforms.js` 네 floor 때문에 exit 1 |
| docs build 환경 | source generation과 docs tests 통과; host Ruby 2.6.10이라 Ruby 3.2+ locked Jekyll build 미실행 |
| 열린 통합 cell | R47 theme token replay와 R43 Polar/Parallel facet·repeat에서 label/header/legend recipe 소비 회귀 |
| 상태 연결 | Phase 8 completed-primary, Phase 9 active, R47·R49 구현 고정 명세가 다음 WP |
