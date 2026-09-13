# Roadmap 7 — 구현 상세 스펙 진입점

작성 기준: 2026-09-13, 원래 코드 baseline c0e47da6e213852213bcb04eb19031a1a6a63cd7, 문서 작업 시작 revision 3b61e789. 상태: **승인된 실행 계약 / Phase 0–10 완료, Phase 11 R25 active**. R43은 `89f1c54e`, `4dbdaf85`, `ebf3562a`에서 lifecycle·Current·문서·설치 패키지까지 완료됐다. 이 파일은 선택된 25개 기능을 작은 작업으로 구현할 때의 공통 실행 규약이다. 단계별 기계적인 작업과 종료 조건은 [EXECUTION_RUNBOOK.md](EXECUTION_RUNBOOK.md), 정확한 기능별 계약은 `features/*.md`가 소유한다. 구현자가 계약을 스스로 보완할 수 없는 경우에는 [LOW_INFERENCE_IMPLEMENTATION_SPEC.md](LOW_INFERENCE_IMPLEMENTATION_SPEC.md)와 [상세 작업 패킷의 무추론 실행 규약](DETAILED_IMPLEMENTATION_WORK_PACKAGES.md#저성능-구현-모델을-위한-무추론-실행-규약)의 함수·state·transition·fixture 순서를 그대로 따른다.

## 문서 읽는 순서와 권위

1. 현재 저장소 AGENTS와 [ROADMAP](ROADMAP.md)에서 사용자 범위/승인/활성 Phase 확인.
2. 이 파일과 [무추론 구현 명세](LOW_INFERENCE_IMPLEMENTATION_SPEC.md), [EXECUTION_RUNBOOK](EXECUTION_RUNBOOK.md), [CONTRACT_RESOLUTIONS](CONTRACT_RESOLUTIONS.md)에서 baseline 차이, 단계별 작업, 정정된 제안 확인.
3. [COMMON_CONTRACT](COMMON_CONTRACT.md), [STATE_AND_REPLAY](STATE_AND_REPLAY.md)에서 상태 경계 확인.
4. 해당 features 문서의 API, **구현 고정 명세**, 독립 oracle를 함께 읽는다.
5. [IMPLEMENTATION_MAP.json](IMPLEMENTATION_MAP.json)의 실제 code/test 연결점과 [ACCEPTANCE_CASES.json](ACCEPTANCE_CASES.json)의 case ID를 사용한다.
6. [API_DETAILS](API_DETAILS.md)와 [IMPLEMENTATION_TYPES.d.ts](IMPLEMENTATION_TYPES.d.ts)에서 현재 타입과 제안된 새 타입을 대조한다.
7. Phase GOAL/STEP/GATES 및 [VALIDATION](VALIDATION.md)을 따른다.

공개 계약의 현재 사실은 src/types/current contracts가 소유한다. 이 계획의 미구현 목표는 기능별 구현 고정 명세가 소유한다. 옛 예시와 충돌하는 문구는 CONTRACT_RESOLUTIONS에 정정 이유를 남긴다. 계획 타입 파일과 case JSON은 제품에서 import하거나 package에 포함하지 않는다.

"구현 고정"은 사용자가 승인한 구체 계약을 뜻한다. 구현 상태는 별개이며 source·executable evidence가 있는 항목만 Implemented/Current로 승격한다. 2026-09-13의 전체 Gate 승인은 각 Phase `GATES.md`에 기록돼 있으므로 같은 계약을 다시 묻지 않는다. 새로운 material departure가 생긴 경우에만 영향을 받는 경계를 다시 검토한다.

## source에서 확인한 실제 출발점

| 영역 | baseline 사실 | 구현자가 해야 할 변화 |
| --- | --- | --- |
| coordinate | `editCoordinate`의 aspect+Polar frame이 Current (`ded3b073`,`4aa9da65`) | R33 label anchors, R39 occupied header, R43 child-local frame이 같은 resolver를 소비 |
| computed | finite numeric binary/unary AST만 | 모든 AST branch structural preflight+lazy typed evaluator |
| derived data | bin2d만 standalone current owner 보유 | public standalone16 family current owner/revision executor |
| offsets | mark config padding이 resolved policy 입력 | semantic scale padding 단일 owner로 migration |
| stroke | Rule constant-only encodeStroke | family matrix·field mapping·scale·legend·selection 동기화 |
| summary quantile | aggregate.op가 parameter object,probability 키 | 기존 문법 유지;R36 p는 adapter에서만 변환 |
| facet headers | cell.value를 각 child 위에 출력 | explicit role 요청의 separate strips+legacy 경로 보존 |
| theme | name+overrides,built-in light/dark | partial tokens와 propagation origin을 추가 |
| planner | scales/marks/guides/layout/highlights | data editor가 명시 계산,selection evaluation 순서 분리 |
| graphics | concrete M/L/C/Z path 및 primitives | rounded path+stroke attrs,backend별 의미 추론 금지 |

## 하나의 기능을 구현하는 최소 작업 단위

### 작업 시작 체크

- 대상 feature/Phase/dependencies와 실제 사용자 승인 범위를 STEP에 기록한다.
- 구현할 public call을 최소1개 완전한 객체로 적는다. ellipsis/any/추측한 method 이름은 테스트 입력에 쓰지 않는다.
- 수정할 semantic/config/graphic path와 요청 omission/reset/mode-transition 표를 feature에서 가져온다.
- 기존 code owner/test를 읽는다. 같은 이름의 새 helper를 만들기 전에 existing equivalent를 찾는다.

### 권장 구현 순서

1. grammar validator와 pure normalizer. unknown keys·union·field 존재·finite 범위·budget를 검사.
2. 수치/geometry pure resolver. 독립 literal 기대값 테스트를 먼저 실행.
3. wrapped domain action. 의미 저장과 createDerivedData/rebind/materializer trace 연결.
4. consumer lifecycle. state owner에서 affected refs를 수집하고 deterministic plan 실행.
5. façade pass-through와 public declaration/Full registration. 기존 basic method surface는 유지.
6. contracts/cards/relations/MCP/docs/type consumer를 같은 conceptual diff로 동기화.
7. 시각 기능은 기존 V Gate 절차로 primitive target 승인 증거를 확보하고 public 결과와 동일 실행 parity.
8. scoped/cumulative checks를 통과한 coherent change를 commit/push하고 다음 허용 작업으로 진행.

routine helper 이름/파일 분할/테스트 fixture 색은 구현자가 결정할 수 있다. public signature/default/계산 의미/ownership/지원행렬을 바꾸는 것은 스펙 수정과 기존 Gate 범위 확인이 필요하다.

## 모든 새로운 action에 공통인 transaction

~~~text
input immutable program P
  resolve target + ownership
  validate option structure
  normalize requested final state
  collect live dependency closure
  preflight all affected resources
  construct immutable private candidate Q
  calculate data revisions explicitly if requested
  materialize final domains -> effective bounds/ranges -> final mark items
  evaluate label membership -> statistical references/labels
  materialize guides -> occupied layout -> highlights
  reconcile context and release genuinely unreferenced resources
  return Q
~~~

P의 semanticSpec/graphicSpec/materializationConfigs/context/trace뿐 아니라 resolvedScales/children/compositionSpec도 실패 시 보존한다. private candidate의 trace/ID 생성이 입력 P나 전역 counter에 새면 실패다. 이미 frozen된 caller input의 배열/AST/object를 mutate하지 않는다.

read-only planning과 wrapped materialization을 구별한다. pure helper가 trace를 수동 작성하지 않는다. bulk encoding/revision은 임시 상태를 final처럼 validate하지 않으며 외부 shared consumer를 빼고 성공시킬 수 없다.

## requested와 resolved의 저장 규칙

| 결정 | 단일 requested owner | resolved 결과 |
| --- | --- | --- |
| standalone derived definition | current dataset.transform;config는 owner.current만 | 새 snapshot.values와 family resolved provenance |
| scale padding/domain/type | semantic scale | resolvedScales geometry/domain |
| aspect/polarFrame | semantic coordinate | effective local frame |
| label selector/placement | label owner config | 현재 membership,text bbox,leader |
| statistic population/field mode | reference owner config | generated datum/Rule/Rect geometry |
| legend values/block override | legend recipe | symbols,formatted text,occupied bounds |
| header map/side/align | facet header recipe | role strips and child allocations |
| theme | name+requested tokens+override provenance | current rendered style |
| rounded/cap/join style | mark requested style owner | concrete commands/attrs/bounds |

resolved 값으로 requested state를 덮으면 auto 값이 이후 데이터/크기 변화를 따라가지 못한다. saved source template는 현재 replay용 live state이며 historical trace와 다르다.

## integration 완료 행렬

각 feature는 아래 cell을 해당 Phase STEP에 required/not-applicable(reason)/pending(feature owner)로 기록한다. pending은 roadmap completion에서 허용하지 않는다.

| 공통 cell | 인수 기준 |
| --- | --- |
| minimal + explicit target | 동일 의미,잘못된 inference 추가 없음 |
| patch twice + reset | 누락 유지,mode 전용 키 cleanup,auto 기본 복귀 |
| source revision | stable owner를 유지하며 최신 데이터 반영 |
| scale/type/reencode | mark/guide/label/reference가 최종 상태 사용 |
| Canvas/aspect/frame | requested geometry·style 유지 |
| filter/selection | body filter와label membership·highlight 구별 |
| layer/concat | shared consumer와ancestor layout 갱신 |
| Cartesian facet/repeat | 원래 source grain에서 요청 replay |
| Polar/Parallel facet/repeat | R43 required matrix,후속 통합 완료 |
| removal | owner closure와live refs,부활/잔재 없음 |
| renderer | graphic-only Canvas/PNG/SVG/PDF,paint bounds 일치 |
| types/package/knowledge | runtime/type/installed consumer/Full-basic/contracts 모두 동기화 |

데이터-only transform의 자체 renderer cell은 not-applicable이나 해당 데이터를 소비하는 차트의 lifecycle은 required다. 모든 feature×모든 mark를 무작정 지원한다고 해석하지 말고 각 feature의 지원표를 따른다.

## 인수 case를 실제 테스트로 옮기는 법

ACCEPTANCE_CASES의 입력/기대 결과는 명세이고 각 case의 status/runtimeEvidence는 현재 실행 증거다. `passed`는 연결된 실제 test가 통과했을 때만, 후속 lifecycle 일부가 남으면 `partial`, 미구현은 `planned`로 둔다. JSON에 써 있다는 사실 자체는 테스트 통과가 아니다.

- N: 값/정상 동작, E: 거부/원자성, L: 여러 action을 거친 lifecycle.
- 한 case의 성공과 실패를 실제 action call로 각각 재현한다.
- 수치 expected는 독립 수식/literal; actual mapper로 expected 계산 금지.
- error는 class+필요한 operation/target/field 정보 검사. 변경되지 않은 legacy 오류 문장 전체를 새 규약으로 바꾸지 않는다.
- JSON round-trip으로 undefined를 제거한 뒤 immutability를 비교하지 않는다. deepStrictEqual 또는 structured snapshots를 사용한다.
- test 파일은 stable capability 디렉터리 소유로 만들고 roadmap JSON을 import하지 않는다.
- spec 사례보다 많은 boundary test가 필요하면 추가한다. case 개수만 채웠다고 completion하지 않는다.

## Phase별 완료 패키지

Phase1–11은 배정 feature의 승인된 계약/구현/test/types/current docs가 맞아야 완료할 수 있다. later integration은 명시 owner에게 남긴다. Phase12는 25개 및 모든 required integration cell을 닫고 package/renderer/browser/realistic 검증을 수행한다.

마감 보고에는 완료 기능,근거 revision,실행한 tests 결과,미실행/남은 integration,실제 다음 단계만 적는다. planned/ready/approved/current를 서로 바꿔 쓰지 않는다. release/PR/deploy는 저장소의 별도 권한 규칙을 따른다.
