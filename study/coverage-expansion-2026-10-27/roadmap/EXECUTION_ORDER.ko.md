# 실행 순서와 작업 인계

총 77개 실행 카드, 22개 작업 묶음, 79개 인수 시험군, 30개 활성 요구다. 모든 카드는 planned다.

| 순서 | 작업 | 선행 카드 | WP |
|---|---|---|---|
| STEP-001 | [기준 버전과 실행 경로 고정](tasks/STEP-001-baseline.ko.md) | 없음 | WP-00 |
| STEP-002 | [독립 oracle와 fixture harness](tasks/STEP-002-oracle-harness.ko.md) | STEP-001 | WP-00 |
| STEP-003 | [시험 발견과 evidence 기록](tasks/STEP-003-test-discovery.ko.md) | STEP-002 | WP-00 |
| STEP-004 | [명시 key와 생성 row identity](tasks/STEP-004-row-identity.ko.md) | STEP-003 | WP-02 |
| STEP-005 | [모든 transform의 final grain lineage](tasks/STEP-005-derived-lineage.ko.md) | STEP-004 | WP-02 |
| STEP-006 | [Scene selection과 revision 연결](tasks/STEP-006-scene-identity.ko.md) | STEP-005 | WP-02 |
| STEP-007 | [Typed resource schema와 ownership](tasks/STEP-007-resource-registry.ko.md) | STEP-006 | WP-03 |
| STEP-008 | [리소스 edit remove와 재계산](tasks/STEP-008-resource-lifecycle.ko.md) | STEP-007 | WP-03 |
| STEP-009 | [Schema 4와 역사적 program 복원](tasks/STEP-009-schema-migration.ko.md) | STEP-008 | WP-03 |
| STEP-010 | [복수 subpath validator와 path builder](tasks/STEP-010-compound-path.ko.md) | STEP-009 | WP-04 |
| STEP-011 | [Bounds flatten stroke와 clip kernel](tasks/STEP-011-geometry-math.ko.md) | STEP-010 | WP-04 |
| STEP-012 | [모든 renderer와 scene의 복합 path](tasks/STEP-012-compound-render.ko.md) | STEP-011 | WP-04 |
| STEP-013 | [안전한 AST와 typed function registry](tasks/STEP-013-expression-ast.ko.md) | STEP-009 | WP-06 |
| STEP-014 | [통계와 pivot LOESS 경계 보강](tasks/STEP-014-statistics-oracles.ko.md) | STEP-013 | WP-06 |
| STEP-015 | [Timezone과 calendar용 날짜 grain](tasks/STEP-015-time-transform.ko.md) | STEP-014 | WP-06 |
| STEP-016 | [Parameter와 조건부 encoding invalidation](tasks/STEP-016-conditional-dataflow.ko.md) | STEP-015 | WP-06 |
| STEP-017 | [7가지 pattern과 gradient](tasks/STEP-017-paint-resources.ko.md) | STEP-009, STEP-012 | WP-05 |
| STEP-018 | [이미지 resolver와 offline 자원](tasks/STEP-018-image-resolver.ko.md) | STEP-017 | WP-05 |
| STEP-019 | [Font identity와 text rematerialization](tasks/STEP-019-font-metrics.ko.md) | STEP-018 | WP-05 |
| STEP-020 | [Hierarchy tree와 treemap](tasks/STEP-020-hierarchy-layouts.ko.md) | STEP-006, STEP-012, STEP-016 | WP-08 |
| STEP-021 | [Observed graph와 fixed circular force 배치](tasks/STEP-021-graph-layouts.ko.md) | STEP-020 | WP-08 |
| STEP-022 | [Sankey DAG와 cyclic routing](tasks/STEP-022-flow-layouts.ko.md) | STEP-021 | WP-08 |
| STEP-023 | [Grid contour와 density contour](tasks/STEP-023-contour-layouts.ko.md) | STEP-022 | WP-08 |
| STEP-024 | [Calendar cell과 month boundary](tasks/STEP-024-calendar-layout.ko.md) | STEP-023 | WP-08 |
| STEP-025 | [공통 hierarchy value mode](tasks/STEP-025-partition-values.ko.md) | STEP-006, STEP-009, STEP-012, STEP-016 | WP-22 |
| STEP-026 | [Normalized partition 구간](tasks/STEP-026-partition-intervals.ko.md) | STEP-025 | WP-22 |
| STEP-027 | [Icicle와 Sunburst materializer](tasks/STEP-027-partition-marks.ko.md) | STEP-026 | WP-22 |
| STEP-028 | [Focus breadcrumb와 bend 준비](tasks/STEP-028-partition-navigation.ko.md) | STEP-027 | WP-22 |
| STEP-029 | [Metric preprocessing과 stable edge key](tasks/STEP-029-graph-metrics.ko.md) | STEP-006, STEP-009, STEP-016 | WP-24 |
| STEP-030 | [kNN radius similarity exact rules](tasks/STEP-030-graph-neighbors.ko.md) | STEP-029 | WP-24 |
| STEP-031 | [MST forest group sequence](tasks/STEP-031-graph-rules.ko.md) | STEP-030 | WP-24 |
| STEP-032 | [Exact accelerator approximate와 수정 연결](tasks/STEP-032-graph-search-revision.ko.md) | STEP-031 | WP-24 |
| STEP-033 | [Native theme과 property provenance](tasks/STEP-033-theme-precedence.ko.md) | STEP-009, STEP-019 | WP-07 |
| STEP-034 | [Guide와 responsive layout solve](tasks/STEP-034-layout-solver.ko.md) | STEP-033 | WP-07 |
| STEP-035 | [Nested facet와 shared guide 정렬](tasks/STEP-035-nested-composition.ko.md) | STEP-034 | WP-07 |
| STEP-036 | [Edge route 공통 kernel과 budget](tasks/STEP-036-route-resource.ko.md) | STEP-012, STEP-024, STEP-028, STEP-032 | WP-25 |
| STEP-037 | [Hierarchy path와 B-spline bundling](tasks/STEP-037-hierarchical-bundling.ko.md) | STEP-036 | WP-25 |
| STEP-038 | [FDEB compatibility와 iterative solver](tasks/STEP-038-force-edge-bundling.ko.md) | STEP-037 | WP-25 |
| STEP-039 | [KDE field gradient와 vector advection](tasks/STEP-039-density-bundling.ko.md) | STEP-038 | WP-25 |
| STEP-040 | [Weighted path lock와 stretch](tasks/STEP-040-edge-path-bundling.ko.md) | STEP-039 | WP-25 |
| STEP-041 | [Bundling 선택 worker cache export 연결](tasks/STEP-041-bundling-consumers.ko.md) | STEP-040 | WP-25 |
| STEP-042 | [GeoJSON TopoJSON 정규화](tasks/STEP-042-geometry-data.ko.md) | STEP-006, STEP-012, STEP-019, STEP-035 | WP-10 |
| STEP-043 | [Projection registry와 forward inverse](tasks/STEP-043-projection-kernels.ko.md) | STEP-042 | WP-10 |
| STEP-044 | [Date line clip fit와 geo marks](tasks/STEP-044-geo-stream.ko.md) | STEP-043 | WP-10 |
| STEP-045 | [Geometry join과 hierarchy LOD](tasks/STEP-045-geo-join-lod.ko.md) | STEP-044 | WP-10 |
| STEP-046 | [Camera navigation과 viewport contract](tasks/STEP-046-geo-camera.ko.md) | STEP-045 | WP-10 |
| STEP-047 | [Geometry별 exact hit와 CSS 좌표](tasks/STEP-047-hit-shapes.ko.md) | STEP-006, STEP-012, STEP-035 | WP-11 |
| STEP-048 | [공간 인덱스와 guide semantic roles](tasks/STEP-048-hit-index.ko.md) | STEP-047 | WP-11 |
| STEP-049 | [Frame hit와 transition bridge](tasks/STEP-049-hit-frame.ko.md) | STEP-048 | WP-11 |
| STEP-050 | [다섯 경계의 단일 Y 검증](tasks/STEP-050-single-y-policy.ko.md) | STEP-009, STEP-035 | WP-26 |
| STEP-051 | [명칭과 조합 및 제외 정책](tasks/STEP-051-native-api-policy.ko.md) | STEP-050 | WP-26 |
| STEP-052 | [외부 정합성 없는 core 경계](tasks/STEP-052-native-boundaries.ko.md) | STEP-051 | WP-26 |
| STEP-053 | [Pyramid OHLC waterfall 역할 구현](tasks/STEP-053-pyramid-ohlc-waterfall.ko.md) | STEP-016, STEP-035, STEP-024, STEP-028, STEP-041, STEP-052 | WP-09 |
| STEP-054 | [Trail과 polar 통계 variant](tasks/STEP-054-trail-native-variants.ko.md) | STEP-053 | WP-09 |
| STEP-055 | [Cell table과 compact chart recipe](tasks/STEP-055-table-sparkline.ko.md) | STEP-054 | WP-09 |
| STEP-056 | [Marginal Bullet Combo 종단 recipe](tasks/STEP-056-composition-recipes.ko.md) | STEP-055 | WP-09 |
| STEP-057 | [Persistent selection과 parameter bindings](tasks/STEP-057-selection-state.ko.md) | STEP-009, STEP-016, STEP-049, STEP-028, STEP-032, STEP-041, STEP-052 | WP-12 |
| STEP-058 | [Pointer capture와 gesture state machine](tasks/STEP-058-gesture-controller.ko.md) | STEP-057 | WP-12 |
| STEP-059 | [Brush lasso angular와 scale inversion](tasks/STEP-059-brush-lasso.ko.md) | STEP-058 | WP-12 |
| STEP-060 | [Linked filter legend reorder annotation](tasks/STEP-060-linked-direct-controls.ko.md) | STEP-059 | WP-12 |
| STEP-061 | [Stable matching과 transition 계획](tasks/STEP-061-transition-plan.ko.md) | STEP-006, STEP-012, STEP-035, STEP-046, STEP-049, STEP-028, STEP-032, STEP-041, STEP-052 | WP-14 |
| STEP-062 | [Deterministic sampler와typed kernels](tasks/STEP-062-transition-sampler.ko.md) | STEP-061 | WP-14 |
| STEP-063 | [Virtual clock과 timeline playback](tasks/STEP-063-animation-player.ko.md) | STEP-062 | WP-14 |
| STEP-064 | [Animation 저장과 frame export](tasks/STEP-064-animation-envelope.ko.md) | STEP-063 | WP-14 |
| STEP-065 | [Committed baseline과 preview transaction](tasks/STEP-065-session-transactions.ko.md) | STEP-035, STEP-046, STEP-060 | WP-13 |
| STEP-066 | [Native events와 async settlement](tasks/STEP-066-session-events.ko.md) | STEP-065 | WP-13 |
| STEP-067 | [Update resize asset worker destroy 경쟁](tasks/STEP-067-session-lifecycle.ko.md) | STEP-066 | WP-13 |
| STEP-068 | [Keyboard focus와 accessible data](tasks/STEP-068-accessible-interactions.ko.md) | STEP-019, STEP-060, STEP-067, STEP-064 | WP-18 |
| STEP-069 | [네 포맷과 offline fresh-process 복원](tasks/STEP-069-export-restore.ko.md) | STEP-068 | WP-18 |
| STEP-070 | [현재 frame와 모든 deferred 통합 의무 종료](tasks/STEP-070-cross-feature-integration.ko.md) | STEP-069 | WP-18 |
| STEP-071 | [Size class SLO와 memory](tasks/STEP-071-performance-qualification.ko.md) | STEP-070 | WP-19 |
| STEP-072 | [새 exports와 source-free package](tasks/STEP-072-package-consumers.ko.md) | STEP-071 | WP-19 |
| STEP-073 | [Current contracts와 agent packets](tasks/STEP-073-human-agent-docs.ko.md) | STEP-072 | WP-19 |
| STEP-074 | [Native 요구와 consumer matrix 종료](tasks/STEP-074-native-qualification.ko.md) | STEP-003, STEP-070, STEP-073, STEP-028, STEP-032, STEP-041, STEP-052 | WP-20 |
| STEP-075 | [실패와 성공 표본 독립 검토](tasks/STEP-075-independent-review.ko.md) | STEP-074 | WP-20 |
| STEP-076 | [동일 candidate와 tag 기반 검증](tasks/STEP-076-release-candidate.ko.md) | STEP-075 | WP-21 |
| STEP-077 | [Registry docs와 공개 결과 대조](tasks/STEP-077-published-release.ko.md) | STEP-076 | WP-21 |

## 단계 종료 표

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

## 교차 기능 의무

| 먼저 구현 | 뒤에서 닫을 의무 | 종료 카드 |
|---|---|---|
| STEP-028 | focus/keyboard/bend/current-frame hit | STEP-070 |
| STEP-041 | overlap selection/animation/geo/export | STEP-070 |
| STEP-049 | 실제 sampler와 current scene 교체 | STEP-070 |
| STEP-046 | gesture/LOD/tween/restore | STEP-070 |
| STEP-064 | source-free offline four-format export | STEP-069 |
