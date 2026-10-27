# ggaction 상세 구현 로드맵

기준 0.0.26 · 40ec7edead7fc84de05aad31888dd0f7d264a512 · 77개 실행 카드 · 79개 인수 시험군 · 30개 활성 요구



## ggaction 구현 로드맵 사용법

이 로드맵은 ggaction 0.0.26, 커밋 40ec7edead7fc84de05aad31888dd0f7d264a512를 기준으로 한다. 기존 22개 작업 묶음과 79개 인수 시험군을 작은 구현 단계로 분해한다. 이번 산출물은 구현 명세이며, 새 API의 구현 완료나 릴리스 승인을 의미하지 않는다.

목표는 하나의 데이터·의미·선택 모델 위에서 차트, 디자인, 구조형 레이아웃, geo, 인터랙션, 애니메이션을 완결하는 것이다. 기능마다 생성만 되는 상태를 허용하지 않는다. 수정, 데이터 교체, 중첩 합성, 저장 복원, hit, 접근성, 애니메이션, 네 렌더 경로까지 연결해야 한다.

### 범위와 우선순위

- ggaction 자체 설계가 기준이다. Flint 정합성·백엔드 연결, chart-llm 번역·원본 재현은 이번 구현 및 릴리스 조건에 없다.
- Icicle와 Sunburst는 하나의 partition 결과와 node identity를 공유한다. 계층 집계나 선택 의미를 두 번 구현하지 않는다.
- 그래프 추론은 kNN, radius, similarity, MST/forest, group, sequence를 포함한다. 레이아웃과 추론과 edge routing을 독립시킨다.
- Edge bundling은 hierarchical, force-directed, density/KDE, edge-path 네 방법 모두 포함한다. 하나의 곡선 알고리즘에 이름만 네 개 붙이는 구현은 실패다.
- UpSet과 전용 집합 시각화는 보류한다. 전용 membership/intersection resource, constructor, 시험은 만들지 않는다. 일반 selection, predicate, Jaccard metric은 유지한다.
- Funnel의 이름은 Pyramid로 바꾼다. 자동 정렬, 역전, 정삼각형 강제 같은 의미 변경은 하지 않는다. KPI/Gauge는 전용 개발 대상이 아니다.
- Marginal, Bullet, Combo는 기존 액션 조합으로 문서화한다. 전용 constructor를 늘리지 않는다.
- 같은 Cartesian frame에는 Y scale 하나와 표시 Y축 최대 하나만 허용한다. 숨긴 독립 Y scale, mirror Y guide, 겹쳐 놓은 별도 frame으로 우회하지 않는다. 분리된 facet/concat panel의 독립 Y와 범위 endpoint y2는 합법이다.

범위 충돌은 최신 사용자 결정 → 이 로드맵의 결정표 → 도메인 계약 → 작업 카드 → 이전 보고서 순서로 해결한다. 현행 동작을 설명하는 current contract는 실제 코드와 함께 확인한다. 제안 계약과 다르다고 현재 구현의 버그로 단정하지 않는다. 새로운 공개/저장 계약은 구현 시 repository Gate 절차에 따라 검토한다.

### 구현자가 한 번에 읽을 패킷

1. 이 문서와 DECISIONS.ko.md를 읽는다. 종료할 때까지 지켜야 하는 불변식을 확인한다.
2. plan.json에서 선행 단계가 모두 완료된 가장 앞의 작업 하나를 선택한다. 임의로 다른 WP를 먼저 구현하지 않는다.
3. 해당 tasks/STEP 파일의 필수 계약, 기존 소스 위치, 제안 소스 위치만 읽는다. 수백 KB 보고서 전체를 매번 컨텍스트에 넣지 않는다.
4. source-map.json의 baseline과 실제 HEAD를 비교한다. drift가 있으면 파일/symbol의 새 위치를 확인하고 작업 인계 기록에 남긴다. 기존 checkout을 reset하지 않는다.
5. 해당 capability의 최소 실패 시험을 먼저 작성한다. fixture의 expected는 production helper로 생성하지 않는다.
6. 순수 kernel → validation → wrapped action → materialization → consumer 연결 순으로 구현한다. 독립 계산 결과를 검증하기 전에 큰 facade를 만들지 않는다.
7. 카드의 focused 시험과 필수 공통 검사를 실행한다. 실패하면 expected를 고치기 전에 원인과 계약을 확인한다.
8. progress-template.json 형식으로 실제 명령, 종료코드, commit, artifact hash, 남은 의무를 기록한다. 다음 카드는 완료 기록과 관련 계약만 넘긴다.

### 완료의 의미

작업 상태는 planned → in-progress → implemented → verified → complete다. implemented는 코드가 존재한다는 뜻이고, verified는 해당 시험이 실행되어 통과했다는 뜻이다. complete는 모든 consumer와 문서·타입·저장 계약, 필요한 Gate가 닫혔다는 뜻이다. blocked는 오류·외부 의존·미승인 결정이 명시된 경우에만 쓴다. skip, 미실행, 예제 스크린샷 하나는 통과가 아니다.

커널 작업 카드의 complete가 WP 전체 완료를 의미하지 않는다. 특히 partition focus/morph, bundling hit/geo/export, geo camera/LOD, 인터랙션 async settlement는 뒤의 통합 카드가 소유한다. acceptance-cases.json은 모든 인수 시험군의 구현 담당과 최종 종료 단계를 별도로 연결한다.

### 작업을 실패시키는 구현

- 사용자가 raw SVG/path 좌표나 행별 graphic 생성 루프를 작성해야 정상 차트를 만들 수 있다.
- semanticSpec을 renderer에서 해석하거나, hidden 자동 compiler가 전체 차트를 다시 만든다.
- 새 리소스가 JSON에는 저장되지만 fresh process에서 edit/remove할 수 없다.
- data 값 hash로 item identity를 만들고 값 변경을 삭제·생성으로 처리한다.
- node drag/Canvas resize만으로 graph inference를 다시 실행한다.
- bundling 결과를 PNG 이미지로 저장하거나 bundle 교차점을 node로 취급한다.
- 미지원 geometry를 직선·빈 그림으로 바꾸고 성공을 반환한다.
- gesture move마다 baseline을 commit하거나 취소 후 history에 잔여 항목이 남는다.
- animation의 최종 geometry만 hit하며 현재 frame과 다른 항목을 반환한다.
- 새 테스트가 test runner에 발견되지 않거나 계획 파일을 import해서 테스트가 스스로 참이 된다.
- 외부 참고 요구 2,279행 또는 보류된 시험을 현재 지원 분모로 센다.

### 문서 위치와 미래 구현 기록

현재 보고서 폴더의 roadmap은 검토용 제안 패키지다. 구현을 시작할 때에는 저장소 agent_docs/impl/AGENTS.md의 형식에 맞춰 새 roadmapN을 선정하고 chart/ 계약과 phaseM/GOAL.md, STEPn.md로 옮긴다. 기존 번호를 추측하거나 덮어쓰지 않는다. 각 STEP 앞에 진행 상태 체크리스트를 유지한다. 런타임과 안정 테스트는 이 계획 디렉터리를 import하지 않는다.

### 읽는 순서

ROADMAP.ko.html은 전체 통합 독서용이고, tasks/는 작은 모델의 실행용이다. contracts/는 중복되면 안 되는 수식·옵션·오류 계약이다. plan.json은 의존성 순서, source-map.json은 코드 위치, oracle-fixtures.json은 손으로 확인 가능한 기대값이다. 검증 스크립트는 문서의 완전성과 연결을 확인하며, ggaction 미구현 기능의 성공을 주장하지 않는다.

### 한 카드만 꺼내는 명령

아래 명령은 보고서 root에서 실행한다. 소스를 변경하거나 구현을 시작하지 않고 필요한 작업 패킷을 출력한다. progress-dir의 완료 기록은 실제 실행 증거가 있는 경우에만 다음 작업을 연다.

~~~sh
python3 scripts/roadmap-next.py
python3 scripts/roadmap-next.py --task STEP-035 --with-contracts
python3 scripts/roadmap-next.py --progress-dir /absolute/path/to/implementation-progress
~~~

입력 progress JSON의 commands 항목은 command, exitCode, logPath, logSha256를, artifacts 항목은 path, sha256, kind를 기록한다. unresolved obligations가 있는 task는 complete가 아니다. 이 도구는 증거 존재와 dependency를 확인하는 보조이며 사람의 검토나 실행 자체를 대신하지 않는다.


## 구현 결정과 검토 경계

### 확정된 사용자 범위

사용자가 결정한 범위는 START_HERE의 여덟 항목이다. 이를 재확인하기 위해 구현을 멈추지 않는다. 아래의 세부 API, schema, 수치 정책은 이번 로드맵에서 선택한 검토 가능한 제안이다. 사용자가 이 세부 사항까지 승인했다고 기록하지 않는다.

### 일관된 제안 결정

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

### 구현 시 필요한 Gate

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

### 변경이 필요할 때

기술적으로 제안이 성립하지 않으면 해당 카드에 반례 입력, 실제 결과, 깨지는 invariant, 최소 수정안을 기록한다. 범위를 축소하거나 fallback으로 감추지 않는다. routine 내부 refactor는 새로운 공개 결정을 만들지 않으므로 기존 승인 범위 안에서 진행한다. 계약이 바뀌면 관련 카드·fixtures·타입·정책·인수 시험 담당을 같은 변경에서 갱신한다.


## 실행 순서와 작업 인계

총 77개 실행 카드, 22개 작업 묶음, 79개 인수 시험군, 30개 활성 요구다. 모든 카드는 planned다.

| 순서 | 작업 | 선행 카드 | WP |
|---|---|---|---|
| STEP-001 | [기준 버전과 실행 경로 고정](roadmap/tasks/STEP-001-baseline.ko.md) | 없음 | WP-00 |
| STEP-002 | [독립 oracle와 fixture harness](roadmap/tasks/STEP-002-oracle-harness.ko.md) | STEP-001 | WP-00 |
| STEP-003 | [시험 발견과 evidence 기록](roadmap/tasks/STEP-003-test-discovery.ko.md) | STEP-002 | WP-00 |
| STEP-004 | [명시 key와 생성 row identity](roadmap/tasks/STEP-004-row-identity.ko.md) | STEP-003 | WP-02 |
| STEP-005 | [모든 transform의 final grain lineage](roadmap/tasks/STEP-005-derived-lineage.ko.md) | STEP-004 | WP-02 |
| STEP-006 | [Scene selection과 revision 연결](roadmap/tasks/STEP-006-scene-identity.ko.md) | STEP-005 | WP-02 |
| STEP-007 | [Typed resource schema와 ownership](roadmap/tasks/STEP-007-resource-registry.ko.md) | STEP-006 | WP-03 |
| STEP-008 | [리소스 edit remove와 재계산](roadmap/tasks/STEP-008-resource-lifecycle.ko.md) | STEP-007 | WP-03 |
| STEP-009 | [Schema 4와 역사적 program 복원](roadmap/tasks/STEP-009-schema-migration.ko.md) | STEP-008 | WP-03 |
| STEP-010 | [복수 subpath validator와 path builder](roadmap/tasks/STEP-010-compound-path.ko.md) | STEP-009 | WP-04 |
| STEP-011 | [Bounds flatten stroke와 clip kernel](roadmap/tasks/STEP-011-geometry-math.ko.md) | STEP-010 | WP-04 |
| STEP-012 | [모든 renderer와 scene의 복합 path](roadmap/tasks/STEP-012-compound-render.ko.md) | STEP-011 | WP-04 |
| STEP-013 | [안전한 AST와 typed function registry](roadmap/tasks/STEP-013-expression-ast.ko.md) | STEP-009 | WP-06 |
| STEP-014 | [통계와 pivot LOESS 경계 보강](roadmap/tasks/STEP-014-statistics-oracles.ko.md) | STEP-013 | WP-06 |
| STEP-015 | [Timezone과 calendar용 날짜 grain](roadmap/tasks/STEP-015-time-transform.ko.md) | STEP-014 | WP-06 |
| STEP-016 | [Parameter와 조건부 encoding invalidation](roadmap/tasks/STEP-016-conditional-dataflow.ko.md) | STEP-015 | WP-06 |
| STEP-017 | [7가지 pattern과 gradient](roadmap/tasks/STEP-017-paint-resources.ko.md) | STEP-009, STEP-012 | WP-05 |
| STEP-018 | [이미지 resolver와 offline 자원](roadmap/tasks/STEP-018-image-resolver.ko.md) | STEP-017 | WP-05 |
| STEP-019 | [Font identity와 text rematerialization](roadmap/tasks/STEP-019-font-metrics.ko.md) | STEP-018 | WP-05 |
| STEP-020 | [Hierarchy tree와 treemap](roadmap/tasks/STEP-020-hierarchy-layouts.ko.md) | STEP-006, STEP-012, STEP-016 | WP-08 |
| STEP-021 | [Observed graph와 fixed circular force 배치](roadmap/tasks/STEP-021-graph-layouts.ko.md) | STEP-020 | WP-08 |
| STEP-022 | [Sankey DAG와 cyclic routing](roadmap/tasks/STEP-022-flow-layouts.ko.md) | STEP-021 | WP-08 |
| STEP-023 | [Grid contour와 density contour](roadmap/tasks/STEP-023-contour-layouts.ko.md) | STEP-022 | WP-08 |
| STEP-024 | [Calendar cell과 month boundary](roadmap/tasks/STEP-024-calendar-layout.ko.md) | STEP-023 | WP-08 |
| STEP-025 | [공통 hierarchy value mode](roadmap/tasks/STEP-025-partition-values.ko.md) | STEP-006, STEP-009, STEP-012, STEP-016 | WP-22 |
| STEP-026 | [Normalized partition 구간](roadmap/tasks/STEP-026-partition-intervals.ko.md) | STEP-025 | WP-22 |
| STEP-027 | [Icicle와 Sunburst materializer](roadmap/tasks/STEP-027-partition-marks.ko.md) | STEP-026 | WP-22 |
| STEP-028 | [Focus breadcrumb와 bend 준비](roadmap/tasks/STEP-028-partition-navigation.ko.md) | STEP-027 | WP-22 |
| STEP-029 | [Metric preprocessing과 stable edge key](roadmap/tasks/STEP-029-graph-metrics.ko.md) | STEP-006, STEP-009, STEP-016 | WP-24 |
| STEP-030 | [kNN radius similarity exact rules](roadmap/tasks/STEP-030-graph-neighbors.ko.md) | STEP-029 | WP-24 |
| STEP-031 | [MST forest group sequence](roadmap/tasks/STEP-031-graph-rules.ko.md) | STEP-030 | WP-24 |
| STEP-032 | [Exact accelerator approximate와 수정 연결](roadmap/tasks/STEP-032-graph-search-revision.ko.md) | STEP-031 | WP-24 |
| STEP-033 | [Native theme과 property provenance](roadmap/tasks/STEP-033-theme-precedence.ko.md) | STEP-009, STEP-019 | WP-07 |
| STEP-034 | [Guide와 responsive layout solve](roadmap/tasks/STEP-034-layout-solver.ko.md) | STEP-033 | WP-07 |
| STEP-035 | [Nested facet와 shared guide 정렬](roadmap/tasks/STEP-035-nested-composition.ko.md) | STEP-034 | WP-07 |
| STEP-036 | [Edge route 공통 kernel과 budget](roadmap/tasks/STEP-036-route-resource.ko.md) | STEP-012, STEP-024, STEP-028, STEP-032 | WP-25 |
| STEP-037 | [Hierarchy path와 B-spline bundling](roadmap/tasks/STEP-037-hierarchical-bundling.ko.md) | STEP-036 | WP-25 |
| STEP-038 | [FDEB compatibility와 iterative solver](roadmap/tasks/STEP-038-force-edge-bundling.ko.md) | STEP-037 | WP-25 |
| STEP-039 | [KDE field gradient와 vector advection](roadmap/tasks/STEP-039-density-bundling.ko.md) | STEP-038 | WP-25 |
| STEP-040 | [Weighted path lock와 stretch](roadmap/tasks/STEP-040-edge-path-bundling.ko.md) | STEP-039 | WP-25 |
| STEP-041 | [Bundling 선택 worker cache export 연결](roadmap/tasks/STEP-041-bundling-consumers.ko.md) | STEP-040 | WP-25 |
| STEP-042 | [GeoJSON TopoJSON 정규화](roadmap/tasks/STEP-042-geometry-data.ko.md) | STEP-006, STEP-012, STEP-019, STEP-035 | WP-10 |
| STEP-043 | [Projection registry와 forward inverse](roadmap/tasks/STEP-043-projection-kernels.ko.md) | STEP-042 | WP-10 |
| STEP-044 | [Date line clip fit와 geo marks](roadmap/tasks/STEP-044-geo-stream.ko.md) | STEP-043 | WP-10 |
| STEP-045 | [Geometry join과 hierarchy LOD](roadmap/tasks/STEP-045-geo-join-lod.ko.md) | STEP-044 | WP-10 |
| STEP-046 | [Camera navigation과 viewport contract](roadmap/tasks/STEP-046-geo-camera.ko.md) | STEP-045 | WP-10 |
| STEP-047 | [Geometry별 exact hit와 CSS 좌표](roadmap/tasks/STEP-047-hit-shapes.ko.md) | STEP-006, STEP-012, STEP-035 | WP-11 |
| STEP-048 | [공간 인덱스와 guide semantic roles](roadmap/tasks/STEP-048-hit-index.ko.md) | STEP-047 | WP-11 |
| STEP-049 | [Frame hit와 transition bridge](roadmap/tasks/STEP-049-hit-frame.ko.md) | STEP-048 | WP-11 |
| STEP-050 | [다섯 경계의 단일 Y 검증](roadmap/tasks/STEP-050-single-y-policy.ko.md) | STEP-009, STEP-035 | WP-26 |
| STEP-051 | [명칭과 조합 및 제외 정책](roadmap/tasks/STEP-051-native-api-policy.ko.md) | STEP-050 | WP-26 |
| STEP-052 | [외부 정합성 없는 core 경계](roadmap/tasks/STEP-052-native-boundaries.ko.md) | STEP-051 | WP-26 |
| STEP-053 | [Pyramid OHLC waterfall 역할 구현](roadmap/tasks/STEP-053-pyramid-ohlc-waterfall.ko.md) | STEP-016, STEP-035, STEP-024, STEP-028, STEP-041, STEP-052 | WP-09 |
| STEP-054 | [Trail과 polar 통계 variant](roadmap/tasks/STEP-054-trail-native-variants.ko.md) | STEP-053 | WP-09 |
| STEP-055 | [Cell table과 compact chart recipe](roadmap/tasks/STEP-055-table-sparkline.ko.md) | STEP-054 | WP-09 |
| STEP-056 | [Marginal Bullet Combo 종단 recipe](roadmap/tasks/STEP-056-composition-recipes.ko.md) | STEP-055 | WP-09 |
| STEP-057 | [Persistent selection과 parameter bindings](roadmap/tasks/STEP-057-selection-state.ko.md) | STEP-009, STEP-016, STEP-049, STEP-028, STEP-032, STEP-041, STEP-052 | WP-12 |
| STEP-058 | [Pointer capture와 gesture state machine](roadmap/tasks/STEP-058-gesture-controller.ko.md) | STEP-057 | WP-12 |
| STEP-059 | [Brush lasso angular와 scale inversion](roadmap/tasks/STEP-059-brush-lasso.ko.md) | STEP-058 | WP-12 |
| STEP-060 | [Linked filter legend reorder annotation](roadmap/tasks/STEP-060-linked-direct-controls.ko.md) | STEP-059 | WP-12 |
| STEP-061 | [Stable matching과 transition 계획](roadmap/tasks/STEP-061-transition-plan.ko.md) | STEP-006, STEP-012, STEP-035, STEP-046, STEP-049, STEP-028, STEP-032, STEP-041, STEP-052 | WP-14 |
| STEP-062 | [Deterministic sampler와typed kernels](roadmap/tasks/STEP-062-transition-sampler.ko.md) | STEP-061 | WP-14 |
| STEP-063 | [Virtual clock과 timeline playback](roadmap/tasks/STEP-063-animation-player.ko.md) | STEP-062 | WP-14 |
| STEP-064 | [Animation 저장과 frame export](roadmap/tasks/STEP-064-animation-envelope.ko.md) | STEP-063 | WP-14 |
| STEP-065 | [Committed baseline과 preview transaction](roadmap/tasks/STEP-065-session-transactions.ko.md) | STEP-035, STEP-046, STEP-060 | WP-13 |
| STEP-066 | [Native events와 async settlement](roadmap/tasks/STEP-066-session-events.ko.md) | STEP-065 | WP-13 |
| STEP-067 | [Update resize asset worker destroy 경쟁](roadmap/tasks/STEP-067-session-lifecycle.ko.md) | STEP-066 | WP-13 |
| STEP-068 | [Keyboard focus와 accessible data](roadmap/tasks/STEP-068-accessible-interactions.ko.md) | STEP-019, STEP-060, STEP-067, STEP-064 | WP-18 |
| STEP-069 | [네 포맷과 offline fresh-process 복원](roadmap/tasks/STEP-069-export-restore.ko.md) | STEP-068 | WP-18 |
| STEP-070 | [현재 frame와 모든 deferred 통합 의무 종료](roadmap/tasks/STEP-070-cross-feature-integration.ko.md) | STEP-069 | WP-18 |
| STEP-071 | [Size class SLO와 memory](roadmap/tasks/STEP-071-performance-qualification.ko.md) | STEP-070 | WP-19 |
| STEP-072 | [새 exports와 source-free package](roadmap/tasks/STEP-072-package-consumers.ko.md) | STEP-071 | WP-19 |
| STEP-073 | [Current contracts와 agent packets](roadmap/tasks/STEP-073-human-agent-docs.ko.md) | STEP-072 | WP-19 |
| STEP-074 | [Native 요구와 consumer matrix 종료](roadmap/tasks/STEP-074-native-qualification.ko.md) | STEP-003, STEP-070, STEP-073, STEP-028, STEP-032, STEP-041, STEP-052 | WP-20 |
| STEP-075 | [실패와 성공 표본 독립 검토](roadmap/tasks/STEP-075-independent-review.ko.md) | STEP-074 | WP-20 |
| STEP-076 | [동일 candidate와 tag 기반 검증](roadmap/tasks/STEP-076-release-candidate.ko.md) | STEP-075 | WP-21 |
| STEP-077 | [Registry docs와 공개 결과 대조](roadmap/tasks/STEP-077-published-release.ko.md) | STEP-076 | WP-21 |

### 단계 종료 표

| WP | 첫 카드 | 종료 카드 | 선행 WP |
|---|---|---|---|
| WP-00 현행 기반·독립 oracle 고정 | STEP-001 | STEP-003 | 없음 |
| WP-02 안정적인 item identity와 lineage | STEP-004 | STEP-006 | WP-00 |
| WP-03 resource·schema·persistence 확장 | STEP-007 | STEP-009 | WP-02 |
| WP-04 복합 path와 geometry 계약 | STEP-010 | STEP-012 | WP-03 |
| WP-06 data transform·expression·조건부 인코딩 | STEP-013 | STEP-016 | WP-03 |
| WP-05 paint·image·font 자원 | STEP-017 | STEP-019 | WP-03, WP-04 |
| WP-08 구조형·연속 기하 layout | STEP-020 | STEP-024 | WP-02, WP-04, WP-06 |
| WP-22 Icicle·Sunburst 공통 partition | STEP-025 | STEP-028 | WP-02, WP-03, WP-04, WP-06 |
| WP-24 규칙 기반 graph inference | STEP-029 | STEP-032 | WP-02, WP-03, WP-06 |
| WP-07 ggaction 디자인·가이드·반응형 조합 | STEP-033 | STEP-035 | WP-03, WP-05 |
| WP-25 네 대표 edge bundling 방법 | STEP-036 | STEP-041 | WP-04, WP-08, WP-22, WP-24 |
| WP-10 geo 전체 경로 | STEP-042 | STEP-046 | WP-02, WP-04, WP-05, WP-07 |
| WP-11 semantic hit와 공간 인덱스 | STEP-047 | STEP-049 | WP-02, WP-04, WP-07 |
| WP-26 자체 설계 원칙·단일 Y·조합·명칭 | STEP-050 | STEP-052 | WP-03, WP-07 |
| WP-09 native 차트 표현과 공통 조합 recipe | STEP-053 | STEP-056 | WP-06, WP-07, WP-08, WP-22, WP-25, WP-26 |
| WP-12 native selection·gesture·입력 controller | STEP-057 | STEP-060 | WP-03, WP-06, WP-11, WP-22, WP-24, WP-25, WP-26 |
| WP-14 transition planner·sampler·player | STEP-061 | STEP-064 | WP-02, WP-04, WP-07, WP-10, WP-11, WP-22, WP-24, WP-25, WP-26 |
| WP-13 native 상태·명령·이벤트·lifecycle | STEP-065 | STEP-067 | WP-07, WP-10, WP-12 |
| WP-18 접근성·export·복원 종단검증 | STEP-068 | STEP-070 | WP-05, WP-12, WP-13, WP-14 |
| WP-19 성능·배포패키지·문서·agent 지원 | STEP-071 | STEP-073 | WP-18 |
| WP-20 native 계약·조합·성능 qualification | STEP-074 | STEP-075 | WP-00, WP-18, WP-19, WP-22, WP-24, WP-25, WP-26 |
| WP-21 릴리스 후보와 공개 산출물 검증 | STEP-076 | STEP-077 | WP-20 |

카드는 각 WP 안에서 순차 실행한다. WP 사이에는 원래 계획의 의존성을 보존한다. 현재 모델이 임의로 동시에 여러 public schema를 만들지 않게 보수적인 순서를 사용한다. 독립 작업을 실제 병렬 실행하려면 공통 계약 revision과 파일 소유자를 먼저 고정한다.

### 교차 기능 의무

| 먼저 구현 | 뒤에서 닫을 의무 | 종료 카드 |
|---|---|---|
| STEP-028 | focus/keyboard/bend/current-frame hit | STEP-070 |
| STEP-041 | overlap selection/animation/geo/export | STEP-070 |
| STEP-049 | 실제 sampler와 current scene 교체 | STEP-070 |
| STEP-046 | gesture/LOD/tween/restore | STEP-070 |
| STEP-064 | source-free offline four-format export | STEP-069 |


## 기존 코드에 새 기능을 연결하는 절차

### 작업 전 상태 확인

~~~sh
git status --short
git rev-parse HEAD
node --version
node -p "JSON.parse(require('node:fs').readFileSync('package.json','utf8')).version"
~~~

사용자 변경이 있으면 보존하고 변경 파일 소유권을 분리한다. dependency 설치는 package-lock과 CI Node 버전을 기준으로 한다. 소스 baseline drift는 source-map.json과 비교하고 새 module/symbol 위치만 갱신한다. 현행 source에 존재하지 않는 함수 호출을 계획 예제에서 복사해 실행할 수 있다고 가정하지 않는다.

### Domain action 하나를 추가하는 순서

1. agent_docs/contract/current의 가장 가까운 family와 ACTION_INDEX를 읽고 실제 짧은 호출을 작성한다. id omission은 unique stored state로만 추론한다. 두 resource가 가능하면 첫 번째를 선택하지 말고 ambiguity error다.
2. 옵션 normalize와 pure calculate를 분리한다. normalize는 모든 resolved defaults/type/target를 결정하고 저장할 intent를 반환한다. calculate는 explicit inputs만 읽고 result+diagnostics를 반환한다.
3. closedAction의 op/description/scope와 exact allowed option keys를 선언한다. preflight에서 새 state와 모든 affected consumer를 검증한다. source program을 mutate하거나 module global에 candidate를 남기지 않는다.
4. wrapped child actions로 semantic/resource 결과를 저장하고 explicit materializer를 호출한다. 큰 action args는 data arrays가 아니라 resource ID/옵션 요약으로 trace에 남긴다. meaningful child steps를 숨기지 않는다.
5. family register function에 method를 한 번 등록하고 src/actions/index.js의 등록 순서를 확인한다. src/ChartProgram.js의 built-in trace 등록과 persistence validation에서 새 op를 인식하는지 확인한다. basic/extension/default entry의 노출 경계를 따로 검증한다.
6. selectors, vocabulary, resource reference collector, dataset references, reviseData의 replacement/rebinding, materialization planner, composition ancestor closure에 새 consumer를 등록한다. 기존 mark capability/policy registry를 확장하고 parallel switch chain을 만들지 않는다.
7. inspection의 resource/role/option metadata, scene의 item key/topology, selection policy, highlight baseline, accessibility description을 연결한다.
8. types/program.d.ts와 해당 subpath declaration, runtime exact option validation, contract examples의 parameter 이름을 동일하게 맞춘다. unknown option negative type/runtime 시험을 둘 다 작성한다.
9. editable codec/validation/migration, source-free package consumer에서 create→edit→remove→save/load를 실행한다. fresh process라 runtime cache가 없다는 조건이 중요하다.
10. action catalog/relationships/cards/inspection/docs/LLM generator를 canonical script로 갱신한다. generated files를 직접 손으로 고쳐 다음 build에서 사라지게 하지 않는다.

이 순서의 실제 참고 소유자는 src/actions/charts/index.js, src/actions/index.js, src/core/action.js, src/core/resourceReferences.js, src/materialization/planner.js, src/scene.js, src/persistence/validation.js다. source-map에는 정확한 baseline symbol과 line/hash가 있다.

### Kernel 호출과 action 반환을 섞지 않기

~~~ts
// Pure internal contract. New API proposal, not an existing export.
function computePartition(input: NormalizedHierarchy, options: PartitionOptions): PartitionResult;
function prepareGraphRoutes(input: RoutingInput, options: RoutingOptions, runtime: ComputeRuntime): Promise<PreparedRoutes>;

// Authoring actions always return a new program.
program.layoutHierarchy({id:'p', hierarchy:'h', method:'partition'});
program.bundleGraphEdges({id:'r', graph:'g', layout:'l', method:'hierarchical', options:{hierarchy:'h'}});
// Large async route computation uses prepare + an explicitly named commit/replace action.
// The final public async preparation/commit names are reviewed together, not invented per method.
~~~

위 async 표면의 정확한 제안은 ggaction/graph의 prepareGraphRoutes({program,graph,layout,method,options,signal})와 program.applyPreparedGraphRoutes({id,result})다. prepare는 Promise<PreparedRoutes>, apply는 ChartProgram을 반환한다. synchronous bundleGraphEdges는 같은 pure kernel을 bounded input에서 실행한다. Graph entry는 DOM/Node-only dependency 없이 module worker 또는 caller executor를 주입받는다. result에 완전한 source revision vector와 algorithmVersion/options hash가 없으면 apply가 거부한다. 새 exports/API라 G-CORE 검토 항목에 포함한다.

