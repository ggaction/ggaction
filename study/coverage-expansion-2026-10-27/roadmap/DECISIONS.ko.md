# 구현 결정과 검토 경계

## 확정된 사용자 범위

사용자가 결정한 범위는 START_HERE의 여덟 항목이다. 이를 재확인하기 위해 구현을 멈추지 않는다. 아래의 세부 API, schema, 수치 정책은 이번 로드맵에서 선택한 검토 가능한 제안이다. 사용자가 이 세부 사항까지 승인했다고 기록하지 않는다.

## 일관된 제안 결정

| 결정 | 이 로드맵의 선택 | 다른 방식이 필요해지는 조건 |
|---|---|---|
| identity | typed key tuple와 persisted row token; 값 hash 금지 | 기존 explicit key 계약 충돌을 발견한 경우에만 migration 검토 |
| 리소스 저장 | semanticSpec.resources에 discriminated resource 배열 추가, materializationConfigs에 owner intent | top-level 두 번째 mutable registry를 만들지 않음 |
| schema | 현행 editable schema 3을 읽고 신규 상태는 schema 4로 저장 | 현행 3의 의미를 소급 변경하지 않음 |
| 참조 | 공개 옵션은 data/hierarchy/graph/layout/route 같은 역할별 ID 문자열; 내부는 kind/id/revision typed reference | 모든 API에 제각각 Ref 접미사를 혼용하지 않음 |
| partition 좌표 | coordinate는 실제 coordinate ID, 표현 종류는 참조된 coordinate의 type으로 결정 | 과거 예시의 coordinate:'polar'가 resource ID와 혼동되면 바로잡음 |
| graph 순서 | typed node key 사전순; edge key와 stable ruleId로 tie 해소 | localeCompare와 object enumeration 순서에 의존하지 않음 |
| 비용 높은 계산 | pure compute 함수가 prepared result를 반환, wrapped action이 검증 후 저장 | Promise를 ChartProgram state나 action return에 저장하지 않음 |
| 제한 초과 | atomic budget error; 명시 preview mode만 incomplete 결과 반환 | preview 결과를 완전한 저장 리소스로 승인하지 않음 |
| geometry | 기존 M/L/C/Z 문법을 복수 subpath로 확장; source arc는 cubic으로 낮춤 | SVG d string을 별도 canonical geometry로 저장하지 않음 |
| 파라미터 | serializable typed AST, ordered first-match condition | eval/Function/임의 JS callback 저장 금지 |
| 통계 | 기존 current 계약을 보존하고 누락 경로만 확장 | 새 기본값으로 기존 KDE/bin/stack 결과를 일괄 변경하지 않음 |
| paint | 단색+linear/radial gradient+7개 pattern의 공통 구조 | backend별 texture fallback 금지 |
| layout | explicit width/height 보존, solve 실패 시 layout-unsatisfied | Canvas 몰래 확대·폰트 임의 축소 금지 |
| interaction | committed baseline+한 preview transaction, terminal event 한 번 | 사용자 지정 concurrent gesture는 첫 버전 범위 아님 |
| animation | 순수 plan/sample, 별도 clock/player; 같은 시간 같은 scene | renderer별 임의 transition 코드 금지 |
| kernel 버전 | algorithmVersion과 resolved options 저장 | 라이브러리 업데이트가 옛 저장 결과를 암묵적으로 바꾸면 안 됨 |
| release | capability qualification과 exact candidate artifact를 함께 종료 | CI 일부 통과를 릴리스 완료로 부르지 않음 |

새 schema4에서 semanticSpec.resources가 canonical owner다. 기존 dataset/layer/scale/coordinate/guide 배열을 일괄 registry로 옮기지 않는다. 기존 selection의 의미와 신규 persistent selection의 위치를 중복시키지 않고 migration에서 한 곳으로 정규화한다. 상세 소유권은 core 계약에 따른다.

## 구현 시 필요한 Gate

저장소의 agent_docs/impl/AGENTS.md는 “Before implementation, every roadmap Phase identifies any approval Gates required for unresolved material public, persisted-schema, architectural, release, or visual decisions.”라고 정한다. 또한 “A new visual target requires explicit confirmation of its rendered graphical primitive before its public action flow is implemented.”라고 정한다. 이 로드맵을 작성하는 일은 그 검토 자료를 준비하는 단계다. 현재 사용자에게 새 승인 요청을 보내거나 문서 작성을 중단할 이유는 없다.

| Gate | 상태 | 검토할 결정과 결과물 | 의존하지 않는 작업 |
|---|---|---|---|
| G-CORE | ready-for-review | schema4, identity/lineage, resource CRUD, API 옵션 표와 migration fixtures | baseline 조사·독립 oracle·테스트 harness |
| G-VISUAL | planned | 새 mark별 exact target call chain+primitive render+동일 run public equality 시험 | 순수 layout/geometry 수치 kernel 및 준비 자료 |
| G-RUNTIME | ready-for-review | session/event/transaction, hit priority, animation kernel와 interrupt semantics | geometry 및 domain kernel |
| G-GEO | ready-for-review | projection 지원표, planar/geographic 단위, asset/LOD/camera 계약 | GeoJSON parser·독립 projection fixture |
| G-PERF | ready-for-review | size class/SLO/정확 모드 비용과 제한; hardware 측정 결과 | correctness 시험 |
| G-RELEASE | planned | 실제 후보 commit/tag/tarball/hash/CI/docs evidence | 모든 로컬 검증과 후보 준비 |

Gate 상태는 planned, ready-for-review, approved, changes-requested만 사용한다. 승인 증거가 없으면 approved가 아니다. 기존 정확한 승인 증거가 있으면 재사용한다. 공개 호출이 새 시각 결과를 만드는 경우 primitive 검토를 먼저 마친다. 검토용 source와 화면을 완성한 뒤 저장소 지침에 따라 commit/push하여 검토 revision을 식별한다. PR 생성·publish·deploy는 별도의 당시 사용자 지시를 확인한다. 이전 대화의 과거 릴리스 요청을 미래의 모든 릴리스에 대한 무제한 허가로 해석하지 않는다.

## 변경이 필요할 때

기술적으로 제안이 성립하지 않으면 해당 카드에 반례 입력, 실제 결과, 깨지는 invariant, 최소 수정안을 기록한다. 범위를 축소하거나 fallback으로 감추지 않는다. routine 내부 refactor는 새로운 공개 결정을 만들지 않으므로 기존 승인 범위 안에서 진행한다. 계약이 바뀌면 관련 카드·fixtures·타입·정책·인수 시험 담당을 같은 변경에서 갱신한다.