### Proposed resource action 표

| Resource | Create/compute | 수정 | 삭제 기본 |
|---|---|---|---|
| hierarchy | createHierarchyData | editHierarchyData, source revise closure | removeResource restrict |
| graph | createGraphData/createInferredGraphData | editGraphData/editInferredGraphData | restrict |
| node/hierarchy/flow layout | layoutGraph/layoutHierarchy/layoutFlow | editLayout with method-specific patch | restrict |
| edge-route | bundleGraphEdges/applyPreparedGraphRoutes | editEdgeRoutes with method/options re-evaluation | restrict |
| geometry/join | createGeometryData/createGeoJoinData | reviseGeometryData/editGeoJoinData | restrict |
| projection | createProjection | editProjection | restrict |
| image/font/pattern | createImageResource/createFontResource/createPattern | replace payload or editPattern | restrict |
| parameter/selection | createParameter/createSelectionResource | editParameter/editSelectionResource | restrict |
| annotation | createAnnotation | editAnnotation | restrict |

removeResource({kind,id,cascade:false})는 신규 resource union에만 적용한다. 기존 removeData/removeScale/removeCoordinate를 대체하지 않는다. 기존 createSelection과 이름/역할이 겹치면 facade는 현행 createSelection을 확장하고 resource용 내부 wrapped action은 공개 중복으로 내보내지 않는다. edit의 resolved kind가 현재 resource와 다르면 replace를 강제하며 schema를 몰래 바꾸지 않는다.

### 소비자 누락을 찾는 방법

rg로 현재 family type과 가장 가까운 mark kind를 source/test/contracts/types에서 함께 찾는다. 단순 문자열 추가를 완료로 보지 않는다. create→appearance edit→source revise→coordinate edit→Canvas resize→compose→select→serialize→fresh load→export 순서로 한 fixture를 돌린다. 이때 각 단계의 affected owner와 resource revision을 assert한다. 같은 변경을 역순으로 적용해 동일 final state에 도달하면 graphicSpec도 동일해야 한다. order-independent API가 placeholder graphics를 생성하면 실패다.

### Primitive 시각 검토 패킷

manifest에 capability/chart/variant, exact target public chain, equivalent primitive program, input hash, width/height, expected semantic roles, plot-region ink assertions, renderer/font/hash를 넣는다. review PNG 경로는 .artifacts/test/png/review/<chart>/<variant>/다. same-run decoded primitive/public pixels가 같아도 independent geometry/numeric tests를 별도로 실행한다. 승인된 variant만 charts/<capability>/<chart>/<variant>로 옮기고 metadata에 roadmap/phase 번호를 남기지 않는다.

### 다음 모델에게 전달할 메시지

~~~text
목표: STEP-xxx 한 카드만 완료한다.
기준: actual HEAD, contract revision, 선행 카드 evidence 경로.
읽을 것: START_HERE, DECISIONS, 해당 카드, 카드의 필수 계약.
지켜야 할 것: native scope, immutable state, explicit materialization, single Y.
실행: independent failing test → pure kernel → wrapped action → consumer 연결 → focused checks.
인계: changed files, actual commands/exit, expected/actual artifact hash, consumer matrix, remaining obligations.
금지: 범위 축소, raw graphics를 public 사용법으로 노출, 미실행을 pass로 기록.
~~~

모델이 오류를 만나면 먼저 최초 실패 invariant와 최소 입력을 보존한다. 반복 실패 시 임의 API나 fallback을 더 만들지 말고 source symbol/current contract를 다시 읽는다. 코드 생성량보다 작은 검증 가능한 상태를 유지하는 것을 우선한다. 한 카드가 너무 크면 같은 계약 아래 capability별 하위 카드로 분해하되 원 인수 시험과 후행 의무는 그대로 유지한다.


## Transition planner sampler player 계약

### 모듈 경계

ggaction/animation의 제안 API는 planTransition({from,to,options}), sampleTransition(plan,timeMs), createAnimationPlayer({plan,clock,render}), serializeAnimation/deserializeAnimation다. plan/sample은 DOM 없이 순수하고 immutable 결과를 반환한다. player만 RAF/clock을 가진다. scene는 기존 ggaction/scene의 typed format을 확장하되 SVG/Canvas scene를 무타입 object로 섞지 않는다.

Plan은 schemaVersion, from/to editable or scene refs, durationMs, easing, matches, enter/update/exit, topology decisions, kernels/version, assets/fonts, options hash를 가진다. endpoint program을 저장하지 않고 hash만 저장하면 offline replay할 수 없으므로 bundle에 실제 endpoint payload 또는 content-addressed bytes를 포함한다.

### Matching과 enter update exit

match는 core의 stable item key와 primitive role로 수행한다. 동일 key라도 primitive kind/topology/coordinate family가 다르면 typed kernel 지원 여부를 확인한다. match 결과 reason은 exact/semantic-kernel/crossfade/enter/exit다. arbitrary path command count를 맞추기 위해 zero commands를 삽입하지 않는다.

enter는 opacity0→target, exit는 source→opacity0, update는 속성을 보간한다. 위치 origin은 explicit enterFrom/exitTo가 없으면 endpoint 위치 고정이다. bar는 baseline kernel이 있으면 extent0에서 성장하도록 explicit 선택할 수 있다. enter/exit가 overlap하면 semantic item key로 hit/event를 deduplicate한다. opacity0에는 hit가 없다. t=0/1은 원 endpoint scene를 그대로 반환한다.

### 수치 interpolation

u=clamp(timeMs/durationMs,0,1), eased=e(u). duration0은 time<0이면 from, time≥0이면 to. default ease cubic-in-out: u<.5이면4u³, 아니면1−(−2u+2)³/2. linear 옵션은 expected 수치 oracle에 사용한다. translate/size/opacity는 linear, scale transform은 positive 값에서 log-space, rotation은 shortest arc이며 exactπ tie는 positive 방향이다.

linear numeric x0=10,x1=30,duration1000이면 t0/250/500/750/1000 결과10/15/20/25/30. log-domain scale endpoints1→100의 중간은10이다. color는 기존 color interpolation contract를 우선 적용하고 새 alpha는 premultiplied linear-light RGBA 정책을 version으로 명시한다. transparent black과 red 중간의 색을 잘못 어둡게 하지 않는다. text 문자열 자체는 numeric lerp하지 않고 crossfade 또는 explicit number formatter track으로 처리한다.

### Typed kernel 표

| 종류 | 보간 공간 | 금지 및 fallback |
|---|---|---|
| Cartesian point/rule/rect | semantic endpoints→interpolated coordinate/scale | x/y pixel만 보간해 log 의미 손실 금지 |
| line/area | 같은 ordered member key와 topology의 sample grid | missing break/series merge는 crossfade |
| arc/polar | unwrapped angle+radius, seam-shortest policy | start/end 문자열 lerp 금지 |
| partition | normalized u/depth와 hierarchy bend | hierarchy topology 변경은 semantic crossfade |
| graph nodes | stable node key positions, fixed endpoints | inference를 매 frame 실행 금지 |
| bundled edge | stable edge와 resampled route, endpoint correction | 다른 edge로 morph 금지 |
| geo | camera quaternion/log-scale/translation, projection clip | incompatible projection은 crossfade |
| guides | semantic tick values와 coordinate mapping | tick array index로 label rename 금지 |

bundle route update는 normalized arc-length parameter sample grid를 공통으로 만든 뒤 interpolation한다. 매 frame의 first/last point를 현재 node anchor에 정확히 붙인다. geometric stretch/clip을 검사하고 collapse되면 safe fade를 사용하며 reason을 남긴다. current scene geometry를 hit engine에 넘긴다. select action이 endpoint source graph와 current drawn route를 혼동하지 않게 한다.

### Timeline과 player

timeline track은 target item/property/kernel과 keyframes[{timeMs,value,easingToNext}]다. time nondecreasing, 같은 target/property의 겹치는 track은 default error, explicit priority composite만 허용한다. marker/event는 forward crossing에서 once-per-iteration, seek 기본 emit:false다. keyframe value는 함수가 아니라 serializable data다.

player 상태 idle/playing/paused/finished/cancelled/disposed. clock은 now()와 requestFrame/cancelFrame interface이고 테스트는 virtual clock으로 주입한다. play는 anchorClock/anchorTime을 저장, frame time=anchorTime+(now−anchorClock)×rate. pause/seek/reverse/rate 변경 전 current time을 먼저 sample한다. seek는 clamp, rate0은 pause semantics, reverse는 부호 반전이다. repeat count는 음이 아닌 정수 또는 explicit Infinity runtime-only 옵션; serialized plan은 finite count 또는 string 'infinite'로 저장한다.

interrupt default replace는 현재 sampled scene를 새 from으로 capture하여 새 목표까지 진행한다. 옛 from 또는 to로 튀지 않는다. finished Promise는 각 run마다 새로 만들고 completed/cancelled/interrupted/disposed reason으로 정확히 한 번 settle한다. dispose 뒤 RAF/render callback0. reduced motion은 final scene로 이동하고 commit/finished를 각각 한 번 유지한다.

### Frame export

export time list는 explicit milliseconds, sorted unique. 영상 frame list는 frameIndex/fps×1000로 계산하고 wall clock을 사용하지 않는다. SVG/Canvas/PNG/PDF는 같은 sampled scene를 소비한다. PDF가 vector 지원 못 하는 node가 있으면 documented lowering이 있어야 하며 전체 chart screenshot fallback은 금지다. offline envelope는 resource/font/kernel versions를 검증하고 unknown kernel은 명시 오류다.

### 시험 순서

1. pure interpolation 숫자와 t0/t1 equality.
2. stable identity update/insert/delete/reorder와 topology decisions.
3. virtual clock pause/seek/reverse/rate/repeat/interrupt/zero duration.
4. partition/geo/bundle typed kernel endpoint와 intermediate invariants.
5. 실제 browser에서 animation 중 hit/selection/cancel/resize.
6. fresh process offline load→같은 time scene hash→네 export 경로.

same-time scene은 같은 runtime/algorithm version에서 byte-equivalent canonical numeric scene로 검증한다. 다른 OS 폰트 raster pixels까지 bitwise 동일하다고 주장하지 않는다. 폰트 hash와 metric profile을 고정한 뒤 geometry/색과 제한된 pixel tolerance를 각각 평가한다.


## Identity 리소스와 재계산 계약

### 현행 코드에서 이어받는 경계

src/core/ChartProgram.js의 immutable state, src/core/action.js의 wrapped trace, src/materialization/planner.js의 explicit ordered plan을 유지한다. 현행 planner 순서는 scales → marks → guides → layout → highlights다. 새 topology/layout/resource 계산은 해당 domain action이 먼저 수행하고, 결과에 영향받는 materialization plan을 명시적으로 실행한다. renderer가 program을 보고 빠진 리소스를 계산하지 않는다.

src/scene.js는 현재 row-value token을 만들고 있어 값 변경을 안정적인 동일 항목으로 연결할 수 없다. 신규 identity는 이를 대체하되 기존 createTransitionScene의 공개 return format을 깨지 않는다. scene schema가 확장되면 별도의 version과 legacy reader를 둔다.

### ID와 row key

공개 ID는 기존 validateUserId를 사용한다. 데이터 key는 string, finite number, bigint, boolean, 유효한 Date의 typed scalar 또는 그 tuple을 허용한다. null/undefined/NaN/infinity/object/array 내부 비스칼라는 key로 거부한다. Date는 epoch ms로 정규화한다. number 1과 string '1'은 다른 key이고 -0은 0과 같은 key다. tuple은 길이와 타입을 보존하는 canonical encoding을 사용한다. delimiter로 단순 join하지 않는다. typed value 비교에서 타입 순서는 boolean < number < bigint < string < date, 동일 타입은 값 순서, string은 UTF-16 code unit 순서, tuple은 lexicographic 후 길이 순서로 고정한다.

원본 dataset은 logicalId, revision, rowKeys, nextGeneratedKey를 저장한다. 명시 keyField/keyFields는 duplicate 시 전체 action을 거부한다. 명시 key가 없는 최초 생성은 logical dataset 내부 단조 정수 token을 부여하고 저장한다. 정렬/filter는 기존 token을 보존한다. 기존 row와의 correspondence를 제시하지 않은 전체 values 교체는 모두 새 token이다. 값이 같다는 이유로 다시 연결하지 않는다. append/delete의 기존 row는 유지하며 삭제한 token은 재사용하지 않는다. occurrence identity가 필요하면 사용자가 stable occurrence key를 명시해야 한다. 자동 duplicate occurrence 추정은 제공하지 않는다.

semantic item key는 [childPath, ownerId, role, finalGrainKey]다. graphic child ID는 item key+primitive role이며 현재 배열 index를 정체성으로 사용하지 않는다. partition node key, graph node/edge key, geo feature key도 이 규칙으로 scene/hit/selection에 전달한다. generated ID의 실제 문자열 spelling은 공개 계약이 아니다.

### Lineage

각 derived item은 inputs 배열에 {logicalDataId, revision, rowKey, role}를 보존한다. 1:1 transform은 같은 row key, fold는 [sourceKey, outputField], flatten은 [sourceKey, stableElementKey 또는 원소 index], aggregate는 [typed group tuple, measure role], bin은 [resolved boundary pair, grouping tuple]을 사용한다. flatten 원소가 key 없이 교체되면 해당 원소 identity는 새로 만든다.

lookup은 left/right 기여 row를 role로 구분하고 fan-out 시 [leftKey,rightKey]로 식별한다. stack은 input identity를 유지하며 endpoint는 속성이다. line/area item은 series key와 ordered member keys를 모두 가진다. series identity가 같아도 topology가 바뀌면 일반 path morph를 금지한다. facet 이동은 논리 row key를 유지하지만 childPath가 달라 scene matching은 명시 cross-panel 이동 kernel이 없는 한 enter/exit다.

거대한 기여 집합은 공유 immutable lineage table에 저장하고 item은 ref를 가진다. summary count만 저장하여 provenance를 잃지 않는다. inverse lookup은 runtime index이고 snapshot에 Map 객체를 넣지 않는다. lineage cycle은 생성 시 거부한다.

### 신규 resource schema 제안

~~~ts
type ResourceRef = { kind: ResourceKind; id: string; revision: number };
type Resource = {
  kind: ResourceKind; id: string; revision: number; algorithmVersion: string;
  inputs: ResourceRef[]; options: SerializableValue; result: SerializableValue;
  provenance: { origin: 'authored' | 'observed' | 'inferred'; sourceRows?: LineageRef[] };
};
// ResourceKind: hierarchy | graph | layout | edge-route | geometry |
// projection | image | font | pattern | parameter | persistent-selection | annotation
~~~

semanticSpec.resources는 리소스 배열이다. kind+id가 고유하며 공개 id도 같은 kind 안에서 고유하다. typed ref는 정확한 revision을 가리킨다. public action은 문자열 ID를 현재 program의 유일한 해당 kind로 resolve한다. 단순 'latest' 동적 포인터는 저장하지 않는다. 새 program이 edit로 revision을 올리면 그 program의 모든 live consumer를 함께 rebinding한다. 이전 program과 이전 resource revision은 불변이다.

리소스 result는 source-neutral 수치/정규화 결과이며 immutable이다. geometry 원본, normalized partition intervals, graph adjacency, node positions, edge route controls를 저장한다. materializationConfigs는 그림을 재생성하는 비의미 authoring intent만 소유하고 result 복사본을 소유하지 않는다. graphicSpec에는 concrete path/paint/text/image payload ref와 semantic item metadata를 저장한다. resource와 graphicSpec의 값 일부가 계산 결과로 겹치는 것은 허용하되 독립적으로 편집 가능한 정본을 두 개 만들지 않는다.

기존 materializationConfigs.selections에는 owner target 및 projection intent만 남긴다. 신규 persistent-selection resource는 선택의 논리 key/predicate를 소유한다. migration에서 기존 selection indices를 해당 저장 dataset의 row token으로 변환한다. migration 전에 원본 schema를 검증하고 범위 밖 index나 ambiguous owner는 structured error다. 기존 highlights의 스타일 의도는 기존 owner에 유지한다.

### Create edit remove

각 kind에 create와 의미 있는 edit를 제공한다. 표면적인 edit가 필요 없는 prepared result에는 replace action을 쓴다. create는 existing ID 오류, edit는 missing ID 또는 빈 patch 오류, remove는 기본 restrict다. cascade:true는 소유된 generated resource와 consumer까지 포함하는 삭제 목록을 preflight로 계산하여 한 번에 적용한다. 공유 사용자 resource는 cascade로 암묵 삭제하지 않는다. 참조를 남긴 채 삭제하는 mode는 없다.

검증 순서는 옵션 shape → typed values → resource 존재/kind → reference graph DAG → budget → 계산 → 모든 소비자 호환성 → wrapped mutation → rematerialization이다. 실패하면 source program/trace/외부 cache를 변경하지 않는다. prepared async result는 sourceRevisionVector와 inputHash를 갖고 action 적용 시 현행과 일치하지 않으면 stale-result로 거부한다. worker의 완료 순서가 program 결과를 바꾸지 않는다.

새 데이터 action은 기존 closedAction와 registerDataActions 패턴을 사용한다. 새 family는 actions/<family>/index.js에 registration을 한 번 두고 actions/index.js에서 연결한다. 순수 함수는 grammar 또는 독립 domain kernel에 두며 ChartProgram import를 금지한다. 타입은 types/program.d.ts 및 실제 entry declaration에 추가한다. basic entry에는 새로운 무거운 family를 자동 등록하지 않는다.

### 재계산 표

| 변화 | 재계산할 것 | 유지할 것 |
|---|---|---|
| source 값/feature 변경 | transform, graph inference, affected layout/route, scale/mark/guide | logical ID와 살아 있는 keyed item |
| source 순서만 변경 | explicit order 의존 transform/layout | order-independent keyed topology |
| k/metric/radius 변경 | inferred graph→layout dependency→route→graphics | observed source, surviving edge key |
| node drag | node layout revision→attached route→hit/scene | graph topology 및 inference provenance |
| Canvas resize | plot layout→coordinate mapping→route if screen-space→guides/hit | data-space graph topology, normalized partition |
| theme color만 변경 | paint/legend/highlight | topology, stats, projection |
| font 또는 label 변경 | text metric→guide/layout→affected geometry/hit | 데이터와 추론 |
| parameter edit | AST dependency closure→transforms→scale/marks/guides | 의존하지 않는 sibling |
| geo camera 변경 | projection mapping/clip/labels/hit/scene | 원본 geometry와 join |
| visibility filter | 기본 induced-view mask, scale 정책에 따른 domain, hit/accessibility | 원 graph adjacency; recompute 명시 때만 추론 |

동일 dependent step은 op+canonical args로 deduplicate하고 stable topological order로 실행한다. trace에는 domain resource revision과 wrapped materialization이 보인다. hidden background rematerialization으로 trace를 비우지 않는다. composition ancestor snapshot·shared guides·title occupied bounds까지 transitive closure에 포함한다.

### 저장 복원과 오류

현재 editable envelope schemaVersion은 3이며 graphic envelope는 1이다. 신규 editable은 4로 올리고 1/2/3 reader를 유지한다. 1의 dataset-schema migration을 먼저 수행한 후 4의 identity/resource migration을 적용한다. version3 shared array codec 의미를 변경하지 않는다. graphic-only export는 읽을 수 있지만 editable provenance가 없으면 authoring 복원을 약속하지 않는다.

문자열 JSON 직렬화만 사용하지 않고 기존 tagged codec을 이용한다. source table의 NaN/undefined/bigint 보존과 concrete geometry의 finite 조건을 구분한다. bundle/animation envelope는 editable schema와 별도 version이다. Date/Map/typed arrays는 소유권·codec 계약에 따라 정규화하고 DOM/function/AbortController/Promise/worker/cache는 저장하지 않는다.

진단은 현행 getErrorDetails 체계를 확장한다. 최소 code, operation, optionPath, ownerId, expected, actual, dependencies를 포함한다. 코드: duplicate-id, unknown-resource, wrong-resource-kind, ambiguous-identity, invalid-value, cyclic-dependency, budget-exceeded, stale-result, unsupported-combination, unresolved-asset, layout-unsatisfied. 거대한 data values는 오류에 복사하지 않는다. 각 오류는 원본 program deep equality와 trace equality를 시험한다.

### 독립 기대값

key 있는 행 [{id:'a',v:1},{id:'b',v:2}]를 [{id:'b',v:3},{id:'a',v:1}]로 revise하면 a/b key는 유지하고 b의 값만 3이다. 이전 program의 b는 2다. key 없는 동일 교체는 새 identity다. aggregate A=[r1,r2], B=[r3]의 lineage는 정확히 그 두 집합이며 filter r2 제거 후 A=[r1]이다. 화면 index가 바뀌어도 selection 'b'가 'a'로 옮겨가면 실패다.


## 데이터 AST 통계와 조건부 인코딩 계약

### 기존 구현을 먼저 재사용

src/grammar/computed.js, transforms.js, datasetSchema.js와 src/actions/data의 현행 transform을 inventory하여 create/edit/revise/schema/lineage/selection 연결을 각각 표시한다. summary/bin/bin2d/stack/window/fold/flatten/lookup/impute/regression/density/ECDF/timeUnit이 이미 있다는 이유로 새로 만들지 않는다. 부족한 옵션과 invalidation 경로를 보강한다. 현행 계약의 numerical defaults를 이 계획 때문에 바꾸지 않는다.

### Expression AST

canonical node 종류는 literal, field, parameter, unary, binary, call, if다. discriminated object의 unknown key는 거부한다. field는 schema에서 resolve한 필드 이름이며 임의 prototype path 접근을 허용하지 않는다. 함수는 versioned closed registry다. JS source, eval, Function, global name lookup, property getter를 실행하지 않는다. normalize에서 depth≤64, nodes≤4096, call 인수 수를 검증한다.

신규 predicate는 boolean strict다. and/or는 short-circuit, 비교 대상 missing/null은 false, isMissing/isNull/isFinite로 명시 분기한다. equality는 typed equality이고 string '1'과 number1은 다르다. arithmetic invalid는 missing을 반환하고 diagnostics count를 수집한다. 0분모는 missing, finite geometry 생성 단계에서 결측 정책을 적용한다. if는 선택된 branch만 평가한다. 날짜는 epoch milliseconds+명시 timezone 의미, 문자열 concatenate는 string 인수만 허용한다. 현행 computed 계약과 충돌하면 기존 AST version을 유지하고 신규 version으로 명시 migration한다.

필수 function 그룹은 abs/min/max/pow/sqrt/log/exp/round/floor/ceil, lower/upper/length/substring/replace, isNull/isMissing/isFinite, date part/time floor, array scalar access와 범위 검사다. 지원 여부를 registry로 introspect한다. 임의 locale/timezone의 host default를 쓰지 않는다. parameter dependency는 normalize 시 추출하고 cycle을 topological sort에서 차단한다.

### 조건부 encoding

{conditions:[{when:PredicateAST,value:EncodingValue},...],otherwise:EncodingValue}로 제안한다. 순서대로 첫 true를 사용하며 otherwise는 필수다. field/scale/value 채널 계약을 기존 encoder와 공유한다. selection predicate는 stored logical selection을 참조한다. topology를 바꾸는 조건과 appearance 조건을 구분한다. opacity0을 missing으로 판정하지 않는다. branch별 field/type validation은 현재 선택되지 않은 branch도 수행한다. evaluator는 현재 branch만 계산한다.

### 통계별 구현 체크리스트

| 영역 | 반드시 명시할 것 | 독립 기대값 |
|---|---|---|
| summary | missing, sample/population, group order, weight | [1,2,3] mean2, sampleVariance1, populationVariance2/3 |
| quantile | 기존 interpolation method와 endpoint | sorted[1,2,3,4], linear q.25=1.75, q.5=2.5 |
| histogram | extent/step, 마지막 bin 포함, invalid rows | edges[0,1,2,3], values[0,1,2,3] counts[1,1,2] |
| bin2d | 동일 bin contract 두 축, empty cells 정책 | 4 points corners가 4 cells에 각1 |
| stack | group/order/offset/negative 분리 | values[2,3] endpoints[0,2],[2,5]; -2는 양수누계와 별도 |
| window | frame rows/range, ties, partition, stable sort | values[1,2,3], trailing2 means[1,1.5,2.5] |
| pivot | duplicate cell aggregation 필수, missing cell | A/x1,A/x2 → agg sum3; agg 없으면 error |
| lookup | 1:1/1:many, duplicates, unmatched | left key2가 없으면 nullable joined fields, left row 보존 |
| regression | singular/constant x, CI method | (0,1),(1,3),(2,5) slope2/intercept1 |
| LOESS | span, degree1/2, tricube, robust iterations, ties | exact line은 interior에서 오차≤1e-9; singular local fit은 documented constant fallback |
| density | kernel, bandwidth, grid, normalization | one point0,h1 Gaussian f(0)=0.3989422804014327 |
| ECDF | ties, weight, inclusive/right continuity | [1,1,3]: F(0)=0,F(1)=2/3,F(3)=1 |
| timeUnit | timezone, DST, weekStart, calendar grain | leap2024-02-29 유효; 2023-02-29 오류 |

위 수치는 해당 옵션을 명시한 fixture다. 기존 quantile/bin default가 다르면 default를 바꾸는 대신 explicit option fixture로 검증한다. LOESS는 n=0/1, 동일x, span<최소점수, robust weight0도 포함한다. Python/hand oracle는 production kernel을 import하지 않는다. floating 비교는 absTol+relTol×max(abs(expected),abs(actual))를 사용한다.

### 데이터 의존성 실행

parameter→filter→aggregate→stack→scale→mark→guide→highlight 순서의 closure를 만든다. changed parameter를 읽지 않는 branch/resource를 재계산하지 않는다. filter로 모든 값이 제거되면 empty dataset/scale 상태를 기존 계약에 따라 저장하고 과거 domain으로 생긴 빈 공간을 남기지 않는다. empty domain 정책은 preserve/explicit/fallback 중 명시 선택이며 숨은 유지가 아니다. cycle, missing field, invalid transform을 action preflight에서 거부한다.

source row eligibility는 최종 visual grain에서 한번 결정한다. scale domain에는 포함하지만 graphic에서는 제외하는 식의 불일치를 금지한다. 모든 derive operation은 resolved options, input revisions, output field roles, lineage를 기록한다. reviseData가 source만 바꾸고 derived graph/calendar/partition가 옛값을 가리키지 않게 resource ref collector와 revision plan을 확장한다.

### 시간과 달력

calendar는 epoch/ISO 입력을 지정 timezone의 civil day로 투영한 뒤 day ordinal로 배치한다. 24h ms를 계속 더해 날짜를 만드는 방식은 DST에서 실패한다. day ordinal+weekStart로 week index를 계산하고 month boundary는 실제 cell 경계 union으로 만든다. duplicate date는 지정 aggregate, missing date는 empty cell/omit 중 explicit policy다. 2024년 day count366, February29, DST 전환일도 한 civil day cell이다.

### 데이터 source resolver와 field 접근

inline values, named resource, URL 및 relative URL CSV/JSON을 명시 구분한다. baseURL은 host resolver가 주입하고 renderer나 grammar가 fetch하지 않는다. resolver 결과는 bytes hash/MIME/encoding/parser version/schema와 함께 immutable original dataset으로 commit한다. parameter-dependent URL은 AST dependency이며 stale response를 revision token으로 폐기한다. offline bundle에는 실제 data bytes 또는 parsed rows를 포함한다.

CSV는 quoted delimiter/newline/escaped quote/BOM/CRLF/빈cell을 검증한다. parse directives는 field별 string/number/boolean/date와 timezone을 선언하고 실패 row를 임의삭제하지 않는다. JSON dotted literal field와 nested field path를 다른 AST node로 표현한다. 예를 들어 field name a.b는 literal key이고 fieldPath:[a,b]만 nested access다. prototype key와 getter 접근은 거부한다. trig sin/cos/tan/atan2와 명시 angle unit, datePart의 month/day/hour/minute/second 등 기존 year-only 경계를 확장하고 function registry에서 인수/return type을 고정한다.


## 네 가지 edge bundling 구현 계약

### 공통 입력과 출력

bundleGraphEdges({id,graph,layout,method,options,coordinateSpace})를 제안한다. method는 hierarchical/force-directed/density/edge-path다. immutable GraphResource와 NodeLayout revision을 읽고 EdgeRouteResource를 저장한다. result.routes는 원 edge 순서와 같은 {edgeKey,sourceKey,targetKey,controlPoints,commands,bounds,provenance} 배열이다. graph의 node/edge 수, key, weight, direction, adjacency, node position을 수정하지 않는다. route는 world-layout 좌표이며 screen-space를 명시한 경우 resize 시 다시 계산한다.

출력은 vector다. 선택·hit·SVG/PDF가 원 edge에 접근할 수 있어야 한다. edge 겹침은 topology가 아니다. intersection에 가짜 node를 넣지 않는다. self-loop/zero-length는 source/target anchor를 보존한 deterministic loop 또는 point route이며 method 옵션으로 explicit 처리한다. 단순 fallback을 사용하면 provenance.reason에 기록하고 최종 완성률에서 구분한다.

수치 계산 전에 bounding box의 long axis를1로 정규화하고 종료 후 원좌표로 복원한다. degenerate box는 scale1과 별도 zero geometry 처리다. 입력 배열을 typed key 순으로 정렬한 work buffer에서 계산하되 결과는 graph edge 순서로 돌려준다. mutable buffer는 result와 공유하지 않는다.

공통 reference budget은 maxNodes100,000, maxEdges1,000,000, maxCandidatePairs10,000,000, maxSamples10,000,000. 이는 성능 약속이 아니라 memory/resource guard다. 각 method는 비용을 추정하여 넘으면 budget-exceeded다. partial preview는 명시 mode에서만 반환하며 저장 action은 complete:true 결과만 받는다. 중단 후 늦은 worker callback이 resource를 갱신하지 못하게 sourceRevisionVector와 generation token을 검사한다.

### Hierarchical edge bundling

[Holten의 HEB 논문](https://www.cs.jhu.edu/~misha/ReadingSeminar/Papers/Holten06.pdf)의 핵심은 두 endpoint 사이 hierarchy path를 spline control polygon으로 사용하는 것이다. 아래의 안정 ID·오류·버전·수치 제한은 ggaction 제안이다.

1. nodeKey→hierarchyKey mapping을 검증한다. 서로 다른 forest root는 명시 synthetic common root가 없으면 missing-common-ancestor 오류다.
2. source ancestors와 target ancestors에서 LCA를 찾는다. source→LCA→target 순서의 중복 없는 hierarchy key 목록을 만든다.
3. 각 hierarchy node의 layout anchor를 읽는다. 내부 node anchor가 없으면 hierarchy layout에서 계산해야 하며 endpoint 평균으로 임의 추정하지 않는다.
4. n개 control point Pi에 대해 Li=(1−i/(n−1))P0+i/(n−1)Pn−1, Qi=(1−β)Li+βPi. β∈[0,1], default .85다.
5. degree=min(3,n−1) clamped B-spline을 de Boor로 평가한다. endpoint 정확 일치, 내부 knot는 uniform. geometry tolerance .001 normalized units, edge별 subdivision≤4096.
6. β0은 exact straight path를 반환한다. node path와 β, spline version을 route provenance에 보존한다.

작은 fixture s→parentA→root→parentB→t의 경유 key가 정확히 5개여야 한다. A와 B가 같은 subtree면 root까지 올라가면 안 된다. spline이 교차하더라도 adjacency는 원본과 같다.

### Force directed edge bundling

[Holten과 van Wijk의 FDEB 논문](https://classes.engineering.wustl.edu/cse557/readings/holten-edgebundling.pdf)을 기준으로 compatibility와 subdivision spring 모델을 구현한다. 다음의 integration schedule, epsilon, directed 처리와 버퍼 정책은 재현성을 위한 명시 선택이다.

길이 lp,lq>ε, 평균 l=(lp+lq)/2, unit direction up,uq, midpoint mp,mq에 대해 angle=abs(dot(up,uq)), scale=2/(l/min(lp,lq)+max(lp,lq)/l), position=l/(l+distance(mp,mq)). Q endpoint를 P의 무한 직선에 orthogonal projection한 I0,I1에 대해 visibility(P,Q)=max(0,1−2 distance(mp,(I0+I1)/2)/distance(I0,I1)); denominator≤ε이면0. visibility pair는 두 방향 최소값이다. compatibility는 네 값의 곱, threshold .6 이상만 pair에 넣는다. directed graph에서 dot<0이면 pair compatibility0; undirected에서 dot<0이면 대응 sample index를 역전한다.

cycle c=0..5, internal samples m=2^c, segments m+1, K=.1, local spring k=K/(originalLength×segments), step=.1×.5^c. iteration count는 I0=60, I(c+1)=max(1,ceil(2Ic/3)). 각 cycle 시작에 이전 route를 arc-length uniform resample한다. 각 internal sample i의 spring=k(Pi−1+Pi+1−2Pi). attraction은 compatible edge Q에 대해 C(P,Q)×(Qi−Pi)/max(distance(Qi,Pi),ε)^2의 합이다. distance≤ε이면 그 pair contribution0. newPi=oldPi+step×force를 동시에 갱신하고 endpoints는 원래 anchor로 고정한다. step displacement가 normalized .1을 넘으면 .1로 cap하고 cap count를 diagnostics에 저장하는 안정화 정책을 제안한다. reference oracle는 cap 미발생 입력을 사용한다.

old/new 두 버퍼가 필수다. edge iteration 순서를 뒤집었을 때 결과가 달라지면 in-place update가 섞인 것이다. zero-length edge는 pair에서 제외하고 endpoint 그대로 유지한다. nonfinite 또는 sample budget 초과는 atomic error다. 최종 route를 임의 한 cubic으로 압축해 endpoint와 세부 모양을 잃지 않는다.

oracle: P=(0,0)→(1,0), Q=(0,.1)→(1,.1)이면 angle1, scale1, position10/11, visibility1, total10/11. perpendicular pair는0. 평행 same geometry의 identical internal points는 attraction0이며 NaN이 아니다. first-step oracle는 별도 math script에서 springs, attraction, cap 전/후를 각각 기록한다.

### Density KDE bundling

[Hurter 등의 KDEEB 논문](https://webspace.science.uu.nl/~telea001/uploads/PAPERS/EuroVis12/kdeeb.pdf)은 density 추정, gradient, advection, smoothing, resampling 파이프라인을 제시한다. 여기서는 CPU reference로 검증 가능한 아래 normalized kernel을 ggaction density-v1로 제안한다. GPU 사용은 정확한 kernel 결과를 검증한 뒤 별도 optimization이다.

grid 256×256, initial bandwidth h=.05, 20 iterations, h(c)=max(2/256,.05×.9^c), step=.005, ε=1e−9다. bounds에는 bandwidth만큼 halo를 추가한다. 샘플 weights는 주변 arc length의 절반 합으로 부여하여 point 수가 늘었다고 density가 커지지 않게 한다. radial kernel K(q)=max(1−q²,0)^2, q=distance/h, rho(x)=sum(weight_i×K(q_i)). constant normalization은 normalized gradient에서 상쇄되므로1로 고정한다.

central differences로 gradient를 구하고 border는 one-sided derivative, sample 위치는 bilinear interpolation이다. gradNorm≤ε이면 이동0, 아니면 delta=step×gradient/gradNorm. endpoints는 움직이지 않는다. smoothing은 internal points에 [1,2,1]/4 한 번, 다시 endpoints 고정. arc-length resampling spacing=min(h/4,1/256), edge samples≤4096. 매 iteration old density/route를 읽어 new route를 만들고 다음 iteration에 density를 재계산한다.

directed mode는 tangent angle을8개 circular channel에 linear weight로 분배하고 자기 방향 ±1 channel만 density에 기여시킨다. opposite tangent의 attraction을 섞지 않는다. 최종 그림이 단지 heatmap이면 실패다. point route마다 원 edge key를 보존한다. grid 외 clamp는 halo 경계까지이며 input node를 임의 이동하지 않는다.

oracle: 한 sample (0,0), weight1,h1이면 rho(0)=1, rho(.5,0)=.5625, rho(1,0)=0. symmetric ±.5 samples의 원점 gradient는0. horizontal straight edge endpoints가 모든 iteration에서 bitwise 동일하다. 작은8×8 grid fixture의 rho/gradient/advection 배열은 handwritten kernel reference로 검증한다.

### Edge path bundling

[Wallinger 등의 원 논문 Algorithm 1](https://arxiv.org/html/2108.05467v1#S3)은 길이에 따른 edge 우선순위, weighted shortest path, skip/lock을 사용한다. ggaction에서는 tie와 disconnected 처리까지 아래처럼 고정한다.

1. original geometric length L(e), routingCost=L(e)^d, d=2를 계산한다. semantic weight와 혼동하지 않는다. descending routingCost 후 edgeKey 순서다.
2. lock=false, skip=false로 초기화한다. locked edge는 자기 bundling을 건너뛴다.
3. candidate e를 skip=true로 만든 뒤 skip edge를 제외한 graph에서 source→target Dijkstra를 계산한다. directed edge 방향을 지키고 tie path는 edge-key sequence 사전순이다.
4. path 없음 또는 sum(original lengths)>maxStretch×L(e), maxStretch2이면 skip=false로 되돌리고 original straight route다. distance0 candidate는 explicit zero route로 처리한다.
5. 허용 path이면 skip=true를 유지하고 path의 모든 edge를 lock=true로 만든다. 이를 원 edge의 route provenance에 기록한다.
6. 실제 node anchor sequence로 polyline을 만들고 endpoint 고정 corner smoothing을 적용한다. smoothing 전후 측정한 route 길이도 maxStretch 내여야 한다. 초과하면 smoothing을 줄이고 끝내 polyline을 사용한다. 숨은 가상 shortcut graph를 만들지 않는다.

fixture A(0,0),B(1,1),C(2,0), edges AC,AB,BC, maxStretch2,d2이면 AC cost4가 먼저 처리된다. alternate path AB+BC length2√2≤4이므로 AC route=[A,B,C], AB/BC locked다. maxStretch1.2면 AC는 straight fallback. directed AB,CB만 있으면 A→C 경로가 없으므로 연결을 만들지 않는다.

### 통합 종료 조건

4방법×explicit/inferred graph×directed/undirected×zero/parallel/degenerate 입력을 실행한다. 화면 overlap hit는 정렬된 후보 edge 배열을 반환하고 선택한 edge만 일시 unbundle한다. unbundle은 presentation overlay이며 graph와 saved canonical route를 바꾸지 않는다. keyboard으로 후보를 순환할 수 있어야 한다.

node drag 후 route endpoints를 node frame anchor에 정확히 부착한다. interrupt된 animation도 current route에서 이어진다. geo route는 화면 pixel spline과 geographic great-circle의 의미를 구분하고 date line에서 잘라서 projection clip을 적용한다. worker result의 hash는 synchronous reference와 비교한다. cache key는 graph/layout revision, method/version/options, coordinateSpace/viewport, asset dependencies를 포함한다. evict/destroy 뒤 buffer와 worker listener를 해제한다.


## Geo 자원 projection과 camera 계약

### 입력 정규화

createGeometryData({id,format,values,coordinateKind,featureKey,topoObject})에서 format은 geojson/topojson, coordinateKind는 geographic/planar다. geographic 좌표는 WGS84 longitude/latitude degrees, latitude[-90,90]. planar는 caller unit을 보존하고 spherical math를 적용하지 않는다. Polygon/MultiPolygon/Point/MultiPoint/LineString/MultiLineString/GeometryCollection/FeatureCollection/null geometry를 모두 구분한다.

GeoJSON ring은 최소4개 좌표, 처음과 마지막 동일, finite point를 검증한다. 잘못된 ring을 자동 보수하지 않는다. geometry:null은 feature identity와 properties를 보존하고 drawable:false다. featureKey 없음은 persisted generated key를 부여한다. named feature ID 중복은 error다. z좌표는 source에 보존하되2D rendering에는 사용하지 않음을 명시한다.

TopoJSON은 delta decode→scale/translate transform→negative arc index bitwise complement를 통한 reverse→shared junction 중복 제거→geometry expansion 순이다. object가 여러 개면 topoObject 필수다. shared arc resource를 보존해 인접 지역 경계가 따로 단순화되어 벌어지지 않게 한다. asset bytes/hash/coordinate system/object selection을 provenance에 저장한다.

### Projection registry

native registry의 필수 type은 mercator, equirectangular, equal-earth, natural-earth, orthographic, stereographic, gnomonic, azimuthal-equal-area, azimuthal-equidistant, conic-equal-area, conic-conformal, conic-equidistant, transverse-mercator, albers-usa, identity다. type별 supportsInverse, spherical, composite, parameterSchema, defaultClip을 등록한다. 공통 projection kernel과 stream clip이 모든 geo mark/guide/selection에 쓰인다.

검증된 pure mathematical dependency 사용은 허용한다. 채택 시 exact package version/license/algorithm signature와 projection별 source reference를 dependency manifest에 고정한다. 외부 chart engine을 runtime dependency로 넣지 않는다. 모든 projection 수식을 새로 손으로 복제할 필요는 없지만 native wrapper의 옵션·단위·errors·fit·inverse·clip은 직접 검증한다. [D3 projection 공식 문서](https://d3js.org/d3-geo/projection)는 mathematical projection stream의 참고이며 native API를 그대로 맞춰야 한다는 뜻은 아니다.

projection options는 centerDeg, rotateDeg, parallelsDeg, scalePx, translatePx, reflectX/Y, precisionPx, clipAngleDeg, clipExtentPx로 단위가 드러나게 한다. 이전 보고서의 무단위 이름은 이 제안으로 구체화한다. type별 inapplicable option은 error. fit와 explicit scale/translate가 함께 들어오면 conflict error, fit 뒤 edit scale은 explicit override다. projection resource와 geo coordinate는 분리되며 camera runtime 값은 commit 때 resource revision에 반영한다.

### Clipping과 geometry pipeline

geographic validate→longitude/rotation normalization→antimeridian split→spherical clipping→adaptive resample→projection→planar clip→compound path 순이다. orthographic은 backside를 screen path/hit에서 제외한다. horizon crossing segment를 endpoint visibility만으로 drop하지 않는다. pole/antimeridian의 ring orientation과 hole containment를 유지한다. great-circle antipodal endpoints는 경로가 유일하지 않으므로 explicit pole/route hint 없으면 ambiguity error다.

clip 이후 feature item 하나가 여러 visible parts를 가지면 item key는 하나이며 primitive key는 part key다. 179°→−179° line은 화면 전체 폭을 가로지르는 선이 되면 실패다. inverse가 없는 projection, inset 밖, clipped backside의 pointer query는 null+reason을 반환한다. NaN lon/lat로 다음 action을 실행하지 않는다.

### Fit과 독립 수치값

projected finite bounds [xmin,ymin,xmax,ymax]를 target plot width W,height H,padding p 안에 fit한다. scale=min((W−2p)/(xmax−xmin),(H−2p)/(ymax−ymin)); collapsed dimension은 나머지 축으로, point-only는 explicit pointScale 또는 기존scale를 사용한다. translation은 target center−scale×bounds center다. empty geometry는 fit error이며 이전 camera를 몰래 유지하지 않는다. line/polygon stroke padding은 geometry fit와 별도 appearance 단계다.

equirectangular raw(λ,φ)=(λ,φ), mercator raw=(λ,ln tan(π/4+φ/2))에서 λ/φ는 radian. mercator(0,0)=(0,0), latitude45° y=0.881373587019543. orthographic raw at center0는 x=cosφ sinλ, y=sinφ, visible=cosφ cosλ≥0. λ=90°,φ0은 limb(1,0); λ180°,φ0은 hidden이다. Canvas y 반전은 coordinate mapping 단계다. identity [0,0]..[10,20]을100×100,p0 fit하면 scale5, translation[25,0].

projection별 grid roundtrip은 visible/invertible domain에서 angular tolerance1e−6 degree, screen roundtrip≤.25px로 제안한다. singular boundary는 별도 limit fixture다. Albers USA는 component id와 per-inset inverse를 노출한다. 한 composite 전체에 잘못된 단일 inverse를 적용하지 않는다.

### Join과 LOD

createGeoJoinData는 geometry와 table의 typed keys를 연결한다. 기본1:1, duplicate는 error, unmatched geometry는 measure missing으로 유지한다. many-to-one aggregate는 명시 transform에서 수행한다. unmatched data 목록, duplicate count, coverage를 inspect한다. feature name 유사도 fuzzy join은 제공하지 않는다.

geometry hierarchy level마다 stable region key와 parent mapping을 저장한다. LOD threshold 예시 enterZoom4.2/exitZoom3.8로 hysteresis를 둔다. zoom4 주변의 흔들림에서 level이 반복 교체되면 실패다. shared arcs를 함께 simplify하고 preserve topology를 검증한다. selected county가 state LOD로 바뀌어도 logical county selection은 보존하고 representation mapping을 노출한다. annotation은 semantic feature/geographic anchor를 유지한다.

### Native marks와 navigation

geoshape, geoPoint, geoLine, graticule은 같은 projection/clip을 재사용한다. point size 기본 CSS px, explicit geographic-radius만 distance semantics다. geoLine interpolation source-segment/great-circle을 구분한다. choropleth는 joined geometry+color encoding, proportional-symbol은 geoPoint+size, route map은 geoLine+graph edge provenance 조합이다.

camera는 scale, translation, spherical rotation, viewport를 가진다. zoom around pointer는 pointer의 inverse geographic anchor가 전후 같은 screen 위치에 있도록 translation을 보정한다. planar pan과 globe rotation은 서로 다른 gesture mode다. fitRegion/reset/resize는 transaction과 history의 하나의 command다. pinch는 두 pointer center+distance, wheel은 normalized delta와 bounded scale. camera animation은 quaternion shortest-path rotation과 log(scale) interpolation을 사용한다. projection type 자체가 바뀌면 compatible morph kernel이 없는 한 crossfade한다.

browser test는 drag/wheel/pinch/keyboard를 실제로 보내고 commit 전후 anchor, clipped hit, reset, abort, source revise, offline restore를 비교한다. geometry/asset 다운로드는 resolver가 맡으며 interaction handler에서 renderer fetch를 호출하지 않는다.


## 복합 geometry paint와 디자인 계약

### 복수 subpath

현행 src/grammar/pathCommands.js는 M/L/C/Z만 허용하며 처음 M 하나와 마지막 Z 하나만 허용한다. 이를 subpath state machine으로 바꾼다. 각 subpath는 M으로 시작하고 L/C를 포함하거나 point-only일 수 있다. Z는 현재 subpath를 닫는다. Z 뒤에는 새 M만 올 수 있다. 연속 Z, M 전 L/C/Z, nonfinite coordinate, unknown key를 거부한다. point-only subpath는 bounds에는 포함하되 채움 면적은 0이다. 현행 30,000 command limit를 유지하고 복합 path 전체 합계에 적용한다. 더 큰 geo는 primitive collection으로 분할하며 semantic feature key를 공유한다.

fillRule은 nonzero 또는 evenodd, 기본 nonzero다. stroke는 열린 subpath를 닫지 않는다. fill은 backend의 implicit close 의미를 공통 schema에 명시한다. hole을 하얀 도형으로 덮지 않는다. source ring winding을 일괄 뒤집지 말고 geo adapter의 외곽/구멍 구분 후 canonical orientation을 부여한다. clip도 같은 compound contract를 사용한다.

Cubic B(t)=(1-t)^3P0+3(1-t)^2tP1+3(1-t)t²P2+t³P3. bounds는 x/y 도함수의 (0,1) 실근과 endpoint를 평가한다. control polygon의 bounds만 쓰는 과대 bounds와 sample points만 쓰는 과소 bounds를 구분한다. flatten은 de Casteljau 이분, control-to-chord 최대거리≤tolerance까지 반복한다. tolerance는 scene CSS px로 변환한 후 적용하며 default 0.25px, maxDepth 20, 초과 시 진단을 반환한다. close segment와 zero-length segment를 명시적으로 처리한다.

arc를 cubic으로 내릴 때는 각 segment angle≤π/2, control factor 4/3 tan(Δθ/4)를 사용하고 더 작은 오차가 필요하면 adaptive 분할한다. full-circle에서 start=end라는 이유로 빈 path를 만들지 않는다. path 문자열 간 interpolation은 금지한다.

검증 fixture: 외곽 (0,0)-(10,10), 구멍 (3,3)-(7,7)의 면적은 84, 섬 (12,0)-(14,2)을 추가하면 88이다. (5,5)는 hole, (1,1)는 fill, (13,1)는 island다. cubic (0,0),(0,10),(10,10),(10,0)의 y최댓값은 7.5이고 bounds [0,0,10,7.5]다. 회전/translation/clip 후 hit와 occupied bounds를 함께 비교한다.

### 공통 primitive 소비자 목록

concreteGraphic/graphicBounds/graphicClip validator → primitive create/edit → materializer → Canvas path/fill/stroke → SVG serialization → native PNG/PDF → scene serialization → hit → accessibility item metadata → persistence를 모두 갱신한다. 한 renderer의 permissive 동작에 기대지 않는다. unsupported property는 action 시점에 거부한다.

새 mark adapter는 resolveItems, materialize, rematerialize, bounds, hitShape, semanticRole, highlightBaseline, lineage, sceneTopology를 제공한다. 실제 함수명은 기존 capabilities/policies registry 형태에 맞춘다. 별도의 parallel registry를 생성하지 않는다. 적용 불가 consumer도 이유와 시험을 남긴다.

### Paint 자원

기존 계획의 7개 texture style인 solid, diagonal, antidiagonal, horizontal, vertical, cross, dots를 유지한다. solid는 반복 없는 단색이며 나머지 여섯 style은 하나의 벡터 tile geometry 체계로 만든다. diagonal과 antidiagonal은 방향이 반대다. 이름만 바꾸어 기존 요구를 누락하지 않는다. pitch>0, strokeWidth≥0, phase=[x,y] finite, foreground/background 유효 색, coordinateSpace='plot'|'object'를 저장한다. plot은 같은 frame에서 phase가 이어지고 object는 item bounds 원점에서 반복한다. pattern의 alpha는 색 alpha×mark opacity로 딱 한 번 곱한다. clip 밖 ink는 없어야 한다.

linear gradient는 기존 계약을 보존한다. radial gradient는 center/focal/radius, stops를 정규화하고 radius>0, focal이 radius 밖이면 error다. stop offset은 [0,1] nondecreasing, 같은 offset은 hard stop으로 보존한다. default interpolation은 기존 color 계약을 재사용한다. svg defs ID는 resource hash+scope로 충돌 없이 만들고 renderer 객체는 저장하지 않는다. PDF가 native paint를 구현하지 못하면 동일 tile geometry의 vector lowering을 사용하고 조용한 solid fill 대체는 금지한다.

### Image와 font

resolver는 asynchronous host 함수로 uri, expected SHA256, MIME, byte limit, AbortSignal을 받아 bytes/dimensions/hash를 반환한다. resolve 후 createImageResource가 immutable 결과를 저장한다. renderer는 network fetch를 하지 않는다. URI만 남은 editable snapshot은 offline-ready가 아니다. export bundle에는 content-addressed payload와 license/attribution metadata를 포함한다. hash mismatch, decode error, CORS, abort를 구분한다. tainted Canvas는 export 전에 진단한다.

image fit contain/cover/fill, align 0..1 두 축, viewport clip을 고정한다. 200×100 image를 100×100 contain하면 rendered100×50, 중앙 align이면 y=25다. cover면 200×100을 유지하고 좌우50씩 clip한다. zero dimensions와 음수 size는 거부한다.

font resolver는 family/style/weight/bytes hash/metrics provider version을 저장한다. textMetrics는 실제 사용 font에 묶는다. load 전 fallback으로 측정했으면 완료 후 affected layout을 다시 계산하고 stale result는 버린다. deterministic export는 bundled font를 요구한다. 한글·combining mark·emoji ZWJ·hard break를 code point slicing으로 쪼개지 않는다. line text/origin/bounds는 materializer가 결정하고 renderer는 재측정하지 않는다.

### 디자인 우선순위와 null

ggaction defaults < chart-family defaults < theme < plot/mark style < explicit channel/mark/guide < named interaction overlay 순서다. 각 resolved property에 winning source를 inspect할 수 있게 한다. omission은 현행값 보존/생성 시 inference, 0/false/빈문자열은 해당 option이 허용하면 유효한 explicit값이다. null을 universal reset으로 만들지 않는다. 계약이 허용하는 nullable property만 null이고 reset은 해당 기존 API의 auto 규칙을 따른다. interaction style은 baseline에서 매번 계산하여 opacity가 누적되지 않게 한다.

theme schema에는 color palette, background, text family/size/weight/color, guide stroke/ticks/grid, spacing token, pattern palette를 넣되 resolved graphics 좌표를 넣지 않는다. theme edit는 property dependency로 재계산한다. color만 바뀌었는데 node force simulation을 다시 실행하면 실패다.

### Layout solve

text measure → guide intrinsic bounds → reserved lanes → plot bounds → marks → final occupied bounds → ancestor composition 순서로 계산한다. explicit Canvas dimensions와 margins를 보존한다. 최대 4회 고정점 solve, CSS px 변화≤0.1이면 수렴으로 제안한다. oscillation 또는 공간 부족은 layout-unsatisfied와 required bounds를 반환한다. 폰트 크기를 몰래 줄이지 않는다. layout 같은 입력은 같은 결과여야 한다.

동일 column의 plot/header/footer 정렬은 mark bounds만으로 계산하지 않고 retained guide, title, rotated text, border까지 포함한다. ragged facet의 occupied edge, empty panel, nested concat, shared legend, explicit child dimensions를 검증한다. responsive resize는 child program을 임의 crop하지 않고 root layout intent로부터 재계산한다. insets/panel별 frame id를 보존하고 single-Y validator를 재실행한다.

### 추가 paint와 furniture 의무

shadow, halo, outline, blend를 style capability matrix에 포함한다. halo/outline은 text 또는 mark 경계의 명시 stroke geometry로 낮춘다. shadow는 offsetX/offsetY/blurRadius/color를 저장하고 bounds를 확장한다. blur는 동일한 deterministic filter 또는 명시 raster sublayer lowering으로 네 export에서 구현하되 chart 전체 raster 대체는 금지한다. blend는 source-over/multiply/screen을 첫 native 지원 집합으로 제안하고 compositing order 및 premultiplied alpha fixture를 둔다. unsupported backend는 action/export preflight에서 명시 진단하며 지원 완료로 세지 않는다. headline/deck/source-note/footer/annotation은 named typography와 lane resource를 갖고 title만 바꾸는 방식으로 축소하지 않는다.

responsive label policy는 wrap→skip→rotate의 declared sequence다. maxLines/minPlotSize/skipStride/rotationCandidates를 explicit로 저장하며 각 단계 적용 reason을 inspect한다. threshold 너비 양옆에서 layout이 반복 진동하지 않아야 한다. 모든 phase에서 font fallback, source note, shared footer를 occupied bounds에 포함한다.

SVG image asset은 resolver에서 element/attribute allowlist를 검사하고 script/event-handler/external-resource를 거부한다. decode한 image는 immutable content hash로 고정한다. active SVG document를 DOM에 그대로 삽입하지 않는다.


## 그래프 데이터 추론과 노드 배치 계약

### Public flow와 stored result

createGraphData({id,nodes,edges,nodeKey,source,target,edgeKey,directed})는 관측 edge table을 사용한다. createInferredGraphData({id,data,nodeKey,ruleId,rule,features,metric,preprocess,options})는 규칙으로 연결을 만든다. 두 액션의 결과 GraphResource는 동일한 normalized nodes/edges/adjacency schema이며 origin만 다르다. layoutGraph는 topology를 읽고 NodeLayout을 만든다. bundleGraphEdges는 graph와 layout을 읽고 route만 만든다.

GraphResource node는 key,sourceRows,attributes; edge는 key,sourceKey,targetKey,directed,weight,origin,ruleId,sourceRows다. observed parallel edge는 explicit edgeKey 또는 persisted occurrence key를 요구한다. inferred edge는 [ruleId,direction,canonical endpoints]로 key를 만든다. k/metric 변경 후 같은 endpoint 연결이 살아 있으면 key를 보존하고 provenance revision을 올린다. ruleId를 바꾸면 별개의 추론이다. weight0은 유효하다. self edge는 inference에서 제외하고 observed 입력은 selfLoops:true일 때만 허용한다.

### Feature preparation

features는 수치 column 배열 또는 metric-specific fields다. Euclidean/Manhattan은 finite vector, cosine은 finite equal-length vector, Jaccard는 typed scalar의 deduplicated attribute 집합, great-circle은 [longitudeDeg,latitudeDeg]다. Jaccard는 유사도 계산일 뿐 집합 시각화 API가 아니다.

preprocess 기본 none. standardize는 모집단 mean/std로 각 feature를 (x−mean)/std, constant column은0으로 바꾼다. minmax는 (x−min)/(max−min), constant0. resolved statistics와 source revision을 저장한다. missing 기본 error; omit-node를 명시하면 제외 node 목록과 이유를 provenance에 남긴다. 임의 imputation은 없다. cosine zero vector는 기본 error, zeroVector:'zero-similarity' 옵션일 때 모든 pair similarity0. Jaccard empty-empty similarity1, empty-nonempty0. cosine는 [-1,1], Jaccard는 [0,1]. distance 변환은 1−similarity다.

Euclidean d=sqrt(sum((xi−yi)²)), Manhattan=sum(abs(xi−yi)). great-circle은 haversine, R=6371008.8m, clamped a∈[0,1], d=2R atan2(sqrt(a),sqrt(1−a)). output unit m, radius도 m이다. longitude wrap은 distance에서 처리하되 raw data는 보존한다. high-dimensional numerical overflow는 scaled norm으로 방지한다.

### 여섯 rule

| rule | 입력과 기본값 | 정확한 결과 |
|---|---|---|
| knn | k integer1..n−1, symmetrize directed(default)/union/mutual | self 제외, 거리→typed key 정렬한 앞 k개. ties로 k 초과 금지 |
| radius | radius≥0 | distance≤radius 포함. undirected canonical pair 한번; directed 옵션이면 양방향 |
| similarity | threshold metric domain 안 | similarity≥threshold 포함; negative cosine도 explicit threshold이면 유효 |
| mst | complete metric graph 또는 candidateGraph | Kruskal distance→canonical key 순. disconnected candidate는 forest:true일 때 forest |
| group | fields, mode clique(default)/star, hubKey for star | 같은 typed group tuple 내 연결; null group은 explicit missing policy |
| sequence | orderField, groupBy, lag integer≥1, ties key | group 내부 stable sort 뒤 i→i+lag. 시간 간격 조건은 maxGap 명시 |

empty input은 empty graph로 허용한다. knn의 n≤1은 k=1 default를 적용하기 전에 empty/no-edge 결과로 처리하고 effectiveK0를 provenance에 저장한다. n>1에서 k≥n이면 error, 조용한 clamp 금지. MST는 음수 metric을 거부하고 zero edge는 유지한다. clique의 m(m−1)/2 비용을 생성 전에 합산한다. group/sequence rule은 metric을 요구하지 않고 제공 시 inapplicable-option error다.

fixture a=0,b=1,c=3,d=10, k1: directed ab,ba,cb,dc; union ab,bc,cd; mutual ab. radius2:ab,bc. MST edges ab1,bc2,cd7, cost10. duplicate points a0,b0,c2에서 a→b,b→a의 zero edge가 남는다. tie origin0, negative−1, positive1에서 typed key 앞 항목 하나를 선택한다.

### Exact acceleration과 approximate

첫 구현은 brute-force exact와 budget preflight다. KD-tree는 Euclidean/Manhattan low dimension에서 bounding-box lower bound로 prune하고 tie boundary는 포함한다. radius grid는 cell 폭radius, radius0은 동일 좌표 key grouping을 별도 처리한다. pruning이 결과를 바꾸지 않는지 seeded random 100 fixtures에서 brute-force와 edge 배열을 정확 비교한다.

approximate는 명시 mode:'approximate'일 때만 실행한다. reference implementation은 seeded random projection forest candidate search 후 exact rerank로 제안한다. trees8, projections per tree1, leafSize32, searchLeaves16의 resolved preset을 저장한다. candidate가 k보다 적으면 exact fallback 또는 error 정책을 명시한다. seed와 algorithmVersion, candidateCount, measured recall@k를 기록한다. holdout min(n,1000) queries에서 brute-force 기준 recall≥0.95를 reference qualification 기준으로 한다. 사용자가 더 높은 minRecall을 지정하면 미달 시 incomplete/error이고 exact라고 표시하지 않는다.

### Node layout

layoutGraph method fixed/circular/force. fixed는 모든 node의 finite x/y가 필요하다. circular는 stable order, center/radius, zero/one node 정책. force는 입력 seed, iteration 수, linkDistance, repulsion, collisionRadius, damping, center를 저장한다. seeded 초기위치 뒤 fixed iterations로 계산하며 wall-clock 종료를 canonical result로 쓰지 않는다. 같은 seed/옵션/정렬이면 동일 결과다. 고정 node는 fx/fy를 움직이지 않는다. disconnected component를 0,0에 겹쳐 놓지 않고 component packing 단계를 명시한다.

force의 초기 reference solver는 O(n²) exact pair repulsion과 per-edge spring으로 구축한다. Barnes-Hut는 별도 optimization 카드에서 exact 비교와 오차 tolerance를 먼저 정의하고 opt-in accuracy parameter로 도입한다. force layout과 FDEB는 이름에 force가 들어가도 서로의 state나 iteration loop를 공유하지 않는다.

### 변경과 selection

source feature revise는 inference→layout policy→routing을 invalidation한다. node drag, camera/Canvas resize, color 변경은 topology를 유지한다. 사용자 features에 screenX/screenY를 명시한 경우에만 layout/camera 변화가 inference input이다. 이 예외는 cycle을 만들 수 있으므로 layout→inference→layout 순환은 거부한다.

filter 기본은 induced-view: 원 graph는 유지하고 visible node와 그 endpoints가 모두 visible인 edge만 그린다. recompute:true는 filtered data로 새 inference revision을 만든다. selected edge가 삭제되면 orphan selection 정책으로 drop event를 발생시키고 이웃 edge로 옮기지 않는다. 관측/추론 여부, rule와 metric은 inspect/tooltip/accessible description에서 확인할 수 있다.


## 계층 구조와 Icicle Sunburst 공통 계약

### 공개 액션 초안

~~~js
chart()
  .createData({id:'rows', values})
  .createHierarchyData({id:'h', data:'rows', key:'id', parent:'parent', value:'value', valueMode:'leaf-sum'})
  .layoutHierarchy({id:'partition', hierarchy:'h', method:'partition', order:'input'})
  .createPartitionPlot({id:'p', layout:'partition', coordinate:'coord', rootVisible:true, padding:0});
~~~

coord는 기존 coordinate 또는 새 계약에 따라 생성된 실제 coordinate ID다. Cartesian은 Icicle, polar는 Sunburst다. hierarchy 생성, layout, plot은 각각 ChartProgram을 반환한다. layout result object를 ChartProgram 대신 반환하지 않는다. read-only inspect로 결과를 얻는다. layoutHierarchy의 method union은 partition/tree/treemap이고 options는 method별로 검증한다.

### HierarchyResource

flat {id,parent,value}, nested children, groupFields로부터의 typed category path 세 입력을 지원한다. 하나를 명시하고 혼용하지 않는다. groupFields는 prefix tuple마다 internal node를 만들고 leaf aggregate와 source lineage를 저장한다. null category는 missingCategory:error(default)/include를 명시하며 include는 typed null category key로 표현한다. 이 내부 category key를 일반 user row key의 null 허용으로 확대하지 않는다. node key는 typed scalar, 부모는 같은 namespace다. root parent=null. duplicate/cycle/self-parent/orphan/negative/nonfinite weight는 default error다. forest는 forest:true일 때 invisible synthetic root를 만들어 허용한다. synthetic root ID는 user key와 다른 내부 namespace, 실제 node로 selection/export하지 않는다. orphan을 자동 root로 바꾸지 않는다.

normalized node는 key,parentKey,childrenKeys,depth,ownValue,totalValue,sourceRows를 갖는다. 입력 순서는 stable default, 명시 order는 value/key/custom field의 stable sort다. recursive call stack 대신 iterative DFS/postorder를 사용하여 depth10,000에서 stack overflow를 방지한다. maxNodes budget은 계산 전에 검증한다.

valueMode leaf-sum은 leaf weight만 합산하고 internal 값이 주어져도 집계에 더하지 않는다. 무시한 internal 값은 inspect metadata로 노출한다. inclusive는 internal value가 전체 subtree total이며 child 합≤parent이어야 한다. residual=parent−sum(children)>0이면 parent의 자체 몫을 마지막 reserved interval로 보존하고 가짜 child로 노출하지 않는다. own-plus-children은 ownValue+children total이다. 값 누락 leaf는 error, internal own-plus-children의 missing ownValue는 0이다. 전체 total0이면 모든 interval 폭0, divided-by-zero 없이 empty-value 진단과 node metadata만 남긴다. zero leaf가 사라진 data로 기록되지 않게 한다.

### Partition kernel

root interval은 [0,1], node depth는 정수다. 부모 [u0,u1], total W, 순서대로 child weight wi일 때 child start=u0+(u1−u0)×prefix/W, end=u0+(u1−u0)×(prefix+wi)/W. residual은 부모의 unused tail이다. floating 누적으로 마지막 child가 넘어가지 않도록 prefix를 compensated sum으로 계산하고 residual0이면 마지막 end를 정확히 parent end에 맞춘다. clamp로 잘못된 negative weight를 감추지 않는다.

normalized 결과는 key,u0,u1,depth,totalValue,ownValue,residual,sourceRows다. padding/orientation/viewport/radius는 이 결과를 바꾸지 않는다. [D3 partition](https://d3js.org/d3-hierarchy/partition)은 계층 노드에 구간 경계를 부여하는 공식 참고다. 이 로드맵의 identity, residual, focus, 저장 방식은 ggaction 제안 계약이다.

수치 기준: root10, A6(A1=2,A2=4),B4이면 root[0,1],A[0,.6],B[.6,1],A1[0,.2],A2[.2,.6]. width1000이면 A폭600. 총 depth levels3이면 높이300의 each-depth band100이다. A의 angle span은 1.2π. 같은 input에서 Cartesian/polar가 다른 sibling sort를 쓰면 실패다.

### Cartesian과 polar mapping

Cartesian horizontal: x=x0+u×W, y=y0+depth/levels×H. vertical은 두 축 역할을 교환한다. reverse는 해당 coordinate mapping에만 적용한다. rootVisible:false는 root band를 제외하여 effective depth=depth−1, levels=maxDepth로 계산한다. root-only이면 empty children view와 root metadata를 반환한다.

polar: θ=startAngle+u×sweep, sweep은 0보다 크고 2π 이하, direction은 clockwise/counterclockwise를 명시한다. radiusPolicy equal-depth이면 r(v)=r0+(r1−r0)v, equal-depth-area이면 r(v)=sqrt(r0²+(r1²−r0²)v). v는 depth boundary/levels다. r0≥0,r1>r0. equal-depth-area는 동일 depth band의 면적 계수를 맞추는 정책이며 모든 다른 깊이 node의 value 면적을 전역 비교할 수 있다는 뜻이 아니다.

padding은 CSS px의 x/y 또는 angular/radial gap으로 materialization한다. angular gap은 local mid-radius에서 px/r로 계산하고 wedge span을 넘으면 그 wedge를 비가시 처리한다. normalized interval을 shrink하지 않는다. tiny wedge label은 minWidth/minArcLength 검사를 통해 생략하며 accessible name은 유지한다. hit는 실제 visible wedge와 clip만 사용한다.

### Focus와 selection

focus node F의 [f0,f1]를 [0,1]로 재정규화하고 relative depth=depth−F.depth로 바꾼다. descendant만 visible, ancestor는 breadcrumb metadata다. key와 resource 자체 partition은 유지하고 view intent만 바꾼다. F가 data revise로 삭제되면 surviving nearest ancestor로 이동; 그마저 없으면 root. 이 복구를 event에 포함한다. selected node가 숨겨졌다고 logical selection을 조용히 다른 노드로 바꾸지 않는다. pruned selection policy는 keep-hidden(default)/drop 명시다.

keyboard은 parent/first child/previous sibling/next sibling/Home(root), Enter focus, Escape parent focus로 제안한다. breadcrumb도 같은 transaction을 사용한다. child count와 value, depth, path를 접근성 설명으로 제공한다.

### Icicle에서 Sunburst로 연속 변형

단순 path-string lerp 대신 normalized (u,v)를 사용하는 bend kernel을 둔다. strip width W, height H, 목표 angle sweep S∈(0,2π], bend b∈[0,1]에 대해 θ=S×b×(u−.5), y_b=(1−b)Hv+b×r(v)로 둔다. b>0에서는 R=(1−b)W/(S×b), X=(R+y_b)sinθ, Y=(R+y_b)cosθ−R다. b=0은 정확히 X=W(u−.5),Y=Hv다. b→0에서 이 값으로 수렴하고 b=1은 X=r(v)sin(S(u−.5)),Y=r(v)cos(S(u−.5))이므로 임의 inner radius를 가진 Sunburst에 맞는다. R을 W/(S×b)로만 두면 b1에도 불필요한 inner radius가 남으므로 그 식을 사용하지 않는다.

small b에서는 X=(1−b)W(u−.5)×sinc(θ)+y_b sinθ, Y=y_b cosθ−2R sin²(θ/2)를 사용한다. sinc0=1이다. target startAngle/direction에 필요한 rotation을 b에 따라 연속 적용하고 translation은 source strip anchor→target polar center로 선형 보간한다. 화면 y-down과 clockwise는 coordinate adapter가 한 번만 처리한다. padding 없는 normalized boundary를 먼저 변형하고 각 frame의 CSS gap/clip을 적용한다. reference fixture W=2π,H=1,r(v)=v,S=2π,u=.5,v=.5에서는 모든 b의 X0,Y.5다. b1,u=.75,v1은 (1,0), b0은 (π/2,1)이다.
endpoint b=0/1은 respective materializer 결과를 그대로 반환하여 drift0을 보장한다. shape boundaries를 같은 parameter grid로 sample해 cubic/path로 낮추고 current-frame hit도 같은 kernel을 사용한다. unequal radial policies 또는 tree topology가 바뀌면 이 kernel을 적용하지 않고 semantic crossfade로 전환한다. 이 전환은 plan의 match reason에 드러난다. reduced-motion은 최종 상태로 이동한다.

### Tree와 treemap

tree는 ordered hierarchy를 수평/수직/방사형 node-link로 배치한다. subtree-contour separation 기반 tidy layout, nodeSize와 siblingGap, depthGap을 explicit로 저장한다. contour conflict shift를 child group 전체에 적용하고 parent는 첫/마지막 child 중심 중간에 둔다. forest root 처리는 partition과 공유한다.

treemap은 slice-dice와 squarify 두 method를 제공한다. squarify는 descending stable value, row worstAspect=min/max area와 short side로 평가하고 개선되는 동안 같은 row에 추가한다. ties는 기존 row를 유지한다. padding은 각 recursion에서 부여하고 area0 노드는 zero area metadata다. sum child area=available parent area, no overlap, containment, stable keys를 검증한다. 화면 pixel rounding은 마지막 materialization에만 수행한다.


## Semantic hit gesture와 session 계약

### 상태 소유권

ChartProgram은 committed chart state만 소유한다. InteractionSession은 committedProgram, previewProgram, activeTransaction, runtime bindings, focus, listener disposers를 소유한다. DOM element/PointerEvent/timer/RAF/worker는 session 외부로 직렬화하지 않는다. persistent selection/parameter/annotation은 명시 commit 시 program resource가 된다. hover는 기본 transient이며 저장하지 않는다.

proposed entry ggaction/interaction은 browser-safe controller와 host-independent reducer를 export한다. default authoring entry가 DOM을 import하지 않게 한다. createInteractionSession({program,bindings,clock,assetResolver})는 lifecycle handle을 반환하고 authoring action과 혼동하지 않는다. mount(element), updateProgram(program), dispatch(command), subscribe(listener), getState(), destroy()를 명시한다. mount 없는 headless reducer 시험이 가능해야 한다.

### Hit의 좌표와 결과

pointer clientX/Y→element client rect→CSS local→root transform inverse→child composition inverse→geometry 좌표 순서다. DPR을 CSS local에 다시 곱하지 않는다. non-invertible transform은 hit 없음+diagnostic이다. spatial index는 current scene bounds를 broad phase로 검색하고 exact geometry/clip 검사로 좁힌다. fillRule, stroke width+hit slop, dash gaps 정책, opacity/visibility, z-order를 반영한다.

hit 결과는 {itemKey,ownerId,role,childPath,rowKeys,resourceRefs,screenPoint,localPoint,distance,zIndex,candidates}다. 실제 그림의 decorative part는 item의 owner로 collapse한다. guide roles axis-tick/axis-title/legend-item/facet-header/chart-title도 명시한다. candidate 정렬은 frontmost zIndex→distance→stable itemKey. overlap bundle는 모든 후보 edge를 반환하고 nearest 한 개로 정보를 없애지 않는다. 동일 item의 두 primitive가 걸려도 이벤트는 한 번이다.

path hit는 flatten tolerance.25 CSS px, fill inside winding/evenodd, stroke min point-segment distance≤width/2+slop. default pointer slop3px, touch6px로 제안한다. transparent fill은 'none'과 구분하며 opacity0은 default hit 제외, hitInvisible:true만 예외다. clip 밖은 항상 제외다. current animation scene version으로 index를 묶고 stale endpoint index를 쓰지 않는다.

### Selection resource

selection kind items/range/predicate, targets는 owner/child scope다. items는 logical key 배열, range는 typed domain bound+inclusive flags, predicate는 data AST다. mode replace/add/toggle/subtract/intersect, empty policy none(default)/all을 explicit 저장한다. nearest는 screen metric 또는 declared data metric을 구분한다. linked resolve는 union/intersection/global(owner scope)로 명시한다.

point hover는 inspection, click은 single/toggle selection. brush x/y/xy, angular interval, free lasso를 지원한다. categorical brush는 화면에 걸린 band keys, log brush는 inverse scale domain, time은 epoch ms, angular wrap interval은 [a,2π)∪[0,b]로 저장한다. lasso는 screen polygon과 selected item keys를 저장하고 domain polygon으로 오인하지 않는다. resize 후 selection 의미는 keys로 보존하고 lasso overlay는 필요하면 recompute된다.

### Gesture arbitration

pointerdown에서 priority가 가장 높은 applicable binding 하나가 transaction을 차지한다. default priority는 resize/reorder handle > annotation handle > brush/lasso > node drag > pan > click inspect다. modifier 조건은 명시 binding schema로 받고 서로 같은 priority/조건이면 ambiguity error다. movement3 CSS px 미만은 click, 그 이상은 drag다. pointer capture를 취득하고 active pointer ID를 고정한다. pinch 전환은 두 번째 pointer가 navigation binding에 들어올 때만 허용한다.

| 상태 | 입력 | 다음 상태와 효과 |
|---|---|---|
| idle | pointerdown | armed, baseline snapshot, capture |
| armed | move threshold 미만 | armed, inspect만 |
| armed | move threshold 이상 | dragging, preview 시작 |
| armed | up | click commit 또는 no-op; capture 해제 |
| dragging | move | 같은 baseline에서 새 preview, commit 없음 |
| dragging | up | 최종 preview를 한번 commit, idle |
| armed/dragging | Escape/pointercancel/lostcapture/blur | baseline 복구, cancel 한번, idle |
| any | destroy | cancel if active, dispose, terminal |

cancel 뒤 늦은 pointerup은 no-op다. 클릭 no-op은 history를 늘리지 않는다. preview coalescing은 RAF당 최대1회지만 최종 pointerup 위치는 반드시 처리한다. long synchronous computation으로 Escape를 막지 말고 worker/chunk operation을 사용한다. keyboard command도 같은 reducer 경로로 들어온다.

### 명령과 이벤트

command 종류는 inspect, select, setParameter, filter, setVisibility, reorder, annotate, setViewport, focusHierarchy, moveNode, reset, clearSelection. 각 command는 type, target, payload, transactionId, origin을 가진다. origin은 user/programmatic/replay/linked이고 causeTransactionId로 연결된다. reset은 session 초기 baseline, clearSelection은 선택만 제거한다. filter clear를 reset과 혼동하지 않는다.

event는 {type,transactionId,origin,phase,revision,affectedOwners,previous,current,diagnostics}. phase는 preview/commit/cancel/settled/error. 성공 순서: preview0..N→commit1→settled1. 취소: preview0..N→cancel1. reject: error1, commit0. settled는 해당 revision의 required layout/assets/worker가 모두 적용된 뒤 발생한다. 취소된 transaction에 나중에 settled를 보내지 않는다. large program을 event마다 deep clone하지 않고 immutable snapshot refs 또는 bounded summary를 제공한다.

reentrant dispatch는 현재 reducer call이 끝난 뒤 FIFO queue로 처리한다. subscriber가 같은 transaction origin을 다시 연결했을 때 loop를 차단한다. linked selection은 transaction당 target owner에 한 번, dependency closure에서 순서대로 실행한다. cycles in binding graph는 initialization에서 거부하거나 declared fixed-point mode가 없으면 허용하지 않는다.

### Async와 history

각 async job에 sessionGeneration, transactionId, baseRevision, resourceRevisionVector를 붙인다. 완료 시 네 가지가 일치할 때만 적용한다. 새 updateProgram이 들어오면 active preview를 cancel하고 새 baseline으로 재base한다. concurrent same-property edit를 마지막 도착값으로 덮지 않는다. destroy는 idempotent, 모든 listener/capture/timer/observer/worker/asset subscription을 해제한다. destroyed session의 dispatch는 명시 disposed error다.

history는 successful commit당 한 항목이고 preview는 기록하지 않는다. undo/redo는 immutable previous/current program을 사용하고 runtime binding은 유지한다. node drag100 move가100 history entries가 되면 실패다. external updateProgram은 origin을 명시하고 history 포함 여부를 option으로 정한다. default external update는 history reset이다.

### 필수 직접 조작

legend click은 visibility 또는 selection 중 binding으로 구분한다. hide된 mark의 scale domain은 policy visible-data/all-data로 명시한다. reorder는 categorical domain을 바꾸고 axis/legend/marks 모두 동기화한다. annotation은 data/feature/item anchor+offset, text/style을 저장한다. data 없는 screen annotation은 screen-anchored임을 명시한다. context menu는 host callback에 actionable semantic targets를 넘기고 새 DOM widget library를 core에 넣지 않는다.

linked filter가 source rows를 바꾸면 data→stats→scale→graphics가 모두 갱신된다. 삭제된 child/row/edge selection은 drop 또는 keep-hidden 정책과 event로 처리한다. keyboard focus는 surviving stable item, 없으면 owner container로 복구한다. tooltip은 hover와 focus 모두 가능하고 Escape로 닫는다. touch는 hover가 없어도 inspect/selection에 접근 가능하다.

### 명시 시나리오

baseline values[a1,b2], brush move3회 뒤 Escape: baseline/trace/hash 동일, preview≤3, cancel1, commit0. 같은 입력 뒤 up: commit1, history+1, cancel0. pointer capture lost 후 up: cancel1만. linked A→B→A binding을 단순 callback으로 만들었을 때 무한 event 발생은 실패다. async job1 뒤 job2를 보냈고 job2가 먼저 끝나면 job1은 stale로 폐기한다. destroy 뒤 성공 callback에서 DOM/scene을 만지면 실패다.


## 단일 Y 정책 통합 검증과 릴리스 계약

### Frame 단위 single Y

Cartesian frame은 같은 plot region에서 한 coordinate mapping으로 데이터를 읽는 semantic owner다. layer ID와 같지 않다. overlay/compose layer는 같은 frameId를 공유하고 독립 facet/concat panel은 별도 frameId다. frame에 속한 모든 y/y2 encoding의 resolved scale identity가 하나여야 한다. y2는 범위 endpoint로 같은 scale에 map된다. 같은 numerical domain이라는 이유만으로 별도 scale 두 개를 허용하지 않는다.

표시 Y guide는 최대 하나다. mirrored second axis도 거부한다. guide를 숨겨도 independent scale이 남으면 error다. 같은 plot rect에 independent frame을 overlay하여 정책을 우회하는 구성도 reject한다. 겹침을 일부 허용하는 일반 annotation/image와 독립 척도를 가진 plot-frame overlap을 구분한다. 좌표계가 polar/geo/parallel이면 Cartesian Y validator를 잘못 적용하지 않는다.

검증 위치는 public create/edit preflight, semantic schema validator, composition binding validation, materialized frame metadata validation, deserialize validation 다섯 곳이다. 다섯 구현을 복제하지 않고 한 pure validator와 boundary별 adapter를 쓴다. 새 state를 before mutation에 검사한다. 오류에 frameId와 conflicting scale/guide owner 목록을 담는다.

### Consumer completion matrix

모든 신규 mark family/geometry는 아래 열을 갖는 matrix row다. 열: create, edit, source revise, encodings, scales, guides, nested composition, selection/highlight, hit, scene/animation, SVG, Canvas, PNG, PDF, persistence, types, package, docs, accessibility. 상태는 required/passed/failed/not-run/not-applicable이고 N/A에는 이유가 필수다. marks만 렌더되면 row 전체 passed로 바꾸지 않는다.

행은 compound path, pattern, image, partition Cartesian, partition polar, tree, treemap, graph nodes, graph edges 4method, Sankey DAG, Sankey cyclic, contour line, contour filled, calendar, table, Pyramid, OHLC, waterfall, trail, geo shape, geo point, geo line, graticule이다. 기존 rose/radar/streamgraph/violin은 regression row로 추가한다. 상호작용 row는 pointer/keyboard/touch, preview/commit/cancel, undo/redo, linked, async/dispose, restore가 별도 축이다.

### 필수 종단 시나리오

| 시나리오 | 실행 순서 | 검증 |
|---|---|---|
| partition 탐색 | hierarchy→Icicle→focus A→select A2→Sunburst morph→revise A2→save/load | 동일 node key, interval 갱신, current-frame hit, focus/breadcrumb |
| inferred graph | kNN union→force layout→4method bundle→drag→k edit→filter | drag 때 topology 유지, k edit 때 rebuild, surviving edge key |
| route selection | 3 edges overlap→hit candidates→keyboard cycle→unbundle→interrupt | 원 edge만 선택, endpoint attachment, phantom adjacency0 |
| geo dashboard | TopoJSON join→choropleth+points→pan/zoom→LOD→linked table | asset hash, county selection, inverse, no backside hit |
| dataflow | parameter→filter→aggregate→bar+line overlay→guide update | same Y, empty domain, deterministic trace |
| complex layout | nested facet→long Korean labels→font load→resize | final occupied bounds/headers/footers, no stale text |
| static delivery | interacted chart→serialize→network-disabled fresh process→4formats | state/asset/font/clip/selection 동일 |
| lifecycle stress | mount→gesture→worker/asset start→resize→destroy×100 | late callback0, listener/worker leak0 |

각 시나리오 input fixture와 exact action chain을 manifest 한 곳에 둔다. expected image만 있고 의미 assertion이 없는 fixture는 부족하다. public program과 primitive reference의 같은 run decoded pixel equality는 primitive lowering 확인용이며, 독립 수치/topology oracle를 대체하지 않는다.

### 시험 계층과 명령

현재 scripts/run-tests.js는 suite 뒤에 file/prefix selector를 받는다. 새 capability 전용 파일을 만든 뒤 아래 패턴으로 실행한다. 아직 없는 selector가0개를 찾으면 성공으로 취급하지 않는다.

~~~sh
node scripts/run-tests.js unit unit/grammar/partition.test.js
node scripts/run-tests.js contracts contracts/partition.test.js
node scripts/run-tests.js charts chart:partition
node scripts/run-tests.js browser browser/partition.browser.js
npm run test:render
~~~

stable tests는 capability-oriented path를 사용하고 STEP/WP/roadmap 번호를 파일명·runtime import에 넣지 않는다. 수치 oracle는 test/oracles에서 src를 import하지 않는다. browser는 실제 pointer/wheel/keyboard, touch는 touch-enabled context에서 실행한다. DOM handler를 직접 호출하는 시험만으로 gesture 완료라고 하지 않는다.

카드 종료는 focused unit/contracts/charts와 바뀐 renderer/browser가 기준이다. phase 종료는 npm test, test:browser, test:render, test:package 및 해당 docs/type generation checks를 실행한다. 전체 qualification은 npm test, test:realistic, test:coverage, test:browser, test:render, test:package, test:platform, package:check, docs:verify를 수행한다. 현행 coverage floor 94% lines/89% branches/98% functions와 critical-file floor를 낮추지 않는다. 숫자를 채우려고 production mirror tests를 만들지 않는다. 현재 CI/workflow가 바뀌면 baseline command inventory를 갱신한다.

### 성능 기준 제안

성능 프로필은 browser Chromium, DPR1/2, production build, warmup5회+측정30회, seed 고정, pinned font, network0으로 한다. 장비 CPU/cores/RAM/OS/browser/node/hash를 기록한다. desktop-reference 프로필은 CI runner가 아니라 실제 측정 장비를 manifest에 고정한다. 아래 SLO는 승인 전 목표이며 이번 문서 작업에서 측정된 결과가 아니다.

| workload | small | medium | large | 제안 통과 기준 |
|---|---|---|---|---|
| points/hit | 1k | 10k | 100k | P95 hit≤8/12/20ms; full-frame sample≤16.7/33/50ms |
| partition | 100 | 1k | 10k nodes | kernel P95≤10/50/300ms, gesture preview≤33ms |
| graph inference | 100 | 1k | 10k nodes, k10 | exact result 일치; medium≤1s, large worker≤10s 또는 명시 budget error |
| bundling | 100 | 1k | 10k edges | small≤.5s, medium≤5s, large≤30s, abort acknowledgement≤100ms |
| geo | 1k | 10k | 100k vertices | camera preview P95≤16.7/33/50ms, hit≤20ms |
| load/revise | 1k | 10k | 100k items | P95≤100/500/3000ms, native UI blocking slice≤50ms |

large budget error는 안전성 통과일 뿐 해당 large 성능 지원 통과가 아니다. 지원하는 size class별로 success SLO와 explicit-limit 시험을 따로 기록한다. density field size와 FDEB candidate pair count를 edge count와 함께 남긴다. target SLO를 달성하지 못하면 algorithm/worker/cache를 개선하거나 사용자에게 근거 있는 지원 한도 결정을 제시한다. 조용히 sample/drop하여 pass하지 않는다.

mount/dispose100회 뒤 GC 가능 환경에서 retained heap 기울기≤10KB/cycle, 전체 증가≤2MB를 제안한다. heap 측정 불가 환경은 unavailable이며 pass가 아니다. listeners/workers/timers/capture counters는 정확0을 별도 assertion한다. benchmark는 prod algorithm이 완성되기 전 placeholder0ms를 기록하지 않는다.

### 패키지와 agent 문서

브라우저 entry에는 Node-only canvas/fs/worker_threads가 유입되지 않아야 한다. ggaction/png/pdf만 optional native dependencies를 요구한다. interaction/animation 추가 export의 imports/types/browser-safe bundle budget을 package consumer로 검사한다. npm pack 산출물을 temp directory에 설치하고 source checkout 없는 환경에서 program 생성→serialize→load→edit→render를 수행한다.

새 action마다 shortest call, complete call, options/defaults, target inference, stored result, trace, revise/remove, invalid cases, supported consumers를 current contract에 작성한다. action catalog, relationships, cards, knowledge/task packet, docs/LLM manifest, inspection descriptor, MCP exposure, type declaration, executable example을 동기화한다. planned 기능은 구현 완료 전 current 문서에 올리지 않는다. 다음 약한 모델용 packet은 action chain+입력+expected+negative case+수정 경로+파일 링크를 포함한다. source code 전체를 복제해 별도 진실로 만들지 않는다.

### Release 순서

기능 qualification의 모든 active requirement30과 AT79가 실제 evidence로 닫히고 consumer matrix의 required cell이 남지 않아야 한다. excluded/deferred/reference를 성공으로 세지 않는다. 독립 reviewer가 실패 전부와 domain별 성공 표본을 확인한다. 대량 snapshot 갱신은 reason/semantic evidence 없는 한 금지한다.

당시 사용자가 릴리스를 승인한 범위에서 version/CHANGELOG/types/docs를 정리하고 clean candidate commit을 만든다. annotated tag와 package/lock version 및 commit 일치 확인→tag ref에서 release workflow dispatch→canonical candidate tarball 한번 생성→모든 verify job에서 같은 artifact 다운로드→consumer/coverage/render/docs/qualification→protected publish→registry artifact의 hash/integrity와 candidate 대조→공개 docs/release links 검증 순서다. git HEAD, CI 성공, npm publication, Pages publication을 각각 확인한다. 하나가 나머지를 증명하지 않는다.

실패 시 이전 public release를 삭제하거나 tag를 이동하지 않는다. 미공개 candidate는 원인 수정 후 새 candidate identity로 다시 검증한다. 이미 공개된 version은 덮어쓰지 말고 fix release 계획을 세운다. 릴리스 보고에는 exact commit/tag/tarball SHA256/registry integrity/CI run/docs URL과 남은 제한을 포함한다.


## 구조형 레이아웃과 차트 조합 계약

### Sankey와 cyclic flow

createFlowData는 graph node/edge identity를 재사용하고 nonnegative finite flow value를 요구한다. node throughput은 max(sum incoming,sum outgoing), imbalance는 명시 inspect metadata다. conservation을 강제하려면 balance:'strict'를 사용한다. negative flow는 source/target를 몰래 뒤집지 않고 error다. zero flow는 semantic edge로 남고 thickness0이다.

layoutFlow method dag/cyclic. DAG는 topological longest-path rank, explicit align/order, node padding, width를 적용한다. y scale factor k는 모든 column의 (availableHeight−gaps)/sum(node throughput) 중 최솟값이다. edge thickness=k×value, node height=k×throughput. column 내 stable order에서 barycentric relaxation 후 overlap resolve를 fixed iterations로 수행한다. relaxation이 node width나 rank를 바꾸지 않는다. source/target attachment intervals는 edge order를 누적하여 node 안에 둔다. parallel links도 별도 edge key다.

cyclic은 strongly connected components를 먼저 구하고 condensation DAG를 배치한다. SCC 내부 feedback edge는 상/하 외부 lane에 deterministic edge-key 순으로 배치한다. lane width는 flow thickness+gap, bounds에 포함한다. self-loop는 별도 loop lane. DAG mode에서 cycle은 error, cyclic mode에서 cycle을 잘라 edge를 삭제하면 실패다. tooltip에는 원 source/target/value를 사용한다. 문서와 시험은 DAG와 cyclic 각각 complete여야 한다.

### Contour와 density

grid input contour와 point-density contour를 구분한다. createContourData는 regular scalar grid의 origin, dx/dy, width/height, values, thresholds를 저장한다. point-density는 명시 estimator/bandwidth/grid를 통해 먼저 같은 grid resource로 낮춘다. marching squares는 threshold inclusive rule와 saddle case asymptotic decider를 고정한다. 2×2 cell corner의 bilinear center sign과 determinant가 ambiguous connection을 결정하고 exact tie는 fixed diagonal 규칙이다. edge crossing 좌표는 선형 interpolation, missing grid cell은 hole boundary 정책을 따른다.

segments를 coordinate-key tolerance로 stitch하여 closed rings를 만들고 containment/winding으로 outer/hole을 분류한다. disconnected islands를 한 path로 억지 연결하지 않는다. filled band는 threshold[i]≤z<threshold[i+1], 마지막 band는 upper inclusive다. iso-line과 filled-contour는 같은 threshold geometry를 공유한다. small grid의 circle-like hill, saddle, donut, all missing, constant grid를 수치와 topology로 검증한다.

### Calendar와 table

calendar의 날짜 계산은 data-statistics 계약을 따른다. createCalendarPlot은 day cell rect, month boundary path, week/day label 역할을 공유 item metadata로 묶는다. source→civil day aggregate→cell layout→rect/label action 조합이다. month label이 임의 pixel로 박혀 resize에 남지 않게 한다.

table은 row/column key 기반 cell layout이다. header/body/footer role, rowHeight, column width auto/fixed, align, wrapping, missing text, numeric formatter를 저장한다. renderer 전용 HTML table은 정적 export의 대체물이 아니다. 필요하면 accessible DOM table을 같은 semantic cells로 파생한다. cell hit는 [rowKey,columnKey], sorting/reorder 시 유지한다. heatmap은 cell color encoding 조합이며 별도 duplicate geometry kernel을 만들지 않는다.

### Pyramid의 stage 의미

현행 baseline에 createFunnelPlot은 없으므로 기존 runtime 함수를 rename하는 작업이 아니다. 이전 계획의 stage/funnel 의미를 createPyramidPlot에 구현한다. stage order 기본 input, value≥0, gap≥0, orientation down/up/right/left를 명시한다. 자동 값 정렬·반전·삼각형 강제는 없다.

reference profile은 width encoding, equal stage heights다. stage i의 topWidth=W×vi/max(v), bottomWidth=W×v(i+1)/max(v), 마지막 bottomWidth는 lastStage:'flat'(default)이면 topWidth, 'point'이면0이다. 각 stage center는 공통 centerline, gap은 stage 사이에만 적용한다. 총 높이 H에서 h=(H−gap×(n−1))/n, h<0이면 layout error다. 이 정확한 profile은 새 시각 Gate에서 확인할 제안이고 과거 구현의 검증된 default로 주장하지 않는다. area encoding도 필수 explicit mode다. equal-height stage의 topWidth=W×vi/max(v), bottomWidth=taperRatio×topWidth, taperRatio 기본 .8∈[0,1]로 고정하면 area=.5×h×W×(1+taperRatio)×vi/max(v)로 value에 비례한다. 이 mode는 다음 stage의 topWidth와 현재 bottomWidth의 연속을 강제하지 않는다. area/width를 바꾸면 value 의미가 바뀌므로 inspect/문서/visual fixture를 각각 둔다. area mode에서는 lastStage 옵션을 거부하고 taperRatio만 사용한다. width mode는 taperRatio를 거부한다. 값이 전부0이면 stage metadata를 유지하고 모든 폭0이며 division을 하지 않는다.

fixture values[100,60,20],W100,H90,gap0,flat: stage widths[(100,60),(60,20),(20,20)], heights30. area mode taper.8이면 widths[(100,80),(60,48),(20,16)], areas[2700,1620,540]으로100:60:20 비례다. 100보다60이 먼저 오는 입력이면 그 순서를 그대로 유지한다. percent denominator는 first/total/previous 중 explicit, zero denominator는 missing label이다.

### OHLC waterfall trail

OHLC는 x/low/high/open/close의 의미를 저장한다. low≤min(open,close)≤max(open,close)≤high, invalid row 정책은 error/omit-row. stem은 low-high, body는 open-close, 상승/하락 색은 close≥open 분기, doji는 visibility 정책을 갖는 zero-height body다. 기존 rule/rect mark와 semantic compound owner로 구성한다. row hit 한 번, stem/body 중복 selection 이벤트 금지다.

waterfall는 stage role delta/total/subtotal을 명시한다. 누적 s, delta v의 endpoint는 [s,s+v], 다음s=s+v. total은 [0,explicit total 또는 current s], subtotal은 [0,current s]이며 누적 초기화 여부를 명시 reset flag로만 바꾼다. negative contribution과 connector, missing sequence를 검증한다. total이라는 label 문자열로 역할을 추정하지 않는다.

trail는 ordered centerline sample별 width를 가진 ribbon이다. tangent unit normal의 양쪽에 width/2를 offset하고 join miter/bevel/round, cap butt/square/round를 적용한다. miterLimit 기본4, zero-length adjacent segment는 merge하되 원 row lineage 보존. width0은 degenerate ribbon으로 허용하고 negative는 error다. self-intersection fillRule을 geometry contract로 처리한다. curve order·missing breaks·polar seam을 line/area와 공유한다.

### 기존 표현의 보강

rose는 angle와 area 의미, radial-bar는 radius 의미를 혼동하지 않는다. radar는 각 dimension domain과 angular order, closed path, missing variable policy를 유지한다. streamgraph는 기존 stack baseline zero/center/wiggle을 explicit로 선택하고 wiggle numeric oracle를 추가한다. violin은 bandwidth/grid/normalize 정책을 보존하며 zero density와 unequal groups를 검증한다. sparkline는 기존 line+guides off+compact layout recipe다.

### 조합 recipe의 정확한 역할

Marginal: 중심 scatter와 x histogram/y histogram을 concat/facet layout으로 배치하고 해당 dimension scale domain을 공유한다. 분리된 panel frame 각각의 Y는 허용된다. selection은 source row key로 linked되며 histogram bin 선택은 lineage query다.

Bullet: 같은 frame에서 range background rect→measure bar→target rule 순으로 그린다. range는 reference 의미, measure/target은 같은 numerical scale이다. 텍스트 label은 text action, 색/extent는 explicit다. createBulletPlot는 추가하지 않는다.

Combo: 한 frame에 bar+line 등 compatible layer를 compose하고 Y scale object를 공유한다. 다른 단위의 독립 Y가 필요하면 분리된 panels로 구성한다. hidden second scale이나 0..1 사전정규화로 다른 척도를 몰래 만들지 않는다. 명시 normalization은 하나의 새 측정 의미로 표시할 때만 허용한다.

각 recipe는 실제 public action chain, input fixture, semantic role assertion, saved editable program, four-format render, selection/resize/revise replay를 동봉한다. recipe AST 검사로 raw graphic API와 새 전용 constructor가 없는지 확인한다.

### Table 내부 bar와 sparkline

Bar Table은 cell의 value→bounded bar width와 text를 같은 cell layout에 배치한다. inline sparkline은 row cell을 독립 panel frame으로 두고 공통 x extent, 독립 y 또는 shared y 정책을 명시한다. 독립 cell frame이므로 single-Y 위반이 아니며 한 cell에 두 Y scale을 두지는 않는다. rowLimit은 visible presentation 제한과 원 데이터 존재를 구분하고 clipped/truncated value 표시를 제공한다. cell/row/column header semantic hit와 accessible values는 동일 source를 쓴다.


## 전체 작업 카드

각 카드의 실행 명령은 계획이며 이번 문서 작업에서 수행한 ggaction 기능 테스트가 아니다.


### STEP-001 기준 버전과 실행 경로 고정

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-00. 선행 단계 없음. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `scripts/run-tests.js`
- `scripts/coverage-policy.js`
- `test/capabilities.json`
- `.github/workflows/ci.yml`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `test/oracles/native-fixtures.js` — Independent literal fixture and comparison helpers; no src imports.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. HEAD/package/lock와 public exports/action count를 다시 inventory한다.
2. 현재 CI·coverage·docs·release script의 실제 명령을 저장한다.
3. source-map의 symbol/hash와 drift 정책을 기록한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

clean baseline과 재현 가능한 command manifest; 기존 테스트 실패는 신규 변경 실패와 분리. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

다른 checkout의 버전·완료 숫자 재사용 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-01** 입력: ggaction baseline·공개 action/schema·환경 hash. 기대: 기준 버전과 계약 추적, native fixture hash 재현; 외부 저장소 실행 불필요.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

이 카드는 기존 canonical verification 경로를 사용한다. 필요 없는 구현 미러 테스트를 만들지 않는다.

~~~sh
npm test
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.


### STEP-002 독립 oracle와 fixture harness

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-00. 선행 단계 STEP-001. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `scripts/run-tests.js`
- `scripts/coverage-policy.js`
- `test/capabilities.json`
- `.github/workflows/ci.yml`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `test/oracles/native-fixtures.js` — Independent literal fixture and comparison helpers; no src imports.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. literal fixture schema와 abs/rel tolerance comparator를 만든다.
2. numeric/geometry/state/time/asset 각 oracle owner를 분리한다.
3. src import 없는 독립 수식과 seeded input generator를 작성한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

같은 fixture+seed의 expected/hash 동일; wrong result를 주면 반드시 실패. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

production helper로 expected 생성 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-02** 입력: 독립 numeric/geometry/state/time reference 생성. 기대: 동일 native 입력에서 결정적 출력과 반복 가능한 oracle; 외부 엔진 필수 아님.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

이 카드는 기존 canonical verification 경로를 사용한다. 필요 없는 구현 미러 테스트를 만들지 않는다.

~~~sh
npm test
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.


### STEP-003 시험 발견과 evidence 기록

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-00. 선행 단계 STEP-002. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `scripts/run-tests.js`
- `scripts/coverage-policy.js`
- `test/capabilities.json`
- `.github/workflows/ci.yml`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `test/oracles/native-fixtures.js` — Independent literal fixture and comparison helpers; no src imports.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. 새 capability 시험 파일의 runner discovery를 검증한다.
2. result evidence에 commit/command/exit/hash를 필수로 둔다.
3. not-run과 pass를 분리하는 completion manifest validator를 만든다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

0 discovered test와 missing artifact는 종료 실패. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

empty suite 성공·계획 import로 자기검증 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-01** 입력: ggaction baseline·공개 action/schema·환경 hash. 기대: 기준 버전과 계약 추적, native fixture hash 재현; 외부 저장소 실행 불필요.
- **AT-02** 입력: 독립 numeric/geometry/state/time reference 생성. 기대: 동일 native 입력에서 결정적 출력과 반복 가능한 oracle; 외부 엔진 필수 아님.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

이 카드는 기존 canonical verification 경로를 사용한다. 필요 없는 구현 미러 테스트를 만들지 않는다.

~~~sh
npm test
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.


### STEP-004 명시 key와 생성 row identity

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-02. 선행 단계 STEP-003. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/data/revise.js`
- `src/actions/data/revisionBindings.js`
- `src/materialization/revisionIdentity.js`
- `src/scene.js`
- `src/inspection.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/core/itemIdentity.js` — Typed key encoding and generated row tokens.
- `src/grammar/lineage.js` — Pure final-grain lineage normalization.
- `src/materialization/itemMetadata.js` — Stable semantic item metadata for existing scene and selection owners.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. typed scalar/tuple codec과 ordering을 구현한다.
2. createData와 reviseData에 logical identity와 persisted tokens를 연결한다.
3. duplicate/null/unkeyed full replacement 정책을 preflight한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

keyed a/b 순서·값 변경 후 key 유지; unkeyed 전체 교체는 새 key. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

row value hash·delimiter collision·삭제 token 재사용 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-01. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-06** 입력: 3rows 중1row값변경, 정렬, append/delete, reload. 기대: 명시 key가 같은 항목 identity 유지; old program 불변; generated key 할당 보존.
- **AT-07** 입력: duplicate/null key 및 key없는 전체 set-data 교체. 기대: 명시 error/occurrence/mapping/new-identity 정책; 자동 잘못 매칭 없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/row-identity.test.js`
- `test/contracts/row-identity.test.js`

~~~sh
node scripts/run-tests.js unit unit/row-identity.test.js
node scripts/run-tests.js contracts contracts/row-identity.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-005 모든 transform의 final grain lineage

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-02. 선행 단계 STEP-004. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/data/revise.js`
- `src/actions/data/revisionBindings.js`
- `src/materialization/revisionIdentity.js`
- `src/scene.js`
- `src/inspection.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/core/itemIdentity.js` — Typed key encoding and generated row tokens.
- `src/grammar/lineage.js` — Pure final-grain lineage normalization.
- `src/materialization/itemMetadata.js` — Stable semantic item metadata for existing scene and selection owners.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. 1:1/fold/flatten/aggregate/bin/stack/lookup의 key adapter를 구현한다.
2. shared lineage table과 reverse lookup을 만든다.
3. facet/series item grain과 원본 contributing rows를 연결한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

aggregate A=[r1,r2], filter 뒤 A=[r1]; lookup 양쪽 role 보존. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

array index를 stable identity로 노출 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-08** 입력: aggregate/bin/stack/fold/lookup/facet 후 hit·filter·revise. 기대: contributing row lineage와 grain 정확; series/owner/facet key 충돌 없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/derived-lineage.test.js`
- `test/contracts/derived-lineage.test.js`

~~~sh
node scripts/run-tests.js unit unit/derived-lineage.test.js
node scripts/run-tests.js contracts contracts/derived-lineage.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-006 Scene selection과 revision 연결

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-02. 선행 단계 STEP-005. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/data/revise.js`
- `src/actions/data/revisionBindings.js`
- `src/materialization/revisionIdentity.js`
- `src/scene.js`
- `src/inspection.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/core/itemIdentity.js` — Typed key encoding and generated row tokens.
- `src/grammar/lineage.js` — Pure final-grain lineage normalization.
- `src/materialization/itemMetadata.js` — Stable semantic item metadata for existing scene and selection owners.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. scene의 value-token matching을 stable item metadata로 교체한다.
2. selection/highlight와 inspection에 row/series key를 전달한다.
3. revise와 nested child 이동의 enter/update/exit reason을 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

b 값만 변경하면 b update; topology 변경 path는 safe fade. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

primitive child index로 다른 항목에 selection 이동 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-01. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-06** 입력: 3rows 중1row값변경, 정렬, append/delete, reload. 기대: 명시 key가 같은 항목 identity 유지; old program 불변; generated key 할당 보존.
- **AT-07** 입력: duplicate/null key 및 key없는 전체 set-data 교체. 기대: 명시 error/occurrence/mapping/new-identity 정책; 자동 잘못 매칭 없음.
- **AT-08** 입력: aggregate/bin/stack/fold/lookup/facet 후 hit·filter·revise. 기대: contributing row lineage와 grain 정확; series/owner/facet key 충돌 없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/scene-identity.test.js`
- `test/contracts/scene-identity.test.js`

~~~sh
node scripts/run-tests.js unit unit/scene-identity.test.js
node scripts/run-tests.js contracts contracts/scene-identity.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-007 Typed resource schema와 ownership

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-03. 선행 단계 STEP-006. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/core/ChartProgram.js`
- `src/core/specs.js`
- `src/core/resourceReferences.js`
- `src/core/materializationState.js`
- `src/persistence.js`
- `src/persistence/validation.js`
- `src/persistence/codec.js`
- `src/materialization/planner.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/core/domainResources.js` — Owned resource union and revision references.
- `src/selectors/resources.js` — Typed resource lookup and ambiguity handling.
- `src/grammar/resources.js` — Pure resource/ref/dependency validation.
- `src/persistence/migrations.js` — Explicit editable 1/2/3 to 4 migration steps.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. resources discriminator와 validators/selectors를 구현한다.
2. kind/id/revision ref collector와 cycle validator를 기존 registry에 연결한다.
3. prepared result의 source revision과 owned buffers를 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

동일 id 다른 kind 구분; stale result와 cycle atomic rejection. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

materializationConfigs에 semantic result 중복 저장 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-10** 입력: 새 모든 resource/action을 serialize→새프로세스 load→edit. 기대: 등록/스키마 검증·trace·inspection 일치, DOM/function/cache 유입 없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/resource-registry.test.js`
- `test/contracts/resource-registry.test.js`

~~~sh
node scripts/run-tests.js unit unit/resource-registry.test.js
node scripts/run-tests.js contracts contracts/resource-registry.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-008 리소스 edit remove와 재계산

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-03. 선행 단계 STEP-007. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/core/ChartProgram.js`
- `src/core/specs.js`
- `src/core/resourceReferences.js`
- `src/core/materializationState.js`
- `src/persistence.js`
- `src/persistence/validation.js`
- `src/persistence/codec.js`
- `src/materialization/planner.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/core/domainResources.js` — Owned resource union and revision references.
- `src/selectors/resources.js` — Typed resource lookup and ambiguity handling.
- `src/grammar/resources.js` — Pure resource/ref/dependency validation.
- `src/persistence/migrations.js` — Explicit editable 1/2/3 to 4 migration steps.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. create/edit/replace/remove의 lifecycle을 정한다.
2. restrict/cascade preflight와 shared user resource 보호를 구현한다.
3. domain dependency closure를 기존 ordered materialization plan에 연결한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

node drag→route/hit만 갱신; source feature edit→inference 이후 갱신. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

dangling ref·partial trace·hidden compile 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-10** 입력: 새 모든 resource/action을 serialize→새프로세스 load→edit. 기대: 등록/스키마 검증·trace·inspection 일치, DOM/function/cache 유입 없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/resource-lifecycle.test.js`
- `test/contracts/resource-lifecycle.test.js`

~~~sh
node scripts/run-tests.js unit unit/resource-lifecycle.test.js
node scripts/run-tests.js contracts contracts/resource-lifecycle.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-009 Schema 4와 역사적 program 복원

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-03. 선행 단계 STEP-008. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/core/ChartProgram.js`
- `src/core/specs.js`
- `src/core/resourceReferences.js`
- `src/core/materializationState.js`
- `src/persistence.js`
- `src/persistence/validation.js`
- `src/persistence/codec.js`
- `src/materialization/planner.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/core/domainResources.js` — Owned resource union and revision references.
- `src/selectors/resources.js` — Typed resource lookup and ambiguity handling.
- `src/grammar/resources.js` — Pure resource/ref/dependency validation.
- `src/persistence/migrations.js` — Explicit editable 1/2/3 to 4 migration steps.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. schema1/2/3 검증 후4 migration을 순서대로 구현한다.
2. selection index를 saved row key로 변환하고 ambiguous ref를 거부한다.
3. fresh process serialize/load/edit/remove와 tagged scalar 왕복을 시험한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

기존3 fixture의 의미/graphics 보존; 신규resource 복원 뒤 편집 가능. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

schema3 의미 소급 변경·function/DOM 저장 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-09** 입력: schema3 selection/highlight 프로그램을 새 버전에서 load/edit/save. 기대: 기존 상태 동등, indices→rowkey 변환 근거 보존, ambiguous 참조 명시 오류.
- **AT-10** 입력: 새 모든 resource/action을 serialize→새프로세스 load→edit. 기대: 등록/스키마 검증·trace·inspection 일치, DOM/function/cache 유입 없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/schema-migration.test.js`
- `test/contracts/schema-migration.test.js`

~~~sh
node scripts/run-tests.js unit unit/schema-migration.test.js
node scripts/run-tests.js contracts contracts/schema-migration.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-010 복수 subpath validator와 path builder

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-04. 선행 단계 STEP-009. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geometry-design](roadmap/contracts/geometry-design.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/grammar/schemas/concreteGraphic.js`
- `src/grammar/schemas/graphicBounds.js`
- `src/grammar/schemas/graphicClip.js`
- `src/renderers/canvas/path.js`
- `src/renderers/svgSerialization.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/pathGeometry.js` — Subpath bounds, cubic flattening, winding and segment distance.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. M/L/C/Z state machine을 구현한다.
2. fillRule과 compound clip schema를 공통 validator에 추가한다.
3. per-path command limit와 empty/closed/open subpath를 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

hole fixture 면적84, island 포함88; invalid command 위치 진단. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

white polygon으로 hole 덮기 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-09. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-11** 입력: outer ring+hole+islands와 nonzero/evenodd를 모든 renderer로 출력. 기대: 구멍이 실제 비어 있음; transparency/overlay에서도 topology 동일.
- **AT-12** 입력: open/closed curved path, clipping, bounds, invalid commands. 기대: 정확한 stroke/fill/bounds, finite geometry, canonical 변환 오차 한계 검증.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/compound-path.test.js`
- `test/contracts/compound-path.test.js`
- `test/charts/compound-path/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/compound-path.test.js
node scripts/run-tests.js contracts contracts/compound-path.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-011 Bounds flatten stroke와 clip kernel

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-04. 선행 단계 STEP-010. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geometry-design](roadmap/contracts/geometry-design.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/grammar/schemas/concreteGraphic.js`
- `src/grammar/schemas/graphicBounds.js`
- `src/grammar/schemas/graphicClip.js`
- `src/renderers/canvas/path.js`
- `src/renderers/svgSerialization.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/pathGeometry.js` — Subpath bounds, cubic flattening, winding and segment distance.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. cubic derivative extrema를 정확 평가한다.
2. adaptive de Casteljau flatten과 arc-to-cubic을 구현한다.
3. winding/evenodd 및 segment distance에 쓰일 공통 geometry 결과를 만든다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

cubic y최대7.5; rotated/clipped occupied bounds가 실제 ink 포함. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

endpoint만 bounds·curve 샘플 수 임의 고정 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-10. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-12** 입력: open/closed curved path, clipping, bounds, invalid commands. 기대: 정확한 stroke/fill/bounds, finite geometry, canonical 변환 오차 한계 검증.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/geometry-math.test.js`
- `test/contracts/geometry-math.test.js`
- `test/charts/geometry-math/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/geometry-math.test.js
node scripts/run-tests.js contracts contracts/geometry-math.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-012 모든 renderer와 scene의 복합 path

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-04. 선행 단계 STEP-011. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geometry-design](roadmap/contracts/geometry-design.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/grammar/schemas/concreteGraphic.js`
- `src/grammar/schemas/graphicBounds.js`
- `src/grammar/schemas/graphicClip.js`
- `src/renderers/canvas/path.js`
- `src/renderers/svgSerialization.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/pathGeometry.js` — Subpath bounds, cubic flattening, winding and segment distance.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. Canvas/SVG/native PNG/PDF의 path/fill/clip을 확장한다.
2. primitive editing·scene serialization·persistence를 연결한다.
3. transparent overlay hole과 open stroke를 같은 run에서 비교한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

4formats의 hole topology 동일; unsupported fill 무음대체0. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

한 backend 성공을 전체 지원으로 집계 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-09. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-11** 입력: outer ring+hole+islands와 nonzero/evenodd를 모든 renderer로 출력. 기대: 구멍이 실제 비어 있음; transparency/overlay에서도 topology 동일.
- **AT-12** 입력: open/closed curved path, clipping, bounds, invalid commands. 기대: 정확한 stroke/fill/bounds, finite geometry, canonical 변환 오차 한계 검증.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/compound-render.test.js`
- `test/contracts/compound-render.test.js`
- `test/charts/compound-render/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/compound-render.test.js
node scripts/run-tests.js contracts contracts/compound-render.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-013 안전한 AST와 typed function registry

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-06. 선행 단계 STEP-009. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 data-statistics](roadmap/contracts/data-statistics.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/computed.js`
- `src/grammar/transforms.js`
- `src/grammar/datasetSchema.js`
- `src/actions/data/index.js`
- `src/actions/encodings/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/expressionFunctions.js` — Closed typed pure function registry.
- `src/grammar/conditionalEncoding.js` — Ordered condition normalization/evaluation.
- `src/resources/resolveData.js` — CSV/JSON source resolver and input hashes.
- `src/grammar/dataDependencies.js` — Parameter/transform DAG and cycle validation.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. 기존 computed AST를 inventory한 뒤 compatible 확장을 설계한다.
2. closed node/function schema와 null/short-circuit/date 규칙을 구현한다.
3. depth/node budget과 parameter ref extraction 및 CSV/JSON resolver/field-path 계약을 추가한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

if의 미선택 divide-by-zero branch 미평가; unknown function error. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

eval/global/getter 실행 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-16** 입력: ggaction expression AST/function과 null/date/string 경계. 기대: 자체 타입·오류·수치 계약 일치, eval/global access 없음; 외부 DSL 번역 제외.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/expression-ast.test.js`
- `test/contracts/expression-ast.test.js`

~~~sh
node scripts/run-tests.js unit unit/expression-ast.test.js
node scripts/run-tests.js contracts contracts/expression-ast.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-014 통계와 pivot LOESS 경계 보강

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-06. 선행 단계 STEP-013. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 data-statistics](roadmap/contracts/data-statistics.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/computed.js`
- `src/grammar/transforms.js`
- `src/grammar/datasetSchema.js`
- `src/actions/data/index.js`
- `src/actions/encodings/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/expressionFunctions.js` — Closed typed pure function registry.
- `src/grammar/conditionalEncoding.js` — Ordered condition normalization/evaluation.
- `src/resources/resolveData.js` — CSV/JSON source resolver and input hashes.
- `src/grammar/dataDependencies.js` — Parameter/transform DAG and cycle validation.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. 현재 stats의 옵션/출력/lineage matrix를 만든다.
2. 독립 summary/quantile/bin/window/regression/KDE fixtures를 추가한다.
3. pivot duplicate/LOESS singular/weight/empty 정책을 구현한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

명시 linear q25=1.75, variance1, Gaussian f0=.3989422804014327. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

기존 default를 test에 맞게 바꾸기 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-16, OR-17, OR-18. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-17** 입력: 모든 transform과 stats의 numeric fixtures. 기대: 독립 수식·불변식 일치; pivot/loess/bin/window/timezone/DST 포함.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/statistics-oracles.test.js`
- `test/contracts/statistics-oracles.test.js`

~~~sh
node scripts/run-tests.js unit unit/statistics-oracles.test.js
node scripts/run-tests.js contracts contracts/statistics-oracles.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-015 Timezone과 calendar용 날짜 grain

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-06. 선행 단계 STEP-014. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 data-statistics](roadmap/contracts/data-statistics.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/computed.js`
- `src/grammar/transforms.js`
- `src/grammar/datasetSchema.js`
- `src/actions/data/index.js`
- `src/actions/encodings/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/expressionFunctions.js` — Closed typed pure function registry.
- `src/grammar/conditionalEncoding.js` — Ordered condition normalization/evaluation.
- `src/resources/resolveData.js` — CSV/JSON source resolver and input hashes.
- `src/grammar/dataDependencies.js` — Parameter/transform DAG and cycle validation.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. civil day/timeUnit의 timezone을 명시한다.
2. DST/윤년/연말/weekStart fixtures를 작성한다.
3. date aggregate와 missing date completion을 lineage에 연결한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

2024년366 civil days; DST날 한 cell. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

날짜 증가를 고정24h ms로 구현 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-19. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-17** 입력: 모든 transform과 stats의 numeric fixtures. 기대: 독립 수식·불변식 일치; pivot/loess/bin/window/timezone/DST 포함.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/time-transform.test.js`
- `test/contracts/time-transform.test.js`

~~~sh
node scripts/run-tests.js unit unit/time-transform.test.js
node scripts/run-tests.js contracts contracts/time-transform.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-016 Parameter와 조건부 encoding invalidation

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-06. 선행 단계 STEP-015. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 data-statistics](roadmap/contracts/data-statistics.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/computed.js`
- `src/grammar/transforms.js`
- `src/grammar/datasetSchema.js`
- `src/actions/data/index.js`
- `src/actions/encodings/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/expressionFunctions.js` — Closed typed pure function registry.
- `src/grammar/conditionalEncoding.js` — Ordered condition normalization/evaluation.
- `src/resources/resolveData.js` — CSV/JSON source resolver and input hashes.
- `src/grammar/dataDependencies.js` — Parameter/transform DAG and cycle validation.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. first-match condition AST와 otherwise schema를 구현한다.
2. parameter→filter→stats→scale→mark/guide closure를 계산한다.
3. inactive branch type validation과 cycle rejection을 추가한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

모든 condition branch 실행 fixture; empty filter domain 갱신. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

opacity0 falsy 누락·stale domain 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-18** 입력: parameter→filter→aggregate→scale→조건부 encoding 연쇄. 기대: 정확한 dependency invalidation; cycle 오류; 모든 condition branch 실행.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/conditional-dataflow.test.js`
- `test/contracts/conditional-dataflow.test.js`

~~~sh
node scripts/run-tests.js unit unit/conditional-dataflow.test.js
node scripts/run-tests.js contracts contracts/conditional-dataflow.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-017 7가지 pattern과 gradient

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-05. 선행 단계 STEP-009、STEP-012. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geometry-design](roadmap/contracts/geometry-design.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/paint.js`
- `src/core/textMetrics.js`
- `src/core/textMetricProfile.js`
- `src/renderers/text.js`
- `src/actions/textMetrics/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/resources/resolveAssets.js` — Host-injected async resolver; no renderer fetch.
- `src/grammar/patterns.js` — Shared vector tile geometry.
- `src/actions/assets/index.js` — Wrapped asset resource actions.
- `src/materialization/image.js` — Image fit/clip/appearance realization.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. canonical tile geometry 및 coordinate-space/phase를 구현한다.
2. radial gradient/stop validation과 shadow/halo/outline/blend 지원표를 추가한다.
3. SVG/Canvas/PNG/PDF vector lowering과 alpha를 맞춘다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

7pattern×4backend, clip/phase/opacity 동일. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

solid fill fallback·alpha 두 번 곱하기 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-13** 입력: 7texture와 요구 gradient/alpha를 SVG/Canvas/PNG/PDF에 출력. 기대: pitch/phase/색/투명도/clip 일치, 지원 안 하는 paint 무음 대체 0.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/paint-resources.test.js`
- `test/contracts/paint-resources.test.js`
- `test/charts/paint-resources/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/paint-resources.test.js
node scripts/run-tests.js contracts contracts/paint-resources.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-018 이미지 resolver와 offline 자원

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-05. 선행 단계 STEP-017. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geometry-design](roadmap/contracts/geometry-design.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/paint.js`
- `src/core/textMetrics.js`
- `src/core/textMetricProfile.js`
- `src/renderers/text.js`
- `src/actions/textMetrics/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/resources/resolveAssets.js` — Host-injected async resolver; no renderer fetch.
- `src/grammar/patterns.js` — Shared vector tile geometry.
- `src/actions/assets/index.js` — Wrapped asset resource actions.
- `src/materialization/image.js` — Image fit/clip/appearance realization.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. hash/MIME/byte budget/abort를 가진 host resolver를 만든다.
2. image fit/align/clip을 materialize한다.
3. bundle payload와 export preflight를 연결한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

200×100 contain→100×50 y25; abort 뒤 callback0. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

renderer fetch·URI만 저장하고 offline-ready 주장 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-15. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-04** 입력: native data/font/map/image resource offline replay. 기대: 자원 hash·binding·오류·abort 정확; source dialect/번역 의무 없음.
- **AT-14** 입력: native image asset와 load failure/CORS/abort/export. 기대: fit/aspect/clip·사전 진단·dispose 뒤 callback 없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/image-resolver.test.js`
- `test/contracts/image-resolver.test.js`
- `test/charts/image-resolver/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/image-resolver.test.js
node scripts/run-tests.js contracts contracts/image-resolver.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-019 Font identity와 text rematerialization

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-05. 선행 단계 STEP-018. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geometry-design](roadmap/contracts/geometry-design.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/paint.js`
- `src/core/textMetrics.js`
- `src/core/textMetricProfile.js`
- `src/renderers/text.js`
- `src/actions/textMetrics/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/resources/resolveAssets.js` — Host-injected async resolver; no renderer fetch.
- `src/grammar/patterns.js` — Shared vector tile geometry.
- `src/actions/assets/index.js` — Wrapped asset resource actions.
- `src/materialization/image.js` — Image fit/clip/appearance realization.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. font bytes hash와 metric provider를 고정한다.
2. load completion에 dependency closure를 실행한다.
3. 한글/emoji/combining/long labels의 line origins를 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

실제 render font와 측정 font 일치; late font stale layout0. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

renderer 재wrap·host font로 oracle 대체 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-04** 입력: native data/font/map/image resource offline replay. 기대: 자원 hash·binding·오류·abort 정확; source dialect/번역 의무 없음.
- **AT-15** 입력: 고정font+fallback+한글+긴label+font load delay. 기대: 실제 font hash 측정과 render 일치, stale layout 없음, line break/origin 검증.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/font-metrics.test.js`
- `test/contracts/font-metrics.test.js`
- `test/charts/font-metrics/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/font-metrics.test.js
node scripts/run-tests.js contracts contracts/font-metrics.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-020 Hierarchy tree와 treemap

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-08. 선행 단계 STEP-006、STEP-012、STEP-016. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 structure-recipes](roadmap/contracts/structure-recipes.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 data-statistics](roadmap/contracts/data-statistics.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/data/index.js`
- `src/grammar/transforms.js`
- `src/actions/charts/index.js`
- `src/materialization/marks/capabilities.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/hierarchy/normalize.js` — Flat/nested/group-path common hierarchy.
- `src/grammar/hierarchy/tree.js` — Tidy tree contour kernel.
- `src/grammar/hierarchy/treemap.js` — Slice-dice and squarify.
- `src/grammar/graph/layout.js` — Fixed/circular/seeded force node placement.
- `src/grammar/flow/layout.js` — DAG and SCC cyclic flow.
- `src/grammar/contour.js` — Grid marching squares and ring topology.
- `src/grammar/calendar.js` — Civil day to cell mapping.
- `src/actions/layouts/index.js` — Wrapped layout resource facade.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. 공통 hierarchy validator를 구축하고 partition과 공유한다.
2. tidy tree contour separation과 radial adapter를 구현한다.
3. slice-dice/squarify의 containment/area를 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

cycle/orphan error; child area 합·node key 보존. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

tree와partition에 다른 hierarchy parser 중복 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-22** 입력: hierarchy/tree/treemap의 단일/다층/빈/잘못된 구조. 기대: cycle/orphan·containment·stable ID; 통합 partition은 AT-62~65.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/hierarchy-layouts.test.js`
- `test/contracts/hierarchy-layouts.test.js`
- `test/charts/hierarchy-layouts/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/hierarchy-layouts.test.js
node scripts/run-tests.js contracts contracts/hierarchy-layouts.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-021 Observed graph와 fixed circular force 배치

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-08. 선행 단계 STEP-020. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 structure-recipes](roadmap/contracts/structure-recipes.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 data-statistics](roadmap/contracts/data-statistics.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/data/index.js`
- `src/grammar/transforms.js`
- `src/actions/charts/index.js`
- `src/materialization/marks/capabilities.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/hierarchy/normalize.js` — Flat/nested/group-path common hierarchy.
- `src/grammar/hierarchy/tree.js` — Tidy tree contour kernel.
- `src/grammar/hierarchy/treemap.js` — Slice-dice and squarify.
- `src/grammar/graph/layout.js` — Fixed/circular/seeded force node placement.
- `src/grammar/flow/layout.js` — DAG and SCC cyclic flow.
- `src/grammar/contour.js` — Grid marching squares and ring topology.
- `src/grammar/calendar.js` — Civil day to cell mapping.
- `src/actions/layouts/index.js` — Wrapped layout resource facade.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. GraphResource node/edge validation을 구현한다.
2. fixed/circular와 seeded fixed-iteration force kernel을 만든다.
3. component packing과 pinned node를 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

same seed→same layout; fixed node 부동; adjacency 불변. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

force layout으로 edge inference 실행 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-23** 입력: graph/circular/force와 Sankey DAG/cyclic/edge 경계. 기대: deterministic seed, node/link lineage·유량/폭·cycle routing·tooltip/adjacency.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/graph-layouts.test.js`
- `test/contracts/graph-layouts.test.js`
- `test/charts/graph-layouts/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/graph-layouts.test.js
node scripts/run-tests.js contracts contracts/graph-layouts.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-022 Sankey DAG와 cyclic routing

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-08. 선행 단계 STEP-021. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 structure-recipes](roadmap/contracts/structure-recipes.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 data-statistics](roadmap/contracts/data-statistics.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/data/index.js`
- `src/grammar/transforms.js`
- `src/actions/charts/index.js`
- `src/materialization/marks/capabilities.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/hierarchy/normalize.js` — Flat/nested/group-path common hierarchy.
- `src/grammar/hierarchy/tree.js` — Tidy tree contour kernel.
- `src/grammar/hierarchy/treemap.js` — Slice-dice and squarify.
- `src/grammar/graph/layout.js` — Fixed/circular/seeded force node placement.
- `src/grammar/flow/layout.js` — DAG and SCC cyclic flow.
- `src/grammar/contour.js` — Grid marching squares and ring topology.
- `src/grammar/calendar.js` — Civil day to cell mapping.
- `src/actions/layouts/index.js` — Wrapped layout resource facade.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. flow value/imbalance와 column thickness를 계산한다.
2. DAG rank와 fixed-iteration overlap solve를 구현한다.
3. SCC condensation/feedback/self-loop lanes를 구현한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

edge width=value×공통k; cyclic edge 삭제0. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

cycle를 잘라 DAG로 위장 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-23** 입력: graph/circular/force와 Sankey DAG/cyclic/edge 경계. 기대: deterministic seed, node/link lineage·유량/폭·cycle routing·tooltip/adjacency.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/flow-layouts.test.js`
- `test/contracts/flow-layouts.test.js`
- `test/charts/flow-layouts/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/flow-layouts.test.js
node scripts/run-tests.js contracts contracts/flow-layouts.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-023 Grid contour와 density contour

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-08. 선행 단계 STEP-022. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 structure-recipes](roadmap/contracts/structure-recipes.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 data-statistics](roadmap/contracts/data-statistics.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/data/index.js`
- `src/grammar/transforms.js`
- `src/actions/charts/index.js`
- `src/materialization/marks/capabilities.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/hierarchy/normalize.js` — Flat/nested/group-path common hierarchy.
- `src/grammar/hierarchy/tree.js` — Tidy tree contour kernel.
- `src/grammar/hierarchy/treemap.js` — Slice-dice and squarify.
- `src/grammar/graph/layout.js` — Fixed/circular/seeded force node placement.
- `src/grammar/flow/layout.js` — DAG and SCC cyclic flow.
- `src/grammar/contour.js` — Grid marching squares and ring topology.
- `src/grammar/calendar.js` — Civil day to cell mapping.
- `src/actions/layouts/index.js` — Wrapped layout resource facade.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. regular grid/threshold contract를 구현한다.
2. marching squares saddle decider와 stitch/hole classification을 만든다.
3. point-density를 동일 grid 입력으로 낮춘다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

saddle/hole/island/empty topology independent fixture 일치. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

disconnected ring 연결·heatmap으로 contour 대체 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-24** 입력: native histogram/KDE contour의 saddle/hole/disconnected/empty. 기대: 선택한 estimator/bin/threshold 계약과 독립 수치·topology oracle 일치.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/contour-layouts.test.js`
- `test/contracts/contour-layouts.test.js`
- `test/charts/contour-layouts/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/contour-layouts.test.js
node scripts/run-tests.js contracts contracts/contour-layouts.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-024 Calendar cell과 month boundary

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-08. 선행 단계 STEP-023. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 structure-recipes](roadmap/contracts/structure-recipes.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 data-statistics](roadmap/contracts/data-statistics.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/data/index.js`
- `src/grammar/transforms.js`
- `src/actions/charts/index.js`
- `src/materialization/marks/capabilities.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/hierarchy/normalize.js` — Flat/nested/group-path common hierarchy.
- `src/grammar/hierarchy/tree.js` — Tidy tree contour kernel.
- `src/grammar/hierarchy/treemap.js` — Slice-dice and squarify.
- `src/grammar/graph/layout.js` — Fixed/circular/seeded force node placement.
- `src/grammar/flow/layout.js` — DAG and SCC cyclic flow.
- `src/grammar/contour.js` — Grid marching squares and ring topology.
- `src/grammar/calendar.js` — Civil day to cell mapping.
- `src/actions/layouts/index.js` — Wrapped layout resource facade.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. civil-day data를 week/day cells로 배치한다.
2. month outline/labels와 missing date 정책을 구현한다.
3. reorder/resize/selection lineage를 연결한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

윤년/연말/DST/weekStart cell mapping 정확. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

date label 문자열 기반 잘못된 정렬 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-19. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-25** 입력: calendar 윤년/연말/DST/weekStart/누락날짜. 기대: 날짜→cell mapping과 month boundary, timezone/aggregation 정확.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/calendar-layout.test.js`
- `test/contracts/calendar-layout.test.js`
- `test/charts/calendar-layout/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/calendar-layout.test.js
node scripts/run-tests.js contracts contracts/calendar-layout.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-025 공통 hierarchy value mode

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-22. 선행 단계 STEP-006、STEP-009、STEP-012、STEP-016. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/charts/index.js`
- `src/actions/marks/arc/index.js`
- `src/actions/marks/rect/index.js`
- `src/grammar/pathCommands.js`
- `src/materialization/selection/policies/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/hierarchy/partition.js` — Normalized intervals and values.
- `src/actions/hierarchy/index.js` — Hierarchy/partition resource and focus actions.
- `src/materialization/partition.js` — Shared Cartesian/polar mark owner.
- `src/materialization/selection/items/partition.js` — Node-grain selection adapter.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. leaf-sum/inclusive/own-plus-children을 normalize한다.
2. residual/forest/zero-total/deep tree를 반복 DFS로 계산한다.
3. resolved order와 node key를 저장한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

root10/A6/B4; inclusive child합 초과 error. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

internal value 이중합산·residual fake child 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-02. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-63** 입력: partition 수치 fixture와 zero/internal value/forest/cycle. 기대: 독립 기대 interval·합·containment; 잘못된 구조 명시 오류.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/partition-values.test.js`
- `test/contracts/partition-values.test.js`
- `test/charts/partition-values/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/partition-values.test.js
node scripts/run-tests.js contracts contracts/partition-values.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-026 Normalized partition 구간

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-22. 선행 단계 STEP-025. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/charts/index.js`
- `src/actions/marks/arc/index.js`
- `src/actions/marks/rect/index.js`
- `src/grammar/pathCommands.js`
- `src/materialization/selection/policies/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/hierarchy/partition.js` — Normalized intervals and values.
- `src/actions/hierarchy/index.js` — Hierarchy/partition resource and focus actions.
- `src/materialization/partition.js` — Shared Cartesian/polar mark owner.
- `src/materialization/selection/items/partition.js` — Node-grain selection adapter.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. prefix weight로 u0/u1/depth를 계산한다.
2. compensated sum과 last endpoint 보정을 적용한다.
3. layoutHierarchy partition result와 inspect를 연결한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

A[0,.6],A1[0,.2],A2[.2,.6],B[.6,1]. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

padding을 normalized 데이터에 섞기 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-02. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-62** 입력: 동일 hierarchy에서 Icicle/Sunburst 생성. 기대: 같은 normalized partition/node ID, value·순서·선택 동등.
- **AT-63** 입력: partition 수치 fixture와 zero/internal value/forest/cycle. 기대: 독립 기대 interval·합·containment; 잘못된 구조 명시 오류.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/partition-intervals.test.js`
- `test/contracts/partition-intervals.test.js`
- `test/charts/partition-intervals/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/partition-intervals.test.js
node scripts/run-tests.js contracts contracts/partition-intervals.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-027 Icicle와 Sunburst materializer

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-22. 선행 단계 STEP-026. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/charts/index.js`
- `src/actions/marks/arc/index.js`
- `src/actions/marks/rect/index.js`
- `src/grammar/pathCommands.js`
- `src/materialization/selection/policies/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/hierarchy/partition.js` — Normalized intervals and values.
- `src/actions/hierarchy/index.js` — Hierarchy/partition resource and focus actions.
- `src/materialization/partition.js` — Shared Cartesian/polar mark owner.
- `src/materialization/selection/items/partition.js` — Node-grain selection adapter.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. Cartesian orientation과 polar radius policy를 구현한다.
2. rootVisible/padding/tiny wedge/label을 처리한다.
3. 공통 partition owner를 selection/highlight/scene에 등록한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

동일 node/value/순서; width600와 angle1.2π. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

두 chart 별도 집계·selection 구현 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-02, OR-04. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-62** 입력: 동일 hierarchy에서 Icicle/Sunburst 생성. 기대: 같은 normalized partition/node ID, value·순서·선택 동등.
- **AT-64** 입력: partition orientation/padding/rootVisible/deep tree/작은 wedge. 기대: finite geometry·clip·label·hit 일치; radial area 의미 명시.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/partition-marks.test.js`
- `test/contracts/partition-marks.test.js`
- `test/charts/partition-marks/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/partition-marks.test.js
node scripts/run-tests.js contracts contracts/partition-marks.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-028 Focus breadcrumb와 bend 준비

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-22. 선행 단계 STEP-027. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/charts/index.js`
- `src/actions/marks/arc/index.js`
- `src/actions/marks/rect/index.js`
- `src/grammar/pathCommands.js`
- `src/materialization/selection/policies/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/hierarchy/partition.js` — Normalized intervals and values.
- `src/actions/hierarchy/index.js` — Hierarchy/partition resource and focus actions.
- `src/materialization/partition.js` — Shared Cartesian/polar mark owner.
- `src/materialization/selection/items/partition.js` — Node-grain selection adapter.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. focus view interval과 nearest surviving ancestor를 구현한다.
2. keyboard navigation metadata와 selected key를 보존한다.
3. bend kernel의 b0/b1 reference geometry를 작성한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

focus A 후 A1 구간[0,1/3]; endpoint와현재hit 통합 의무 기록. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

focus 시 원 hierarchy 파괴 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-03. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-65** 입력: partition focus/filter/breadcrumb/keyboard/coordinate morph. 기대: 같은 node 선택 유지, 각 frame hit 정확, bend endpoint와 reduced motion.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/partition-navigation.test.js`
- `test/contracts/partition-navigation.test.js`
- `test/charts/partition-navigation/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/partition-navigation.test.js
node scripts/run-tests.js contracts contracts/partition-navigation.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-029 Metric preprocessing과 stable edge key

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-24. 선행 단계 STEP-006、STEP-009、STEP-016. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/data/index.js`
- `src/grammar/datasetSchema.js`
- `src/core/datasetReferences.js`
- `src/actions/data/revise.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/graph/normalize.js` — Observed/inferred common graph shape.
- `src/grammar/graph/metrics.js` — Typed metrics and preprocessing.
- `src/grammar/graph/inference.js` — Six rule dispatch and provenance.
- `src/grammar/graph/search.js` — Exact acceleration and opt-in approximate search.
- `src/actions/graphs/index.js` — Wrapped graph data/inference actions.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. typed feature extraction과 standardize/minmax를 구현한다.
2. Euclidean/Manhattan/cosine/Jaccard/great-circle을 검증한다.
3. ruleId 기반 edge key와 source revision provenance를 저장한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

zero vector/empty Jaccard/geo meter/null 계약 일치. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

추론 관계를 observed로 기록 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-07. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-71** 입력: radius/similarity/metric/preprocessing 경계. 기대: inclusive radius, cosine zero/Jaccard empty/geo units/null 정책과 provenance.
- **AT-74** 입력: data revise/k change/layout drag/resize와 graph selection. 기대: topology invalidation 이유 정확, node/edge ID 및 observed/inferred 보존.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/graph-metrics.test.js`
- `test/contracts/graph-metrics.test.js`

~~~sh
node scripts/run-tests.js unit unit/graph-metrics.test.js
node scripts/run-tests.js contracts contracts/graph-metrics.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-030 kNN radius similarity exact rules

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-24. 선행 단계 STEP-029. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/data/index.js`
- `src/grammar/datasetSchema.js`
- `src/core/datasetReferences.js`
- `src/actions/data/revise.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/graph/normalize.js` — Observed/inferred common graph shape.
- `src/grammar/graph/metrics.js` — Typed metrics and preprocessing.
- `src/grammar/graph/inference.js` — Six rule dispatch and provenance.
- `src/grammar/graph/search.js` — Exact acceleration and opt-in approximate search.
- `src/actions/graphs/index.js` — Wrapped graph data/inference actions.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. brute-force distance reference를 작성한다.
2. directed/union/mutual kNN과 inclusive threshold를 구현한다.
3. ties/duplicate points/zero edges/n≤1 정책을 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

k1 fixture directed4/union3/mutual1, radius2 edges2. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

k silent clamp·distance0 edge 제거 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-05, OR-06. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-70** 입력: kNN directed/union/mutual와 ties·duplicate points. 기대: 수작업 fixture edge 일치, stable ID tie, 0거리 edge 유지.
- **AT-71** 입력: radius/similarity/metric/preprocessing 경계. 기대: inclusive radius, cosine zero/Jaccard empty/geo units/null 정책과 provenance.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/graph-neighbors.test.js`
- `test/contracts/graph-neighbors.test.js`

~~~sh
node scripts/run-tests.js unit unit/graph-neighbors.test.js
node scripts/run-tests.js contracts contracts/graph-neighbors.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-031 MST forest group sequence

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-24. 선행 단계 STEP-030. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/data/index.js`
- `src/grammar/datasetSchema.js`
- `src/core/datasetReferences.js`
- `src/actions/data/revise.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/graph/normalize.js` — Observed/inferred common graph shape.
- `src/grammar/graph/metrics.js` — Typed metrics and preprocessing.
- `src/grammar/graph/inference.js` — Six rule dispatch and provenance.
- `src/grammar/graph/search.js` — Exact acceleration and opt-in approximate search.
- `src/actions/graphs/index.js` — Wrapped graph data/inference actions.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. deterministic Kruskal과 candidate graph connectivity를 구현한다.
2. clique/star의 예산과 hub validation을 구현한다.
3. grouped sequence lag/tie/maxGap을 구현한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

MST cost10; disconnected는 explicit forest만 허용. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

원래 없는 edge를 group 경계 넘어 생성 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-08. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-72** 입력: MST/forest/group/sequence rule. 기대: 독립 Kruskal 결과, component 수·비용, group 경계·lag·edge budget.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/graph-rules.test.js`
- `test/contracts/graph-rules.test.js`

~~~sh
node scripts/run-tests.js unit unit/graph-rules.test.js
node scripts/run-tests.js contracts contracts/graph-rules.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-032 Exact accelerator approximate와 수정 연결

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-24. 선행 단계 STEP-031. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/data/index.js`
- `src/grammar/datasetSchema.js`
- `src/core/datasetReferences.js`
- `src/actions/data/revise.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/graph/normalize.js` — Observed/inferred common graph shape.
- `src/grammar/graph/metrics.js` — Typed metrics and preprocessing.
- `src/grammar/graph/inference.js` — Six rule dispatch and provenance.
- `src/grammar/graph/search.js` — Exact acceleration and opt-in approximate search.
- `src/actions/graphs/index.js` — Wrapped graph data/inference actions.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. KD/grid 결과를 brute-force와 전수 비교한다.
2. opt-in seeded approximate 후보+exact rerank와 recall evidence를 만든다.
3. data/k/layout/resize의 invalidation을 분리한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

exact equality; approximate recall 기준·seed 명시; drag topology 유지. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

무음 approximate/sampling·unknown recall pass 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-73** 입력: exact accelerator와 opt-in approximate search. 기대: brute-force exact 일치, approximate seed/recall 기록, 무음 sampling0.
- **AT-74** 입력: data revise/k change/layout drag/resize와 graph selection. 기대: topology invalidation 이유 정확, node/edge ID 및 observed/inferred 보존.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/graph-search-revision.test.js`
- `test/contracts/graph-search-revision.test.js`

~~~sh
node scripts/run-tests.js unit unit/graph-search-revision.test.js
node scripts/run-tests.js contracts contracts/graph-search-revision.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-033 Native theme과 property provenance

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-07. 선행 단계 STEP-009、STEP-019. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geometry-design](roadmap/contracts/geometry-design.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/theme/defaults.js`
- `src/actions/theme/index.js`
- `src/materialization/layout.js`
- `src/materialization/composition.js`
- `src/materialization/facets.js`
- `src/materialization/compositionSnapshot.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/layout/responsivePolicy.js` — Declared responsive fallback and bounded layout solve.
- `src/theme/provenance.js` — Resolved property origin; reuse existing theme actions.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. theme closed schema와 defaults precedence를 구현한다.
2. false/0/omission/reset 규칙을 기존 action과 맞춘다.
3. paint-only와 text-layout invalidation을 분리한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

explicit override 우선; winning source inspect 가능. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

외부 theme 복제·색편집에 topology 재계산 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-19** 입력: ggaction theme token schema·override/null/false/0. 기대: 자체 precedence와 provenance·typography·paint·guide 일치; 외부14theme 복제 불필요.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/theme-precedence.test.js`
- `test/contracts/theme-precedence.test.js`
- `test/charts/theme-precedence/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/theme-precedence.test.js
node scripts/run-tests.js contracts contracts/theme-precedence.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-034 Guide와 responsive layout solve

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-07. 선행 단계 STEP-033. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geometry-design](roadmap/contracts/geometry-design.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/theme/defaults.js`
- `src/actions/theme/index.js`
- `src/materialization/layout.js`
- `src/materialization/composition.js`
- `src/materialization/facets.js`
- `src/materialization/compositionSnapshot.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/layout/responsivePolicy.js` — Declared responsive fallback and bounded layout solve.
- `src/theme/provenance.js` — Resolved property origin; reuse existing theme actions.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. text/guide/reserved-lane/plot 순서의 solve를 만든다.
2. bounded fixed point와 layout-unsatisfied를 구현한다.
3. Canvas edit와 layout resource edit의 동등성을 시험한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

fixed dimensions 유지; 4회 미수렴 error. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

Canvas 자동확대·font 몰래축소 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-20** 입력: unit/layer/facet/concat/repeat와 허용 scale/guide scope. 기대: frame별 Y 하나; 분리된 facet 독립 scale 허용, bounds와 responsive 정렬.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/layout-solver.test.js`
- `test/contracts/layout-solver.test.js`
- `test/charts/layout-solver/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/layout-solver.test.js
node scripts/run-tests.js contracts contracts/layout-solver.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-035 Nested facet와 shared guide 정렬

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-07. 선행 단계 STEP-034. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geometry-design](roadmap/contracts/geometry-design.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/theme/defaults.js`
- `src/actions/theme/index.js`
- `src/materialization/layout.js`
- `src/materialization/composition.js`
- `src/materialization/facets.js`
- `src/materialization/compositionSnapshot.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/layout/responsivePolicy.js` — Declared responsive fallback and bounded layout solve.
- `src/theme/provenance.js` — Resolved property origin; reuse existing theme actions.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. occupied topology와 full child bounds를 합성한다.
2. ragged rows/header/footer/legend/title 충돌을 검사한다.
3. resize/font-load/revise 후 ancestor snapshots를 갱신한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

3행 long-label fixture plot/header/footer 정렬. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

mark-only bounds·child root Canvas만 resize 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-20** 입력: unit/layer/facet/concat/repeat와 허용 scale/guide scope. 기대: frame별 Y 하나; 분리된 facet 독립 scale 허용, bounds와 responsive 정렬.
- **AT-21** 입력: nested facet·3행 full-bounds·긴label·resize 합성 fixture. 기대: 공통 header/plot/footer 정렬과 text metrics 정확; corpus source ID 재현 의무 없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/nested-composition.test.js`
- `test/contracts/nested-composition.test.js`
- `test/charts/nested-composition/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/nested-composition.test.js
node scripts/run-tests.js contracts contracts/nested-composition.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-036 Edge route 공통 kernel과 budget

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-25. 선행 단계 STEP-012、STEP-024、STEP-028、STEP-032. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 edge-bundling](roadmap/contracts/edge-bundling.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/actions/marks/line/materialize.js`
- `src/scene.js`
- `src/inspection.js`
- `src/materialization/selection/items/path.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/graph/routes/common.js` — Route normalization, endpoints, budgets and resampling.
- `src/grammar/graph/routes/hierarchical.js` — LCA and clamped B-spline.
- `src/grammar/graph/routes/forceDirected.js` — FDEB compatibility and double-buffer solver.
- `src/grammar/graph/routes/density.js` — KDE field and vector advection.
- `src/grammar/graph/routes/edgePath.js` — Dijkstra skip/lock and stretch.
- `src/graph.js` — Browser-safe async preparation entry.
- `src/materialization/graphs.js` — Graph nodes/edges and route consumer.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. route schema/normalization/endpoint invariant를 구현한다.
2. input immutability/typed key/sync prepared result를 검증한다.
3. candidate/sample budget와 abort boundary를 추가한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

edge count/key/direction/weight/adjacency/node positions 동일. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

incomplete preview를 canonical route로 저장 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-75** 입력: 네 bundling 방법 공통 입력 불변성. 기대: graph/adjacency/node position 불변, edge ID/count/direction/weight·endpoint 보존.
- **AT-82** 입력: bundling sizeclass/abort/worker/cache/export. 기대: stage별 SLO·메모리, incomplete 진단, SVG/Canvas/PNG/PDF route 동등.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/route-resource.test.js`
- `test/contracts/route-resource.test.js`
- `test/charts/route-resource/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/route-resource.test.js
node scripts/run-tests.js contracts contracts/route-resource.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-037 Hierarchy path와 B-spline bundling

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-25. 선행 단계 STEP-036. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 edge-bundling](roadmap/contracts/edge-bundling.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/actions/marks/line/materialize.js`
- `src/scene.js`
- `src/inspection.js`
- `src/materialization/selection/items/path.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/graph/routes/common.js` — Route normalization, endpoints, budgets and resampling.
- `src/grammar/graph/routes/hierarchical.js` — LCA and clamped B-spline.
- `src/grammar/graph/routes/forceDirected.js` — FDEB compatibility and double-buffer solver.
- `src/grammar/graph/routes/density.js` — KDE field and vector advection.
- `src/grammar/graph/routes/edgePath.js` — Dijkstra skip/lock and stretch.
- `src/graph.js` — Browser-safe async preparation entry.
- `src/materialization/graphs.js` — Graph nodes/edges and route consumer.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. mapping/LCA/path controls를 계산한다.
2. strength straightening과 clamped spline을 구현한다.
3. missing mapping/forest/strength0/1을 시험한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

β0 straight; exact LCA path; endpoint 고정. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

비계층 평균곡선으로 HEB 대체 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-11. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-76** 입력: HEB hierarchy mapping/LCA/strength0·1/누락 endpoint. 기대: independent hierarchy path oracle, 직선 endpoint, missing mapping 진단.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/hierarchical-bundling.test.js`
- `test/contracts/hierarchical-bundling.test.js`
- `test/charts/hierarchical-bundling/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/hierarchical-bundling.test.js
node scripts/run-tests.js contracts contracts/hierarchical-bundling.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-038 FDEB compatibility와 iterative solver

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-25. 선행 단계 STEP-037. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 edge-bundling](roadmap/contracts/edge-bundling.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/actions/marks/line/materialize.js`
- `src/scene.js`
- `src/inspection.js`
- `src/materialization/selection/items/path.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/graph/routes/common.js` — Route normalization, endpoints, budgets and resampling.
- `src/grammar/graph/routes/hierarchical.js` — LCA and clamped B-spline.
- `src/grammar/graph/routes/forceDirected.js` — FDEB compatibility and double-buffer solver.
- `src/grammar/graph/routes/density.js` — KDE field and vector advection.
- `src/grammar/graph/routes/edgePath.js` — Dijkstra skip/lock and stretch.
- `src/graph.js` — Browser-safe async preparation entry.
- `src/materialization/graphs.js` — Graph nodes/edges and route consumer.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. angle/scale/position/visibility numeric oracle를 만든다.
2. subdivision/spring/attraction schedule을 구현한다.
3. double buffer·opposite direction·zero distance를 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

parallel offset.1 compatibility10/11; permutation invariant. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

in-place updates·spring constant 식 임의 변경 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-12. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-77** 입력: FDEB compatibility/subdivision/schedule/zero·opposite edges. 기대: paper reference numeric oracle, deterministic double buffer, finite 고정 endpoint.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/force-edge-bundling.test.js`
- `test/contracts/force-edge-bundling.test.js`
- `test/charts/force-edge-bundling/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/force-edge-bundling.test.js
node scripts/run-tests.js contracts contracts/force-edge-bundling.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-039 KDE field gradient와 vector advection

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-25. 선행 단계 STEP-038. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 edge-bundling](roadmap/contracts/edge-bundling.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/actions/marks/line/materialize.js`
- `src/scene.js`
- `src/inspection.js`
- `src/materialization/selection/items/path.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/graph/routes/common.js` — Route normalization, endpoints, budgets and resampling.
- `src/grammar/graph/routes/hierarchical.js` — LCA and clamped B-spline.
- `src/grammar/graph/routes/forceDirected.js` — FDEB compatibility and double-buffer solver.
- `src/grammar/graph/routes/density.js` — KDE field and vector advection.
- `src/grammar/graph/routes/edgePath.js` — Dijkstra skip/lock and stretch.
- `src/graph.js` — Browser-safe async preparation entry.
- `src/materialization/graphs.js` — Graph nodes/edges and route consumer.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. arc-length weighted splat와 compact kernel을 구현한다.
2. gradient/bilinear/advection/smoothing/resampling을 반복한다.
3. direction channels/endpoints/grid halo를 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

rho0=1,rho.5=.5625,rho1=0; vector routes 보존. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

density image만 반환·sampling 수에 따른 weight inflation 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-13. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-78** 입력: KDE grid/gradient/endpoint pin/direction/resample. 기대: density reference와 tolerance, vector route 보존, grid 밖 NaN0.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/density-bundling.test.js`
- `test/contracts/density-bundling.test.js`
- `test/charts/density-bundling/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/density-bundling.test.js
node scripts/run-tests.js contracts contracts/density-bundling.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-040 Weighted path lock와 stretch

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-25. 선행 단계 STEP-039. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 edge-bundling](roadmap/contracts/edge-bundling.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/actions/marks/line/materialize.js`
- `src/scene.js`
- `src/inspection.js`
- `src/materialization/selection/items/path.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/graph/routes/common.js` — Route normalization, endpoints, budgets and resampling.
- `src/grammar/graph/routes/hierarchical.js` — LCA and clamped B-spline.
- `src/grammar/graph/routes/forceDirected.js` — FDEB compatibility and double-buffer solver.
- `src/grammar/graph/routes/density.js` — KDE field and vector advection.
- `src/grammar/graph/routes/edgePath.js` — Dijkstra skip/lock and stretch.
- `src/graph.js` — Browser-safe async preparation entry.
- `src/materialization/graphs.js` — Graph nodes/edges and route consumer.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. length^d 우선순위와 Dijkstra tie를 구현한다.
2. skip/lock을 순서대로 적용하고 provenance path를 저장한다.
3. directed/disconnected/stretch/smoothing fallback을 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

AC→AB+BC, maxStretch1.2이면 straight; path 실제존재. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

가상 shortcut·semantic weight를 routing cost로 혼용 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-14. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-79** 입력: Edge-path connected/disconnected/directed/stretch. 기대: route provenance 실제 graph path, maxStretch 준수, fallback·locking 결정적.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/edge-path-bundling.test.js`
- `test/contracts/edge-path-bundling.test.js`
- `test/charts/edge-path-bundling/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/edge-path-bundling.test.js
node scripts/run-tests.js contracts contracts/edge-path-bundling.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-041 Bundling 선택 worker cache export 연결

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-25. 선행 단계 STEP-040. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 edge-bundling](roadmap/contracts/edge-bundling.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 graph-inference](roadmap/contracts/graph-inference.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/actions/marks/line/materialize.js`
- `src/scene.js`
- `src/inspection.js`
- `src/materialization/selection/items/path.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/graph/routes/common.js` — Route normalization, endpoints, budgets and resampling.
- `src/grammar/graph/routes/hierarchical.js` — LCA and clamped B-spline.
- `src/grammar/graph/routes/forceDirected.js` — FDEB compatibility and double-buffer solver.
- `src/grammar/graph/routes/density.js` — KDE field and vector advection.
- `src/grammar/graph/routes/edgePath.js` — Dijkstra skip/lock and stretch.
- `src/graph.js` — Browser-safe async preparation entry.
- `src/materialization/graphs.js` — Graph nodes/edges and route consumer.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. graph edge materializer와 semantic candidate metadata를 연결한다.
2. worker result revision/hash/cache keys를 구현한다.
3. 4renderer route 동등성과 추후 current-frame/geo 의무를 등록한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

overlap 원 edge 후보 보존; abort/callback leak0. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

junction node 생성·PNG route 저장 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-80** 입력: bundle 겹침/선택/unbundle/tooltip/keyboard. 기대: candidate edge 목록 정확, 가짜 junction node0, current frame hit와 accessibility.
- **AT-81** 입력: bundle animate/interrupt/seek/revise/geo date line. 기대: endpoint attachment·ID 지속, clip/backside 정확, hidden route hit0.
- **AT-82** 입력: bundling sizeclass/abort/worker/cache/export. 기대: stage별 SLO·메모리, incomplete 진단, SVG/Canvas/PNG/PDF route 동등.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/bundling-consumers.test.js`
- `test/contracts/bundling-consumers.test.js`
- `test/charts/bundling-consumers/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/bundling-consumers.test.js
node scripts/run-tests.js contracts contracts/bundling-consumers.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-042 GeoJSON TopoJSON 정규화

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-10. 선행 단계 STEP-006、STEP-012、STEP-019、STEP-035. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geo](roadmap/contracts/geo.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/actions/coordinates/actions.js`
- `src/actions/coordinates/edit.js`
- `src/selectors/coordinates.js`
- `src/renderers/svgSerialization.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/geo/normalize.js` — GeoJSON/TopoJSON canonical geometry.
- `src/grammar/geo/projections.js` — Projection registry and pure math adapter.
- `src/grammar/geo/stream.js` — Split/clip/resample/project.
- `src/grammar/geo/join.js` — Typed geometry-table join.
- `src/grammar/geo/camera.js` — Viewport and camera operations.
- `src/actions/geo/index.js` — Wrapped geo resource and mark facades.
- `src/materialization/geo.js` — Concrete geographic paths/points/lines/clip.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. 모든 geometry discriminator와 null feature를 validate한다.
2. TopoJSON delta/transform/reverse/shared arc를 decode한다.
3. feature key/raw asset hash와 source lineage를 저장한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

hole/island/collection/null identity 보존. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

ring 자동보수·다중 topo object 임의선택 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-30** 입력: GeoJSON/TopoJSON hole/dateline/pole/geometrycollection/null. 기대: ring/feature identity·clipping·join 정확; NaN path와 hidden-backside hit 없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/geometry-data.test.js`
- `test/contracts/geometry-data.test.js`
- `test/charts/geometry-data/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/geometry-data.test.js
node scripts/run-tests.js contracts contracts/geometry-data.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.
- G-GEO: public projection/camera/resource contract. 먼저 진행할 수 있는 일: pure projection reference checks.


### STEP-043 Projection registry와 forward inverse

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-10. 선행 단계 STEP-042. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geo](roadmap/contracts/geo.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/actions/coordinates/actions.js`
- `src/actions/coordinates/edit.js`
- `src/selectors/coordinates.js`
- `src/renderers/svgSerialization.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/geo/normalize.js` — GeoJSON/TopoJSON canonical geometry.
- `src/grammar/geo/projections.js` — Projection registry and pure math adapter.
- `src/grammar/geo/stream.js` — Split/clip/resample/project.
- `src/grammar/geo/join.js` — Typed geometry-table join.
- `src/grammar/geo/camera.js` — Viewport and camera operations.
- `src/actions/geo/index.js` — Wrapped geo resource and mark facades.
- `src/materialization/geo.js` — Concrete geographic paths/points/lines/clip.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. 15종 지원표와 type별 option schema를 만든다.
2. 검증된 pure dependency의 version/license를 고정한다.
3. raw numeric와 visible-domain roundtrip을 시험한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

Mercator45 y=.881373587; orthographic backside null. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

projection 이름만 등록하고 identity 반환 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-22. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-29** 입력: 자체 projection API와 native-supported projection/planar/inset. 기대: 수학 reference 및 forward/inverse/fit/clip 검증; Flint preset parity 아님.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/projection-kernels.test.js`
- `test/contracts/projection-kernels.test.js`
- `test/charts/projection-kernels/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/projection-kernels.test.js
node scripts/run-tests.js contracts contracts/projection-kernels.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.
- G-GEO: public projection/camera/resource contract. 먼저 진행할 수 있는 일: pure projection reference checks.


### STEP-044 Date line clip fit와 geo marks

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-10. 선행 단계 STEP-043. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geo](roadmap/contracts/geo.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/actions/coordinates/actions.js`
- `src/actions/coordinates/edit.js`
- `src/selectors/coordinates.js`
- `src/renderers/svgSerialization.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/geo/normalize.js` — GeoJSON/TopoJSON canonical geometry.
- `src/grammar/geo/projections.js` — Projection registry and pure math adapter.
- `src/grammar/geo/stream.js` — Split/clip/resample/project.
- `src/grammar/geo/join.js` — Typed geometry-table join.
- `src/grammar/geo/camera.js` — Viewport and camera operations.
- `src/actions/geo/index.js` — Wrapped geo resource and mark facades.
- `src/materialization/geo.js` — Concrete geographic paths/points/lines/clip.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. spherical split/clip/resample/projection/planar clip을 구현한다.
2. fit degeneracy와 shape/point/line/graticule을 materialize한다.
3. hole/antimeridian/pole의 scene/hit metadata를 만든다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

179→−179 world-span 선0; planar fit scale5 tx25. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

endpoint visibility만으로 segment drop 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-22. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-29** 입력: 자체 projection API와 native-supported projection/planar/inset. 기대: 수학 reference 및 forward/inverse/fit/clip 검증; Flint preset parity 아님.
- **AT-30** 입력: GeoJSON/TopoJSON hole/dateline/pole/geometrycollection/null. 기대: ring/feature identity·clipping·join 정확; NaN path와 hidden-backside hit 없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/geo-stream.test.js`
- `test/contracts/geo-stream.test.js`
- `test/charts/geo-stream/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/geo-stream.test.js
node scripts/run-tests.js contracts contracts/geo-stream.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.
- G-GEO: public projection/camera/resource contract. 먼저 진행할 수 있는 일: pure projection reference checks.


### STEP-045 Geometry join과 hierarchy LOD

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-10. 선행 단계 STEP-044. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geo](roadmap/contracts/geo.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/actions/coordinates/actions.js`
- `src/actions/coordinates/edit.js`
- `src/selectors/coordinates.js`
- `src/renderers/svgSerialization.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/geo/normalize.js` — GeoJSON/TopoJSON canonical geometry.
- `src/grammar/geo/projections.js` — Projection registry and pure math adapter.
- `src/grammar/geo/stream.js` — Split/clip/resample/project.
- `src/grammar/geo/join.js` — Typed geometry-table join.
- `src/grammar/geo/camera.js` — Viewport and camera operations.
- `src/actions/geo/index.js` — Wrapped geo resource and mark facades.
- `src/materialization/geo.js` — Concrete geographic paths/points/lines/clip.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. typed join duplicate/unmatched diagnostics를 구현한다.
2. shared topology simplification과 hysteresis level을 적용한다.
3. selection/annotation의 feature mapping을 보존한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

enter4.2 exit3.8 사이 level 안정; unmatched geometry 유지. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

feature name fuzzy repair·county selection을 임의state로 변경 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-31** 입력: custom geography levels와 region join, county/stateLOD. 기대: 중복/미매칭 정책, LOD hysteresis, 선택·annotation rebase, asset hash 보존.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/geo-join-lod.test.js`
- `test/contracts/geo-join-lod.test.js`
- `test/charts/geo-join-lod/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/geo-join-lod.test.js
node scripts/run-tests.js contracts contracts/geo-join-lod.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.
- G-GEO: public projection/camera/resource contract. 먼저 진행할 수 있는 일: pure projection reference checks.


### STEP-046 Camera navigation과 viewport contract

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-10. 선행 단계 STEP-045. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 geo](roadmap/contracts/geo.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/grammar/pathCommands.js`
- `src/actions/coordinates/actions.js`
- `src/actions/coordinates/edit.js`
- `src/selectors/coordinates.js`
- `src/renderers/svgSerialization.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/geo/normalize.js` — GeoJSON/TopoJSON canonical geometry.
- `src/grammar/geo/projections.js` — Projection registry and pure math adapter.
- `src/grammar/geo/stream.js` — Split/clip/resample/project.
- `src/grammar/geo/join.js` — Typed geometry-table join.
- `src/grammar/geo/camera.js` — Viewport and camera operations.
- `src/actions/geo/index.js` — Wrapped geo resource and mark facades.
- `src/materialization/geo.js` — Concrete geographic paths/points/lines/clip.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. pan/zoom/rotate/fit/reset/resize pure commands를 구현한다.
2. pointer anchor와 composite inverse를 검증한다.
3. interaction/tween용 camera state와 clipping 정보를 제공한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

zoom 전후 anchor≤.25px; reset exact; hidden inverse null. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

camera를 renderer mutable global로 저장 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-32** 입력: geo pan/zoom/rotate/region fit/reset/resize/tween. 기대: native camera/viewport 왕복·anchor·dateline·clipped inverse 정확.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/geo-camera.test.js`
- `test/contracts/geo-camera.test.js`
- `test/charts/geo-camera/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/geo-camera.test.js
node scripts/run-tests.js contracts contracts/geo-camera.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.
- G-GEO: public projection/camera/resource contract. 먼저 진행할 수 있는 일: pure projection reference checks.


### STEP-047 Geometry별 exact hit와 CSS 좌표

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-11. 선행 단계 STEP-006、STEP-012、STEP-035. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 interaction](roadmap/contracts/interaction.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/inspection.js`
- `src/scene.js`
- `src/grammar/schemas/graphicBounds.js`
- `src/grammar/schemas/graphicClip.js`
- `src/materialization/selection/items/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/interaction/hitTest.js` — CSS transforms, exact shape and clip hit.
- `src/interaction/spatialIndex.js` — Current-scene broad phase and revision cache.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. root/child transforms inverse와 CSS local 변환을 구현한다.
2. compound fill/stroke/clip/image/text hit를 작성한다.
3. DPR1/2/3과 rotated nested composition을 시험한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

same CSS point→same semantic key, hole은hit없음. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

DPR 이중적용·clip밖hit 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-09. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-33** 입력: 모든 geometry와 legend/axis/header/title hit at DPR1/2/3. 기대: CSS좌표 기준 same semantic target, clip/occlusion/stroke tolerance와 provenance 정확.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/hit-shapes.test.js`
- `test/contracts/hit-shapes.test.js`
- `test/browser/hit-shapes.browser.js`

~~~sh
node scripts/run-tests.js unit unit/hit-shapes.test.js
node scripts/run-tests.js contracts contracts/hit-shapes.test.js
node scripts/run-tests.js browser browser/hit-shapes.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-048 공간 인덱스와 guide semantic roles

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-11. 선행 단계 STEP-047. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 interaction](roadmap/contracts/interaction.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/inspection.js`
- `src/scene.js`
- `src/grammar/schemas/graphicBounds.js`
- `src/grammar/schemas/graphicClip.js`
- `src/materialization/selection/items/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/interaction/hitTest.js` — CSS transforms, exact shape and clip hit.
- `src/interaction/spatialIndex.js` — Current-scene broad phase and revision cache.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. bounds broadphase와 exact narrowphase를 분리한다.
2. guide/title/header roles 및 z-order candidate 정렬을 연결한다.
3. cache를 scene revision에 묶고 row lineage를 반환한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

axis/legend/mark target 정확; duplicate primitive owner1개. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

frontmost 후보만 남겨 bundle 정보 손실 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-33** 입력: 모든 geometry와 legend/axis/header/title hit at DPR1/2/3. 기대: CSS좌표 기준 same semantic target, clip/occlusion/stroke tolerance와 provenance 정확.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/hit-index.test.js`
- `test/contracts/hit-index.test.js`
- `test/browser/hit-index.browser.js`

~~~sh
node scripts/run-tests.js unit unit/hit-index.test.js
node scripts/run-tests.js contracts contracts/hit-index.test.js
node scripts/run-tests.js browser browser/hit-index.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-049 Frame hit와 transition bridge

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-11. 선행 단계 STEP-048. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 interaction](roadmap/contracts/interaction.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/inspection.js`
- `src/scene.js`
- `src/grammar/schemas/graphicBounds.js`
- `src/grammar/schemas/graphicClip.js`
- `src/materialization/selection/items/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/interaction/hitTest.js` — CSS transforms, exact shape and clip hit.
- `src/interaction/spatialIndex.js` — Current-scene broad phase and revision cache.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. current scene index 업데이트 API를 정의한다.
2. enter/exit/crossfade visibility와 semantic dedupe를 구현한다.
3. animation sampler 없이 synthetic intermediate scenes로 먼저 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

mid-frame 위치에서hit, final-only 위치는miss. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

애니메이션 최종 scene만 사용 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-34** 입력: animation frame hit와 overlapping enter/exit/crossfade. 기대: 현재 보이는 geometry 선택, semantic key 중복 이벤트 없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/hit-frame.test.js`
- `test/contracts/hit-frame.test.js`
- `test/browser/hit-frame.browser.js`

~~~sh
node scripts/run-tests.js unit unit/hit-frame.test.js
node scripts/run-tests.js contracts contracts/hit-frame.test.js
node scripts/run-tests.js browser browser/hit-frame.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-050 다섯 경계의 단일 Y 검증

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-26. 선행 단계 STEP-009、STEP-035. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/core/compositionScales.js`
- `src/actions/composition/index.js`
- `src/actions/guides/axes/index.js`
- `src/persistence/validation.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/framePolicy.js` — One pure single-Y validator for five admission boundaries.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. frame owner와 scale binding collector를 만든다.
2. create/edit/schema/composition/load에 한 validator를 연결한다.
3. hidden/mirror/overlap 우회와합법 y2/panels를 시험한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

same-frame2Y error; separate panels와range y2 pass. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

axis만숨겨 정책 통과 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-26. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-85** 입력: 같은 frame에 두 Y scale/guide·숨긴축·mirror axis. 기대: 모두 정책 오류, 독립 scale 숨김·overlaid frame 우회 금지.
- **AT-86** 입력: 독립 facet/concat panels·y2 range·polar/geo. 기대: 합법적 별도 frame/범위 endpoint 오탐0; native frame 의미로 단일 Y 검증.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/single-y-policy.test.js`
- `test/contracts/single-y-policy.test.js`

~~~sh
node scripts/run-tests.js unit unit/single-y-policy.test.js
node scripts/run-tests.js contracts contracts/single-y-policy.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-051 명칭과 조합 및 제외 정책

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-26. 선행 단계 STEP-050. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/core/compositionScales.js`
- `src/actions/composition/index.js`
- `src/actions/guides/axes/index.js`
- `src/persistence/validation.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/framePolicy.js` — One pure single-Y validator for five admission boundaries.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. Pyramid 최종명과 stage 의미를 catalog에 제안한다.
2. Marginal/Bullet/Combo 전용constructor 추가를 막는다.
3. KPI/Gauge·set visualization의 scope metadata를 정리한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

현재 필수 API에 excluded facade0; recipe는공통actions. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

보류 기능을 generic resource로 몰래 재도입 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-83** 입력: Pyramid 공개 명칭과 단계형 geometry. 기대: 이전 Funnel 의미·order·gap·value 보존; 외부 alias 구현은 의무 아님.
- **AT-84** 입력: Marginal/Bullet/Combo action AST와 composition fixtures. 기대: 전용 constructor0, 공통 layout/scale/role 사용, 같은 frame Y 공유.
- **AT-87** 입력: KPI/Gauge 전용 API 제외와 docs/LLM scope. 기대: 필수개발·새 facade로 재유입0; 외부 입력 adapter admission은 의무 아님.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/native-api-policy.test.js`
- `test/contracts/native-api-policy.test.js`

~~~sh
node scripts/run-tests.js unit unit/native-api-policy.test.js
node scripts/run-tests.js contracts contracts/native-api-policy.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-052 외부 정합성 없는 core 경계

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-26. 선행 단계 STEP-051. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/core/compositionScales.js`
- `src/actions/composition/index.js`
- `src/actions/guides/axes/index.js`
- `src/persistence/validation.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/grammar/framePolicy.js` — One pure single-Y validator for five admission boundaries.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. core/event/default/dependency에 외부 engine 요구가 없는지 검사한다.
2. active native/USR와 historical reference를 분리한다.
3. release qualification 분모를30요구/79시험군으로 고정한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

Flint/translator/corpus parity 필수의존0. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

외부 참고2279행을pass 또는required로 집계 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-88** 입력: native 정책과 외부 참고 원장의 분리. 기대: native fixture에 단일Y·조합·제외 정책 적용; 외부 reference-only를 pass/필수로 집계하지 않음.
- **AT-92** 입력: core/API/event/defaults/dependency/release gate 독립성. 기대: Flint·번역기 import, upstream 변경·adapter·corpus parity의 필수 의존0; native 기능 축소0.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/native-boundaries.test.js`
- `test/contracts/native-boundaries.test.js`

~~~sh
node scripts/run-tests.js unit unit/native-boundaries.test.js
node scripts/run-tests.js contracts contracts/native-boundaries.test.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-053 Pyramid OHLC waterfall 역할 구현

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-09. 선행 단계 STEP-016、STEP-035、STEP-024、STEP-028、STEP-041、STEP-052. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 structure-recipes](roadmap/contracts/structure-recipes.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/charts/index.js`
- `src/actions/marks/index.js`
- `src/actions/overlays/index.js`
- `src/actions/composition/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/actions/charts/pyramid.js` — Stage semantic facade over shared marks.
- `src/actions/charts/ohlc.js` — Financial role facade.
- `src/actions/charts/waterfall.js` — Explicit running-total facade.
- `src/grammar/trail.js` — Variable-width ribbon.
- `src/grammar/cells.js` — Table/cell layout.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. 각 facade의 primitive review target을 준비한다.
2. stage/trapezoid와OHLC/range/waterfall누적을 기존marks로 낮춘다.
3. create/edit/revise/hit/labels를 compound owner에 연결한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

Pyramid widths100/60→60/20→20/20; OHLC inequality검증. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

stage자동정렬·KPI/Gauge facade 추가 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-20, OR-21. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-26** 입력: native chart capability와 조합 recipe 전수. 기대: GGA/USR별 의미·geometry·guides·behavior 검증; 외부51/154 분모 사용 금지.
- **AT-27** 입력: Pyramid/OHLC/waterfall/table/sparkline와 reference-band 조합. 기대: role별 의미·hit·정렬, KPI/Gauge 전용 개발 제외, 별도 Bullet facade0.
- **AT-83** 입력: Pyramid 공개 명칭과 단계형 geometry. 기대: 이전 Funnel 의미·order·gap·value 보존; 외부 alias 구현은 의무 아님.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/pyramid-ohlc-waterfall.test.js`
- `test/contracts/pyramid-ohlc-waterfall.test.js`
- `test/charts/pyramid-ohlc-waterfall/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/pyramid-ohlc-waterfall.test.js
node scripts/run-tests.js contracts contracts/pyramid-ohlc-waterfall.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-054 Trail과 polar 통계 variant

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-09. 선행 단계 STEP-053. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 structure-recipes](roadmap/contracts/structure-recipes.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/charts/index.js`
- `src/actions/marks/index.js`
- `src/actions/overlays/index.js`
- `src/actions/composition/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/actions/charts/pyramid.js` — Stage semantic facade over shared marks.
- `src/actions/charts/ohlc.js` — Financial role facade.
- `src/actions/charts/waterfall.js` — Explicit running-total facade.
- `src/grammar/trail.js` — Variable-width ribbon.
- `src/grammar/cells.js` — Table/cell layout.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. variable-width ribbon join/cap과missing breaks를 구현한다.
2. rose/radar/streamgraph/violin의 현재 계약을 보강한다.
3. negative/zero/bandwidth/baseline fixture를 실행한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

width/area/angle 의미독립; streamgraph baseline oracle. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

line stroke width 하나로 trail 대체 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-26** 입력: native chart capability와 조합 recipe 전수. 기대: GGA/USR별 의미·geometry·guides·behavior 검증; 외부51/154 분모 사용 금지.
- **AT-28** 입력: trail/polar/radar/rose/streamgraph/violin native variants. 기대: width/area/angle/baseline/bandwidth의 자체 의미·수식·missing/negative/zero 계약.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/trail-native-variants.test.js`
- `test/contracts/trail-native-variants.test.js`
- `test/charts/trail-native-variants/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/trail-native-variants.test.js
node scripts/run-tests.js contracts contracts/trail-native-variants.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-055 Cell table과 compact chart recipe

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-09. 선행 단계 STEP-054. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 structure-recipes](roadmap/contracts/structure-recipes.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/charts/index.js`
- `src/actions/marks/index.js`
- `src/actions/overlays/index.js`
- `src/actions/composition/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/actions/charts/pyramid.js` — Stage semantic facade over shared marks.
- `src/actions/charts/ohlc.js` — Financial role facade.
- `src/actions/charts/waterfall.js` — Explicit running-total facade.
- `src/grammar/trail.js` — Variable-width ribbon.
- `src/grammar/cells.js` — Table/cell layout.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. row/column keyed cell layout와text formatter 및 bar-table/inline-sparkline을 만든다.
2. table selection/resize/sort와accessible data를 연결한다.
3. sparkline/reference-band를 기존actions로 조합한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

cell key 유지; static4formats와DOM data의 동일값. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

HTML-only table로 export 의무 회피 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-26** 입력: native chart capability와 조합 recipe 전수. 기대: GGA/USR별 의미·geometry·guides·behavior 검증; 외부51/154 분모 사용 금지.
- **AT-27** 입력: Pyramid/OHLC/waterfall/table/sparkline와 reference-band 조합. 기대: role별 의미·hit·정렬, KPI/Gauge 전용 개발 제외, 별도 Bullet facade0.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/table-sparkline.test.js`
- `test/contracts/table-sparkline.test.js`
- `test/charts/table-sparkline/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/table-sparkline.test.js
node scripts/run-tests.js contracts contracts/table-sparkline.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-056 Marginal Bullet Combo 종단 recipe

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-09. 선행 단계 STEP-055. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 structure-recipes](roadmap/contracts/structure-recipes.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/charts/index.js`
- `src/actions/marks/index.js`
- `src/actions/overlays/index.js`
- `src/actions/composition/index.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/actions/charts/pyramid.js` — Stage semantic facade over shared marks.
- `src/actions/charts/ohlc.js` — Financial role facade.
- `src/actions/charts/waterfall.js` — Explicit running-total facade.
- `src/grammar/trail.js` — Variable-width ribbon.
- `src/grammar/cells.js` — Table/cell layout.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. public domain action만으로3개 recipe를 작성한다.
2. shared scale/frame/order와linked lineage를 검증한다.
3. AST lint·serialize/revise/resize/render를 예제로 고정한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

dedicatedconstructor0, rawgraphic0, same-frame Y1. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

명목상 recipe가 private helper에 기대기 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-26** 입력: native chart capability와 조합 recipe 전수. 기대: GGA/USR별 의미·geometry·guides·behavior 검증; 외부51/154 분모 사용 금지.
- **AT-84** 입력: Marginal/Bullet/Combo action AST와 composition fixtures. 기대: 전용 constructor0, 공통 layout/scale/role 사용, 같은 frame Y 공유.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/composition-recipes.test.js`
- `test/contracts/composition-recipes.test.js`
- `test/charts/composition-recipes/variants.render.js`

~~~sh
node scripts/run-tests.js unit unit/composition-recipes.test.js
node scripts/run-tests.js contracts contracts/composition-recipes.test.js
npm run test:render
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-VISUAL: new visual target public action flow. 먼저 진행할 수 있는 일: pure math and primitive review target.


### STEP-057 Persistent selection과 parameter bindings

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-12. 선행 단계 STEP-009、STEP-016、STEP-049、STEP-028、STEP-032、STEP-041、STEP-052. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 interaction](roadmap/contracts/interaction.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/selection/actions.js`
- `src/materialization/selection/state.js`
- `src/materialization/selection/rows.js`
- `src/materialization/selection/styles.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/interaction.js` — Browser-safe public session/controller entry.
- `src/interaction/gestures.js` — Pointer capture and arbitration state machine.
- `src/interaction/selection.js` — Logical items/range/predicate commands.
- `src/interaction/bindings.js` — Linked views and target resolution.
- `types/interaction.d.ts` — Public controller/command/event declarations.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. items/range/predicate와mode/empty/resolve를 구현한다.
2. logical key와linked targets를 저장한다.
3. revise/delete/hidden selection reconciliation을 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

toggle/nearest/empty/union/intersection 의미정확. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

index만 저장·empty를항상all로취급 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-37** 입력: native parameter/selection bind/empty/toggle/nearest/resolve. 기대: 자체 의미와 선언된 option 계약 정확; legacy/new 외부 selection 번역 제외.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/selection-state.test.js`
- `test/contracts/selection-state.test.js`
- `test/browser/selection-state.browser.js`

~~~sh
node scripts/run-tests.js unit unit/selection-state.test.js
node scripts/run-tests.js contracts contracts/selection-state.test.js
node scripts/run-tests.js browser browser/selection-state.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-058 Pointer capture와 gesture state machine

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-12. 선행 단계 STEP-057. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 interaction](roadmap/contracts/interaction.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/selection/actions.js`
- `src/materialization/selection/state.js`
- `src/materialization/selection/rows.js`
- `src/materialization/selection/styles.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/interaction.js` — Browser-safe public session/controller entry.
- `src/interaction/gestures.js` — Pointer capture and arbitration state machine.
- `src/interaction/selection.js` — Logical items/range/predicate commands.
- `src/interaction/bindings.js` — Linked views and target resolution.
- `types/interaction.d.ts` — Public controller/command/event declarations.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. armed/dragging/cancel state reducer를 구현한다.
2. threshold/priority/modifier/pinch arbitration을 적용한다.
3. 실제pointer/touch/keyboard로up/cancel/lostcapture/blur를 시험한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

drag100move→commit1 또는cancel1. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

move별commit·lateup 중복commit 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-24. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-35** 입력: native interaction command와 gesture/options/reset 충돌. 기대: 자체 상태·event·화면 계약 일치, 실제 pointer/touch/keyboard; Flint preset 이름 불필요.
- **AT-36** 입력: brushx/y/angular/lasso/log/time/category의 down→move→cancel/up. 기대: domain invert/0-2π crossing/빈선택·capture정리; commit1회 또는 cancel1회.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/gesture-controller.test.js`
- `test/contracts/gesture-controller.test.js`
- `test/browser/gesture-controller.browser.js`

~~~sh
node scripts/run-tests.js unit unit/gesture-controller.test.js
node scripts/run-tests.js contracts contracts/gesture-controller.test.js
node scripts/run-tests.js browser browser/gesture-controller.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-059 Brush lasso angular와 scale inversion

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-12. 선행 단계 STEP-058. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 interaction](roadmap/contracts/interaction.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/selection/actions.js`
- `src/materialization/selection/state.js`
- `src/materialization/selection/rows.js`
- `src/materialization/selection/styles.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/interaction.js` — Browser-safe public session/controller entry.
- `src/interaction/gestures.js` — Pointer capture and arbitration state machine.
- `src/interaction/selection.js` — Logical items/range/predicate commands.
- `src/interaction/bindings.js` — Linked views and target resolution.
- `types/interaction.d.ts` — Public controller/command/event declarations.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. x/y/xy categorical/log/time brush를 구현한다.
2. angular seam union과lasso polygon selection을 구현한다.
3. empty brush/cancel과preview overlay를 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

wrap350°→10°는경계양쪽선택; log inverse정확. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

screen polygon을domain polygon으로저장 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-36** 입력: brushx/y/angular/lasso/log/time/category의 down→move→cancel/up. 기대: domain invert/0-2π crossing/빈선택·capture정리; commit1회 또는 cancel1회.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/brush-lasso.test.js`
- `test/contracts/brush-lasso.test.js`
- `test/browser/brush-lasso.browser.js`

~~~sh
node scripts/run-tests.js unit unit/brush-lasso.test.js
node scripts/run-tests.js contracts contracts/brush-lasso.test.js
node scripts/run-tests.js browser browser/brush-lasso.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-060 Linked filter legend reorder annotation

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-12. 선행 단계 STEP-059. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 interaction](roadmap/contracts/interaction.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/actions/selection/actions.js`
- `src/materialization/selection/state.js`
- `src/materialization/selection/rows.js`
- `src/materialization/selection/styles.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/interaction.js` — Browser-safe public session/controller entry.
- `src/interaction/gestures.js` — Pointer capture and arbitration state machine.
- `src/interaction/selection.js` — Logical items/range/predicate commands.
- `src/interaction/bindings.js` — Linked views and target resolution.
- `types/interaction.d.ts` — Public controller/command/event declarations.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. origin transaction으로linked propagation을 구현한다.
2. legend visibility/reorder/parameter controls/context actions를 연결한다.
3. node drag/partition focus/geo navigation과keyboard 경로를 연결한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

linkedloop0; filtered scale변경; focus/selection유지. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

외부preset 명칭·개수에API 맞추기 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-35** 입력: native interaction command와 gesture/options/reset 충돌. 기대: 자체 상태·event·화면 계약 일치, 실제 pointer/touch/keyboard; Flint preset 이름 불필요.
- **AT-38** 입력: linked brush/filter/legend/reorder/controls/contextmenu. 기대: scope·order·focus 보존, origin loop 없음, 삭제된 data/child 선택 reconciliation.
- **AT-65** 입력: partition focus/filter/breadcrumb/keyboard/coordinate morph. 기대: 같은 node 선택 유지, 각 frame hit 정확, bend endpoint와 reduced motion.
- **AT-80** 입력: bundle 겹침/선택/unbundle/tooltip/keyboard. 기대: candidate edge 목록 정확, 가짜 junction node0, current frame hit와 accessibility.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/linked-direct-controls.test.js`
- `test/contracts/linked-direct-controls.test.js`
- `test/browser/linked-direct-controls.browser.js`

~~~sh
node scripts/run-tests.js unit unit/linked-direct-controls.test.js
node scripts/run-tests.js contracts contracts/linked-direct-controls.test.js
node scripts/run-tests.js browser browser/linked-direct-controls.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-061 Stable matching과 transition 계획

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-14. 선행 단계 STEP-006、STEP-012、STEP-035、STEP-046、STEP-049、STEP-028、STEP-032、STEP-041、STEP-052. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 animation](roadmap/contracts/animation.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/scene.js`
- `src/renderers/transitionScene.js`
- `src/renderers/canvas/scene.js`
- `types/scene.d.ts`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/animation.js` — Browser-safe planner/sampler/player entry.
- `src/animation/planner.js` — Identity/topology matching.
- `src/animation/sample.js` — Pure time sampling.
- `src/animation/kernels.js` — Typed Cartesian/polar/partition/graph/geo kernels.
- `src/animation/player.js` — Clock and lifecycle.
- `src/animation/envelope.js` — Offline typed animation persistence.
- `types/animation.d.ts` — Public animation declarations.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. scene item identity로enter/update/exit를 분류한다.
2. primitive/topology/coordinate compatible kernel을 선택한다.
3. plan schema/version/options/assets와reason을 저장한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

reorder는update, keyed value변경identity유지. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

path string 또는array index matching 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-42** 입력: t=0,.25,.5,.75,1와 duration0의 deterministic transition. 기대: endpoint 동일, 색/형상/guide/kernel sample 수치와 topology 올바름.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/transition-plan.test.js`
- `test/contracts/transition-plan.test.js`
- `test/browser/transition-plan.browser.js`

~~~sh
node scripts/run-tests.js unit unit/transition-plan.test.js
node scripts/run-tests.js contracts contracts/transition-plan.test.js
node scripts/run-tests.js browser browser/transition-plan.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-062 Deterministic sampler와typed kernels

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-14. 선행 단계 STEP-061. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 animation](roadmap/contracts/animation.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/scene.js`
- `src/renderers/transitionScene.js`
- `src/renderers/canvas/scene.js`
- `types/scene.d.ts`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/animation.js` — Browser-safe planner/sampler/player entry.
- `src/animation/planner.js` — Identity/topology matching.
- `src/animation/sample.js` — Pure time sampling.
- `src/animation/kernels.js` — Typed Cartesian/polar/partition/graph/geo kernels.
- `src/animation/player.js` — Clock and lifecycle.
- `src/animation/envelope.js` — Offline typed animation persistence.
- `types/animation.d.ts` — Public animation declarations.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. numeric/color/angle/log interpolation을 구현한다.
2. partition bend/geo camera/bundle endpoint kernel을 연결한다.
3. fixed t0/.25/.5/.75/1과current-frame hit를 시험한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

linear10→30 중간20; exact endpoints; nodeattachment. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

매frame source data inference·topology morph 강행 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-03, OR-23. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-42** 입력: t=0,.25,.5,.75,1와 duration0의 deterministic transition. 기대: endpoint 동일, 색/형상/guide/kernel sample 수치와 topology 올바름.
- **AT-44** 입력: logscale/polar/geo/layout/data 동시변경. 기대: transformed-space·camera kernel 정확, 잘못된 topology morph와 flicker 없음.
- **AT-65** 입력: partition focus/filter/breadcrumb/keyboard/coordinate morph. 기대: 같은 node 선택 유지, 각 frame hit 정확, bend endpoint와 reduced motion.
- **AT-81** 입력: bundle animate/interrupt/seek/revise/geo date line. 기대: endpoint attachment·ID 지속, clip/backside 정확, hidden route hit0.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/transition-sampler.test.js`
- `test/contracts/transition-sampler.test.js`
- `test/browser/transition-sampler.browser.js`

~~~sh
node scripts/run-tests.js unit unit/transition-sampler.test.js
node scripts/run-tests.js contracts contracts/transition-sampler.test.js
node scripts/run-tests.js browser browser/transition-sampler.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-063 Virtual clock과 timeline playback

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-14. 선행 단계 STEP-062. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 animation](roadmap/contracts/animation.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/scene.js`
- `src/renderers/transitionScene.js`
- `src/renderers/canvas/scene.js`
- `types/scene.d.ts`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/animation.js` — Browser-safe planner/sampler/player entry.
- `src/animation/planner.js` — Identity/topology matching.
- `src/animation/sample.js` — Pure time sampling.
- `src/animation/kernels.js` — Typed Cartesian/polar/partition/graph/geo kernels.
- `src/animation/player.js` — Clock and lifecycle.
- `src/animation/envelope.js` — Offline typed animation persistence.
- `types/animation.d.ts` — Public animation declarations.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. play/pause/seek/reverse/rate/repeat를 reducer로구현한다.
2. current-frame interrupt와terminalPromise를 연결한다.
3. zero-duration/reducedmotion/dispose를 검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

interruption frame연속; terminal1회; disposedRAF0. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

벽시계기반golden·old endpoint로jump 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-43** 입력: play/pause/seek/reverse/rate/repeat/interrupt. 기대: 현재 frame에서 이어짐, finished상태정확, virtualclock 재현.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/animation-player.test.js`
- `test/contracts/animation-player.test.js`
- `test/browser/animation-player.browser.js`

~~~sh
node scripts/run-tests.js unit unit/animation-player.test.js
node scripts/run-tests.js contracts contracts/animation-player.test.js
node scripts/run-tests.js browser browser/animation-player.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-064 Animation 저장과 frame export

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-14. 선행 단계 STEP-063. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 animation](roadmap/contracts/animation.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/scene.js`
- `src/renderers/transitionScene.js`
- `src/renderers/canvas/scene.js`
- `types/scene.d.ts`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/animation.js` — Browser-safe planner/sampler/player entry.
- `src/animation/planner.js` — Identity/topology matching.
- `src/animation/sample.js` — Pure time sampling.
- `src/animation/kernels.js` — Typed Cartesian/polar/partition/graph/geo kernels.
- `src/animation/player.js` — Clock and lifecycle.
- `src/animation/envelope.js` — Offline typed animation persistence.
- `types/animation.d.ts` — Public animation declarations.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. endpoint program/resource/font/kernel payload를bundle한다.
2. fresh process에서network없이deserialize/sample한다.
3. time list와fps frame export를4renderer로연결한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

same time same scene hash; missingkernel 명시오류. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

hash만 저장후offline replay 주장 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-45** 입력: animation envelope 저장→offline 새프로세스 replay. 기대: endpoint/asset/font/kernel 버전고정, same time same frame, reduced motion 보존.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/animation-envelope.test.js`
- `test/contracts/animation-envelope.test.js`
- `test/browser/animation-envelope.browser.js`

~~~sh
node scripts/run-tests.js unit unit/animation-envelope.test.js
node scripts/run-tests.js contracts contracts/animation-envelope.test.js
node scripts/run-tests.js browser browser/animation-envelope.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-065 Committed baseline과 preview transaction

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-13. 선행 단계 STEP-035、STEP-046、STEP-060. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 interaction](roadmap/contracts/interaction.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/core/action.js`
- `src/core/diagnostics.js`
- `src/actions/selection/actions.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/interaction/session.js` — Committed/preview runtime owner and history.
- `src/interaction/commands.js` — Typed command reducer.
- `src/interaction/events.js` — Native phases/origin/settlement.
- `src/interaction/lifecycle.js` — Generation guards and disposal.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. session owner와command reducer를구현한다.
2. preview/commit/cancel/reset/clear/undo를분리한다.
3. atomic command preflight와reentrant queue를추가한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

cancel baseline동일, commit history+1, reset의미정확. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

preview baseline누적변경 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-24. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-39** 입력: native update commands와 preview/commit/cancel/reset. 기대: 불변 baseline·결정적 overlay·도메인 갱신; 외부7ops 특례 복제 없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/session-transactions.test.js`
- `test/contracts/session-transactions.test.js`
- `test/browser/session-transactions.browser.js`

~~~sh
node scripts/run-tests.js unit unit/session-transactions.test.js
node scripts/run-tests.js contracts contracts/session-transactions.test.js
node scripts/run-tests.js browser browser/session-transactions.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-066 Native events와 async settlement

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-13. 선행 단계 STEP-065. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 interaction](roadmap/contracts/interaction.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/core/action.js`
- `src/core/diagnostics.js`
- `src/actions/selection/actions.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/interaction/session.js` — Committed/preview runtime owner and history.
- `src/interaction/commands.js` — Typed command reducer.
- `src/interaction/events.js` — Native phases/origin/settlement.
- `src/interaction/lifecycle.js` — Generation guards and disposal.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. eventpayload와origin/revision/phase를검증한다.
2. commit→settled 조건과cancel/error terminal을구현한다.
3. linked loop guard와subscriber reentry를시험한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

commit1 settled1 또는cancel1; stale settled0. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

외부7ops/23presets 계약복제 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-24. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-40** 입력: programmatic/user 입력의 native event 순서. 기대: origin/phase/revision 명확, 중복 commit0, preview취소와 async settlement 정확.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/session-events.test.js`
- `test/contracts/session-events.test.js`
- `test/browser/session-events.browser.js`

~~~sh
node scripts/run-tests.js unit unit/session-events.test.js
node scripts/run-tests.js contracts contracts/session-events.test.js
node scripts/run-tests.js browser browser/session-events.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-067 Update resize asset worker destroy 경쟁

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-13. 선행 단계 STEP-066. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 interaction](roadmap/contracts/interaction.ko.md).
- [계약 core](roadmap/contracts/core.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/core/action.js`
- `src/core/diagnostics.js`
- `src/actions/selection/actions.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `src/interaction/session.js` — Committed/preview runtime owner and history.
- `src/interaction/commands.js` — Typed command reducer.
- `src/interaction/events.js` — Native phases/origin/settlement.
- `src/interaction/lifecycle.js` — Generation guards and disposal.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. generation/revision vector로late result를폐기한다.
2. mount/updateProgram/capture/resizeobserver의disposal을구현한다.
3. 100회 mount/destroy와중복destroy를실행한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

listeners/timers/workers0, oldjob덮어쓰기0. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

destroy후DOM write·사라진owner callback 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

독립 literal fixture: OR-25. oracle-fixtures.json에서 input/expected를 읽고 실제 구현의 actual과 비교한다.

- **AT-41** 입력: mount/update/asset/resize 중 cancel/destroy/reentry. 기대: stale 결과 덮어쓰기0, 중복destroy안전, listener/timer/DOM leak0.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/session-lifecycle.test.js`
- `test/contracts/session-lifecycle.test.js`
- `test/browser/session-lifecycle.browser.js`

~~~sh
node scripts/run-tests.js unit unit/session-lifecycle.test.js
node scripts/run-tests.js contracts contracts/session-lifecycle.test.js
node scripts/run-tests.js browser browser/session-lifecycle.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.
- G-RUNTIME: unresolved native session/event/animation public behavior. 먼저 진행할 수 있는 일: fixture, headless pure reducer, review package.


### STEP-068 Keyboard focus와 accessible data

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-18. 선행 단계 STEP-019、STEP-060、STEP-067、STEP-064. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).
- [계약 interaction](roadmap/contracts/interaction.ko.md).
- [계약 animation](roadmap/contracts/animation.ko.md).
- [계약 geo](roadmap/contracts/geo.ko.md).
- [계약 edge-bundling](roadmap/contracts/edge-bundling.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/accessibility.js`
- `src/persistence.js`
- `src/renderers/png.js`
- `src/renderers/pdf.js`
- `src/renderers/svg.js`
- `test/support/browser.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `test/browser/native-integration.browser.js` — Real-input cross-feature qualification.
- `scripts/consumers/fixtures/native-resources.ts` — Fresh installed-package typed restore/edit fixture.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. semanticitems에서accessible table/tree/graph descriptions를만든다.
2. keyboard/touch로모든actionable target접근을검증한다.
3. hidden/filter/reducedmotion/focus복구를연결한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

screenreader 데이터와visible/selectedstate일치. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

Canvas image alt하나로접근성완료 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-53** 입력: keyboard focus·screenreader표·tooltip·reducedmotion. 기대: 차트 정보와 actionable targets 접근 가능, hidden/filter 상태 일치, focus 복구.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/accessible-interactions.test.js`
- `test/contracts/accessible-interactions.test.js`
- `test/browser/accessible-interactions.browser.js`

~~~sh
node scripts/run-tests.js unit unit/accessible-interactions.test.js
node scripts/run-tests.js contracts contracts/accessible-interactions.test.js
node scripts/run-tests.js browser browser/accessible-interactions.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-069 네 포맷과 offline fresh-process 복원

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-18. 선행 단계 STEP-068. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).
- [계약 interaction](roadmap/contracts/interaction.ko.md).
- [계약 animation](roadmap/contracts/animation.ko.md).
- [계약 geo](roadmap/contracts/geo.ko.md).
- [계약 edge-bundling](roadmap/contracts/edge-bundling.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/accessibility.js`
- `src/persistence.js`
- `src/renderers/png.js`
- `src/renderers/pdf.js`
- `src/renderers/svg.js`
- `test/support/browser.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `test/browser/native-integration.browser.js` — Real-input cross-feature qualification.
- `scripts/consumers/fixtures/native-resources.ts` — Fresh installed-package typed restore/edit fixture.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. interacted partition/graph/geo/animation fixture를저장한다.
2. network차단freshconsumer에서load/edit/replay한다.
3. SVG/Canvas/PNG/PDF의asset/font/clip을비교한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

현재상태·선택·viewport·lineage복원; 4format정확. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

source checkout·network 숨은의존 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-54** 입력: SVG/Canvas/PNG/PDF·frame export 비교. 기대: 같은 semantic/geometry, asset embedding/font/clip 정확, vector/raster역할명시.
- **AT-55** 입력: 저장된 interacted chart/geo/animation offline 재개. 기대: 필수자원 동봉, 상태/선택/viewport 복원, functions/network숨은의존없음.
- **AT-89** 입력: 새 resource/action save/load/type/schema/clean consumer. 기대: JSON codec·refs·version·lineage 왕복, source checkout/DOM 숨은 의존0.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/export-restore.test.js`
- `test/contracts/export-restore.test.js`
- `test/browser/export-restore.browser.js`

~~~sh
node scripts/run-tests.js unit unit/export-restore.test.js
node scripts/run-tests.js contracts contracts/export-restore.test.js
node scripts/run-tests.js browser browser/export-restore.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-070 현재 frame와 모든 deferred 통합 의무 종료

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-18. 선행 단계 STEP-069. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).
- [계약 interaction](roadmap/contracts/interaction.ko.md).
- [계약 animation](roadmap/contracts/animation.ko.md).
- [계약 geo](roadmap/contracts/geo.ko.md).
- [계약 edge-bundling](roadmap/contracts/edge-bundling.ko.md).
- [계약 hierarchy-partition](roadmap/contracts/hierarchy-partition.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `src/accessibility.js`
- `src/persistence.js`
- `src/renderers/png.js`
- `src/renderers/pdf.js`
- `src/renderers/svg.js`
- `test/support/browser.js`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `test/browser/native-integration.browser.js` — Real-input cross-feature qualification.
- `scripts/consumers/fixtures/native-resources.ts` — Fresh installed-package typed restore/edit fixture.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. partitionfocus→morph→revise 시나리오를실행한다.
2. 4bundle→overlapselect→drag→interrupt→geo clip을실행한다.
3. session+animation+hit+LOD+undo/restore를교차검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

AT34/65/80/81/82의후행 의무0; 현재frame선택정확. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

커널단위pass를전체capability완료로집계 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-34** 입력: animation frame hit와 overlapping enter/exit/crossfade. 기대: 현재 보이는 geometry 선택, semantic key 중복 이벤트 없음.
- **AT-65** 입력: partition focus/filter/breadcrumb/keyboard/coordinate morph. 기대: 같은 node 선택 유지, 각 frame hit 정확, bend endpoint와 reduced motion.
- **AT-80** 입력: bundle 겹침/선택/unbundle/tooltip/keyboard. 기대: candidate edge 목록 정확, 가짜 junction node0, current frame hit와 accessibility.
- **AT-81** 입력: bundle animate/interrupt/seek/revise/geo date line. 기대: endpoint attachment·ID 지속, clip/backside 정확, hidden route hit0.
- **AT-82** 입력: bundling sizeclass/abort/worker/cache/export. 기대: stage별 SLO·메모리, incomplete 진단, SVG/Canvas/PNG/PDF route 동등.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

아래 파일은 **제안된 새 경로**다. 같은 capability의 기존 파일이 있으면 그 파일을 확장하고 manifest 경로를 갱신한다. 실행 전 runner discovery를 확인한다.

- `test/unit/cross-feature-integration.test.js`
- `test/contracts/cross-feature-integration.test.js`
- `test/browser/cross-feature-integration.browser.js`

~~~sh
node scripts/run-tests.js unit unit/cross-feature-integration.test.js
node scripts/run-tests.js contracts contracts/cross-feature-integration.test.js
node scripts/run-tests.js browser browser/cross-feature-integration.browser.js
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-CORE: unresolved public API or persisted schema implementation. 먼저 진행할 수 있는 일: baseline, independent oracle, pure kernel and review package.


### STEP-071 Size class SLO와 memory

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-19. 선행 단계 STEP-070. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `package.json`
- `scripts/package-consumer.js`
- `scripts/generate-action-catalog.js`
- `knowledge/action-cards.json`
- `knowledge/task-resolver.js`
- `src/inspectionDescriptors.js`
- `types/program.d.ts`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `scripts/benchmark-native.js` — Fixed native workload performance profile.
- `knowledge/native-task-packets.json` — Generated implemented capability packets only.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. 고정장비/profile/seed/warmup/30samples를기록한다.
2. inference/bundling/geo/hit/frame 단계별P50/P95를측정한다.
3. worker/cache/abort와100cycle memory를검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

지원sizeclass SLO·retainedheap·abort 목표통과. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

budgeterror를성능success로집계 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-56** 입력: sizeclass별 startup/update/hit/frame/memory benchmark. 기대: 사전에고정한SLO통과, 장비·size·P50/P95 기록, 반복mount/dispose 안정.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

이 카드는 기존 canonical verification 경로를 사용한다. 필요 없는 구현 미러 테스트를 만들지 않는다.

~~~sh
npm run test:package
npm run docs:verify
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-PERF: claiming supported size class and performance qualification. 먼저 진행할 수 있는 일: measure exact baseline and proposed SLO.


### STEP-072 새 exports와 source-free package

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-19. 선행 단계 STEP-071. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `package.json`
- `scripts/package-consumer.js`
- `scripts/generate-action-catalog.js`
- `knowledge/action-cards.json`
- `knowledge/task-resolver.js`
- `src/inspectionDescriptors.js`
- `types/program.d.ts`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `scripts/benchmark-native.js` — Fixed native workload performance profile.
- `knowledge/native-task-packets.json` — Generated implemented capability packets only.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. browser/Node/SSR/types entry를검증한다.
2. npm pack 산출물을별도tempconsumer에설치한다.
3. freshload/edit/render와optionaldeps격리를시험한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

Node dependency browser유입0; package타입/runtime일치. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

checkout deepimport·로컬repack을releaseartifact로대체 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-57** 입력: npm pack clean consumer, SSR/browser/Node/types. 기대: 소스checkout없는환경에서실행, optionaldeps 격리, schema/types/runtime일치.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

이 카드는 기존 canonical verification 경로를 사용한다. 필요 없는 구현 미러 테스트를 만들지 않는다.

~~~sh
npm run test:package
npm run docs:verify
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.


### STEP-073 Current contracts와 agent packets

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-19. 선행 단계 STEP-072. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `package.json`
- `scripts/package-consumer.js`
- `scripts/generate-action-catalog.js`
- `knowledge/action-cards.json`
- `knowledge/task-resolver.js`
- `src/inspectionDescriptors.js`
- `types/program.d.ts`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `scripts/benchmark-native.js` — Fixed native workload performance profile.
- `knowledge/native-task-packets.json` — Generated implemented capability packets only.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. 실제구현된API의current계약/타입/카드/relationships를갱신한다.
2. shortestcall+negative+revise+savedresult 예제를실행한다.
3. LLM/MCP/inspection/docs generator와builtsite를검증한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

새action계약누락0; planned/current구분; defaults/version정확. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

미구현API를current로홍보 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-58** 입력: catalog/contracts/types/examples/docs/LLM/MCP 산출물 검사. 기대: new API계약누락0, executableexamples통과, planned와current지원구분.
- **AT-90** 입력: 신규 domain docs/agent packet/recipes/option presets. 기대: planned/current 구분, parameter defaults/version 고정, 실행 예제와 negative cases.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

이 카드는 기존 canonical verification 경로를 사용한다. 필요 없는 구현 미러 테스트를 만들지 않는다.

~~~sh
npm run test:package
npm run docs:verify
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.


### STEP-074 Native 요구와 consumer matrix 종료

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-20. 선행 단계 STEP-003、STEP-070、STEP-073、STEP-028、STEP-032、STEP-041、STEP-052. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `scripts/run-tests.js`
- `scripts/coverage-policy.js`
- `test/capabilities.json`
- `.github/workflows/ci.yml`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `test/contracts/native-capability-completion.test.js` — Durable capability matrix validator without roadmap imports.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. active30요구→79시험군→실제evidence를연결한다.
2. 모든requiredconsumer cell의pass/NAnote를검증한다.
3. 기존CI/coverage/realistic/docs/package 전체suite를실행한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

active orphan0/not-run0, excluded는분모밖. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

외부corpus/adapter를release조건으로재도입 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-59** 입력: active GGA/USR requirement→work→test→evidence. 기대: active orphan0·미완료0; reference-only 외부2,279행은 gate 분모 제외.
- **AT-88** 입력: native 정책과 외부 참고 원장의 분리. 기대: native fixture에 단일Y·조합·제외 정책 적용; 외부 reference-only를 pass/필수로 집계하지 않음.
- **AT-91** 입력: native completion manifest와 기존 CI. 기대: 필수 GGA/USR qualification과 공개artifact 일치; 외부 호환성·번역 미요구.
- **AT-92** 입력: core/API/event/defaults/dependency/release gate 독립성. 기대: Flint·번역기 import, upstream 변경·adapter·corpus parity의 필수 의존0; native 기능 축소0.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

이 카드는 기존 canonical verification 경로를 사용한다. 필요 없는 구현 미러 테스트를 만들지 않는다.

~~~sh
npm test
npm run test:realistic
npm run test:coverage
npm run test:browser
npm run test:render
npm run test:package
npm run test:platform
npm run package:check
npm run docs:verify
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.


### STEP-075 실패와 성공 표본 독립 검토

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-20. 선행 단계 STEP-074. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `scripts/run-tests.js`
- `scripts/coverage-policy.js`
- `test/capabilities.json`
- `.github/workflows/ci.yml`

**신규 소유자 경로 제안:** 아래는 이 WP의 후보 모듈이다. 각 카드의 기능에 해당하는 모듈만 만든다. 구현 시 이미 동등한 owner가 생겼으면 그곳을 확장하고 relocation을 기록한다.

- `test/contracts/native-capability-completion.test.js` — Durable capability matrix validator without roadmap imports.

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. 모든failed diff를stats/font/layout/input/time별로분류한다.
2. 각domain성공표본과4bundle알고리즘차이를직접검토한다.
3. scope/contract변경없이snapshot만갱신한경우를차단한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

숫자·geometry·입력·시간·asset근거로판정. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

대량golden교체·독립oracle가production복제 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-60** 입력: 모든 실패 diff 독립검토와 성공 stratified sample review. 기대: 통계/폰트/레이아웃/입력원인별판정, baseline대량재생성으로실패덮음없음.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

이 카드는 기존 canonical verification 경로를 사용한다. 필요 없는 구현 미러 테스트를 만들지 않는다.

~~~sh
npm test
npm run test:realistic
npm run test:coverage
npm run test:browser
npm run test:render
npm run test:package
npm run test:platform
npm run package:check
npm run docs:verify
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.


### STEP-076 동일 candidate와 tag 기반 검증

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-21. 선행 단계 STEP-075. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `.github/workflows/release.yml`
- `scripts/release-candidate.js`
- `package.json`
- `package-lock.json`

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. 실제승인범위에서version/CHANGELOG/lock/docs를정리한다.
2. annotatedtag/commit/ref를확인한다.
3. 한번pack한candidate를모든verifyjob과consumer에전달한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

tarball SHA256/commit/tag/qualification일치. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

dirty candidate·tag이동·job별재pack 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-61** 입력: 동일 candidate tarball을CI·설치·출판·docs에서hash대조. 기대: 필수CI통과+공개artifact동일; native capability evidence 버전 동봉.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

이 카드는 기존 canonical verification 경로를 사용한다. 필요 없는 구현 미러 테스트를 만들지 않는다.

~~~sh
node scripts/release-candidate.js --verify <candidate-manifest> <annotated-tag>
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-RELEASE: public release action in current authorization scope. 먼저 진행할 수 있는 일: local candidate checks and review evidence.


### STEP-077 Registry docs와 공개 결과 대조

#### 진행 상태

- [ ] 계약과 선행 단계 확인
- [ ] 독립 실패 시험 작성
- [ ] 구현과 모든 소비자 연결
- [ ] 명령 실행 및 evidence 저장
- [ ] 타입·문서·Gate·인계 종료

상태 planned. 작업 묶음 WP-21. 선행 단계 STEP-076. 현재 구현 또는 테스트 성공을 뜻하지 않는다.

#### 먼저 읽을 것

- [공통 실행 규칙](roadmap/START_HERE.ko.md)와 [결정표](roadmap/DECISIONS.ko.md).
- [계약 qualification-delivery](roadmap/contracts/qualification-delivery.ko.md).

#### 수정 위치와 경계

다음은 baseline에 존재하는 소유자다. 전부 수정하라는 뜻이 아니다. source-map.json의 symbol/line/hash와 실제 checkout을 대조한 뒤 이 작업의 최소 변경점을 선택한다.

- `.github/workflows/release.yml`
- `scripts/release-candidate.js`
- `package.json`
- `package-lock.json`

새 순수 계산은 해당 domain grammar/kernel에, wrapped orchestration은 actions family에, concrete realization은 materialization에 둔다. controller/player는 별도 runtime entry다. 새 함수나 파일은 current 인벤토리에 존재한다고 주장하지 않는다. 위 계약의 공개 옵션·stored result·error·default를 구현하며, 등록 cookbook을 따른다.

#### 구현 순서

1. 필수CI와protectedpublish결과를확인한다.
2. registryintegrity와candidatehash를대조한다.
3. 공개docs/release/installedpackage를검증하여기록한다.
4. 이 변경에 영향을 받는 ref collector, revision/rematerialization, inspection, scene, codec, declarations를 consumer matrix에서 확인한다. 적용 안 되는 항목은 이유를 기록한다.
5. 기존 기능의 출력과 atomic failure를 비교하고 실패를 수정한 뒤 최소 공개 호출을 실행한다.

#### 통과해야 하는 결과

공개artifact와검증artifact동일, 실제URL/CI증거존재. 수치·옵션의 정확한 정의는 위 필수 계약과 oracle-fixtures.json을 사용한다.

#### 실패와 금지

로컬pass를공개release완료로표현 금지. invalid/empty/zero/duplicate/limit 경계 중 이 capability에 적용되는 경우를 최소 하나씩 실행한다. 실패 뒤 old program/trace equality와 async cleanup을 확인한다.

#### 인수 시험 연결

- **AT-61** 입력: 동일 candidate tarball을CI·설치·출판·docs에서hash대조. 기대: 필수CI통과+공개artifact동일; native capability evidence 버전 동봉.

acceptance-cases.json의 closureTask가 이 카드보다 뒤라면 이 카드 완료로 해당 시험군 전체를 닫지 않는다. 후행 통합 evidence를 넘긴다.

#### 시험 파일과 명령

이 카드는 기존 canonical verification 경로를 사용한다. 필요 없는 구현 미러 테스트를 만들지 않는다.

~~~sh
node scripts/release-candidate.js --verify <candidate-manifest> <annotated-tag>
~~~

명령은 ggaction repository root에서 실행한다. `<...>` 값은 실제 candidate metadata로 치환하며 그대로 실행하지 않는다. render 전체 suite 비용이 크면 기존 runner가 지원하는 selector를 먼저 확인해 좁히고 phase 종료 때 전체를 실행한다.

#### 완료 인계

progress-template.json을 복사해 실제 commit, 실행 command/exit, expected/actual/diff hash, consumer matrix cells, applicable Gate 증거를 채운다. 코드가 있는 것과 검증 성공을 구분한다. 실패하면 current scope를 줄이거나 golden을 덮지 말고 최초 깨진 invariant와 재현 입력을 다음 구현자에게 넘긴다.

**검토 경계:** 정확한 기존 승인 증거가 있으면 재사용한다. 아래 경계는 그 결정을 필요로 하는 구현에만 적용하며 독립 계산·검토 자료 준비를 중단하지 않는다. 현재 roadmap 자체가 승인을 부여하지 않는다.

- G-RELEASE: public release action in current authorization scope. 먼저 진행할 수 있는 일: local candidate checks and review evidence.
