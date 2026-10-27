## 14. 구현 작업 패키지와 의존 관계

아래 22개 작업은 모두 최종 목표에 포함된다. `WP-00`의 조사 기준은 이번 산출물로 시작할 수 있지만 향후 reference renderer와 실제 입력 oracle까지 완성해야 한다. 모든 상태는 **제안/미구현**이며 구현 완료나 추정 개발 기간을 뜻하지 않는다. 공개 API·schema 변경은 저장소 계약 절차로 확정하고, 각 작업에서 types/contracts/tests/docs를 함께 수정한다.

| ID | 작업과 산출물 | 선행 작업 | 인수 시험 |
|---|---|---|---|
| WP-00 | **현행 기반·독립 oracle 고정** — ggaction 계약·수치/geometry/state/time oracle와 환경/hash 고정; 외부 자료는 역사적 참고 | 없음 | AT-01, AT-02 |
| WP-02 | **안정적인 item identity와 lineage** — logical dataset/revision/row/item keys, lineage, key 없는 교체 정책 | WP-00 | AT-06, AT-07, AT-08 |
| WP-03 | **resource·schema·persistence 확장** — selection/parameter/geometry/layout resource 소유권, schema 3 migration, inspection | WP-02 | AT-09, AT-10 |
| WP-04 | **복합 path와 geometry 계약** — 복수 subpath, fill rule, bounds/clip/flatten, 모든 renderer와 scene 동등성 | WP-03 | AT-11, AT-12 |
| WP-06 | **data transform·expression·조건부 인코딩** — native AST/functions/pivot/statistics, parameter dependency와 조건부 채널의 자체 의미 계약 | WP-03 | AT-16, AT-17, AT-18 |
| WP-05 | **paint·image·font 자원** — pattern/필수 gradient/image, resource hash/resolve/export, text metrics | WP-03, WP-04 | AT-13, AT-14, AT-15, AT-04 |
| WP-08 | **구조형·연속 기하 layout** — tree/treemap/graph/flow/contour/calendar의 data/layout; partition은 WP-22와 공유 | WP-02, WP-04, WP-06 | AT-22, AT-23, AT-24, AT-25 |
| WP-22 | **Icicle·Sunburst 공통 partition** — normalized hierarchy partition, Cartesian/polar materializer, stable focus와 coordinate kernel | WP-02, WP-03, WP-04, WP-06 | AT-62, AT-63, AT-64, AT-65 |
| WP-24 | **규칙 기반 graph inference** — kNN/radius/similarity/MST/group/sequence, metric/preprocessing/provenance와 edge limits | WP-02, WP-03, WP-06 | AT-70, AT-71, AT-72, AT-73, AT-74 |
| WP-07 | **ggaction 디자인·가이드·반응형 조합** — 자체 theme/typography/paint/guide 우선순위와 layout solve, nested facets, 자체 합성 fixture의 배치 검증 | WP-03, WP-05 | AT-19, AT-20, AT-21 |
| WP-25 | **네 대표 edge bundling 방법** — HEB/FDEB/KDE/edge-path, 독립 EdgeRouteResource, endpoint/identity/direction 보존 | WP-04, WP-08, WP-22, WP-24 | AT-75, AT-76, AT-77, AT-78, AT-79, AT-80, AT-81, AT-82 |
| WP-10 | **geo 전체 경로** — GeoJSON/TopoJSON/identity, projection/join/fit, LOD/camera/geo marks | WP-02, WP-04, WP-05, WP-07 | AT-29, AT-30, AT-31, AT-32 |
| WP-11 | **semantic hit와 공간 인덱스** — CSS/DPR/composition/clip/frame 기반 hit, guide roles와 원본 records | WP-02, WP-04, WP-07 | AT-33, AT-34 |
| WP-26 | **자체 설계 원칙·단일 Y·조합·명칭** — ggaction-native 정책, 단일 Y frame validator, 조합 recipe, Pyramid 명칭; 외부 adapter 필수 아님 | WP-03, WP-07 | AT-83, AT-84, AT-85, AT-86, AT-87, AT-88, AT-92 |
| WP-09 | **native 차트 표현과 공통 조합 recipe** — ggaction domain semantics와 기존 액션 조합; Pyramid/table/trail/OHLC 등 역할 보강; 외부 chart catalog parity 불필요 | WP-06, WP-07, WP-08, WP-22, WP-25, WP-26 | AT-26, AT-27, AT-28 |
| WP-12 | **native selection·gesture·입력 controller** — 선택/brush/lasso/linked views/filter/legend/reorder/annotation/navigation/accessibility를 자체 계약으로 설계 | WP-03, WP-06, WP-11, WP-22, WP-24, WP-25, WP-26 | AT-35, AT-36, AT-37, AT-38 |
| WP-14 | **transition planner·sampler·player** — 정적 보간과 typed kernel, enter/update/exit, interrupt/seek/timeline, frame export | WP-02, WP-04, WP-07, WP-10, WP-11, WP-22, WP-24, WP-25, WP-26 | AT-42, AT-43, AT-44, AT-45 |
| WP-13 | **native 상태·명령·이벤트·lifecycle** — committed baseline+preview, commit/cancel, typed updates/events, async settlement, clear/reset; 외부 op 수·이름 고정 없음 | WP-07, WP-10, WP-12 | AT-39, AT-40, AT-41 |
| WP-18 | **접근성·export·복원 종단검증** — keyboard/focus/accessible data, SVG/Canvas/PNG/PDF, offline program/animation 재생 | WP-05, WP-12, WP-13, WP-14 | AT-53, AT-54, AT-55, AT-89 |
| WP-19 | **성능·배포패키지·문서·agent 지원** — 성능 SLO와 memory cleanup, clean consumer, current action/LLM/capability docs | WP-18 | AT-56, AT-57, AT-58, AT-90 |
| WP-20 | **native 계약·조합·성능 qualification** — GGA/USR 요구의 증거를 닫고 독립 oracle 검토; 외부 참고 행은 gate 밖 | WP-00, WP-18, WP-19, WP-22, WP-24, WP-25, WP-26 | AT-59, AT-60, AT-88, AT-91, AT-92 |
| WP-21 | **릴리스 후보와 공개 산출물 검증** — 동일 tarball CI/package/docs/registry artifact 확인, native capability qualification 동봉 | WP-20 | AT-61 |

### 14.1 코드 소유 위치와 병렬 작업

| ID | 구현 접점 — `(new)`는 제안 위치/모듈 |
|---|---|
| WP-00 | `native fixture/oracle harness (new)` |
| WP-02 | `src/actions/data/revise.js`; `src/actions/data/revisionBindings.js`; `src/scene.js`; `src/inspection.js` |
| WP-03 | `src/core/ChartProgram.js`; `src/grammar`; `src/persistence`; `types/program.d.ts` |
| WP-04 | `src/grammar/pathCommands.js`; `src/grammar/schemas`; `src/renderers`; `src/scene.js` |
| WP-06 | `src/actions/data`; `src/grammar/computed.js`; `src/grammar/transforms.js`; `src/actions/encodings` |
| WP-05 | `src/grammar/paint.js`; `src/renderers`; `src/actions/textMetrics`; `asset resolver (new)` |
| WP-08 | `src/actions/data`; `domain layout modules (new)`; `src/grammar` |
| WP-22 | `hierarchy layout/materializer (new)`; `src/actions/charts`; `src/grammar` |
| WP-24 | `graph inference data actions (new)`; `src/grammar`; `types` |
| WP-07 | `src/actions/guides`; `src/materialization`; `src/actions/composition`; `src/grammar` |
| WP-25 | `edge routing kernels/materializer (new)`; `src/inspection`; `src/renderers` |
| WP-10 | `geo resource/kernel/materializer (new)`; `src/grammar`; `src/renderers` |
| WP-11 | `src/inspection.js`; `src/scene.js`; `hit-test module (new)` |
| WP-26 | `policy/admission module (new)`; `src/actions/composition`; `docs` |
| WP-09 | `src/actions/charts`; `src/actions/marks`; `src/grammar/plotComposition.js` |
| WP-12 | `interaction entry/runtime (new)`; `src/actions/selection`; `types (new)` |
| WP-14 | `src/scene.js`; `animation entry/planner/player (new)`; `types/scene.d.ts` |
| WP-13 | `interaction session (new)`; `native command/event contract (new)` |
| WP-18 | `src/accessibility.js`; `src/renderers`; `src/persistence`; `browser tests` |
| WP-19 | `test/browser`; `scripts/package-consumer.js`; `knowledge`; `agent_docs`; `docs`; `types` |
| WP-20 | `qualification manifest/dashboard (new)`; `all test suites` |
| WP-21 | `existing release workflow`; `package/docs publication` |

개정 정책 WP-26을 먼저 적용한다. partition WP-22, inference WP-24, bundling WP-25는 모두 필수이며 상세 계약은 부록 F에 있다. critical path는 identity/resource → compound geometry/layout → geo/hit → interaction/animation → native runtime → 전수 검증이다. data/expression, design/layout, hierarchy/graph는 공통 계약 이후 병렬화할 수 있다. 여러 작업이 같은 core schema를 각자 정의하지 않도록 `WP-03`의 resource와 migration 계약을 먼저 고정한다.

외부 차트 이름별 PR로 나누기보다 공통 기반과 의미 단위로 나눈다. 한 PR은 domain action+validator+materializer+renderer 적용+types+문서+독립 oracle까지 수직으로 완결한다. 단, API 이름이나 snapshot만 먼저 올리고 runtime이 비어 있는 상태를 지원 완료로 표시하지 않는다.

### 14.2 요구사항 추적 원장

Flint 874개 추출 요구사항, 코퍼스 1405종 관찰 feature, 사용자 요구 22개와 native capability 10개를 합친 **2311행**의 [요구사항 원장](evidence/requirements-traceability.json)을 만들었다. [CSV](evidence/requirements-traceability.csv)에서는 작업 소유권과 시험 ID를 필터링할 수 있다. 이 행들은 서로 다른 단위이며 합계를 차트 수나 지원률로 해석하면 안 된다. 개별 옵션의 값/위치/원본 목록은 원 source inventory에 연결되어 있다. 외부 관찰 2,279행은 reference-only이며 작업·시험 소유권과 release 의무가 없다. 사용자/native 30행이 active 원장이며 UpSet 관련2행은 deferred-by-user다. 현재 routing은 구현 소유권 배정이며 합격 증거가 아니다.

WP-01/15/16/17 및 AT-03/05/46–52는 철회했다. ID를 재사용하지 않고 [철회 기록](evidence/withdrawn-flint-plan.json)에 남긴다. 외부 adapter/parity/번역은 선행 조건이 아니다.

UpSet 및 집합 시각화 WP-23, USR-03/04, AT-66–69는 후속 과제로 이관했다. 관련 data/API/interaction도 이번 필수 범위가 아니다. [후속 기록](evidence/deferred-set-visualization-plan.json)을 참고한다.

## 15. 인수 시험 명세

다음 79개는 실제 입력과 기대 결과를 정한 **추가해야 할 시험군**이다. 이번 조사에서 실행한 19개 core probe, 154개 Flint compile, 46개 번역 replay와 혼동하지 않는다. 각 행은 요구 옵션과 사례를 전개하는 generator/fixture 묶음이며 한 테스트 함수만 추가하라는 뜻이 아니다.

| ID | 입력·시나리오 | 반드시 확인할 결과 |
|---|---|---|
| AT-01 | ggaction baseline·공개 action/schema·환경 hash | 기준 버전과 계약 추적, native fixture hash 재현; 외부 저장소 실행 불필요 |
| AT-02 | 독립 numeric/geometry/state/time reference 생성 | 동일 native 입력에서 결정적 출력과 반복 가능한 oracle; 외부 엔진 필수 아님 |
| AT-04 | native data/font/map/image resource offline replay | 자원 hash·binding·오류·abort 정확; source dialect/번역 의무 없음 |
| AT-06 | 3rows 중1row값변경, 정렬, append/delete, reload | 명시 key가 같은 항목 identity 유지; old program 불변; generated key 할당 보존 |
| AT-07 | duplicate/null key 및 key없는 전체 set-data 교체 | 명시 error/occurrence/mapping/new-identity 정책; 자동 잘못 매칭 없음 |
| AT-08 | aggregate/bin/stack/fold/lookup/facet 후 hit·filter·revise | contributing row lineage와 grain 정확; series/owner/facet key 충돌 없음 |
| AT-09 | schema3 selection/highlight 프로그램을 새 버전에서 load/edit/save | 기존 상태 동등, indices→rowkey 변환 근거 보존, ambiguous 참조 명시 오류 |
| AT-10 | 새 모든 resource/action을 serialize→새프로세스 load→edit | 등록/스키마 검증·trace·inspection 일치, DOM/function/cache 유입 없음 |
| AT-11 | outer ring+hole+islands와 nonzero/evenodd를 모든 renderer로 출력 | 구멍이 실제 비어 있음; transparency/overlay에서도 topology 동일 |
| AT-12 | open/closed curved path, clipping, bounds, invalid commands | 정확한 stroke/fill/bounds, finite geometry, canonical 변환 오차 한계 검증 |
| AT-13 | 7texture와 요구 gradient/alpha를 SVG/Canvas/PNG/PDF에 출력 | pitch/phase/색/투명도/clip 일치, 지원 안 하는 paint 무음 대체 0 |
| AT-14 | native image asset와 load failure/CORS/abort/export | fit/aspect/clip·사전 진단·dispose 뒤 callback 없음 |
| AT-15 | 고정font+fallback+한글+긴label+font load delay | 실제 font hash 측정과 render 일치, stale layout 없음, line break/origin 검증 |
| AT-16 | ggaction expression AST/function과 null/date/string 경계 | 자체 타입·오류·수치 계약 일치, eval/global access 없음; 외부 DSL 번역 제외 |
| AT-17 | 모든 transform과 stats의 numeric fixtures | 독립 수식·불변식 일치; pivot/loess/bin/window/timezone/DST 포함 |
| AT-18 | parameter→filter→aggregate→scale→조건부 encoding 연쇄 | 정확한 dependency invalidation; cycle 오류; 모든 condition branch 실행 |
| AT-19 | ggaction theme token schema·override/null/false/0 | 자체 precedence와 provenance·typography·paint·guide 일치; 외부14theme 복제 불필요 |
| AT-20 | unit/layer/facet/concat/repeat와 허용 scale/guide scope | frame별 Y 하나; 분리된 facet 독립 scale 허용, bounds와 responsive 정렬 |
| AT-21 | nested facet·3행 full-bounds·긴label·resize 합성 fixture | 공통 header/plot/footer 정렬과 text metrics 정확; corpus source ID 재현 의무 없음 |
| AT-22 | hierarchy/tree/treemap의 단일/다층/빈/잘못된 구조 | cycle/orphan·containment·stable ID; 통합 partition은 AT-62~65 |
| AT-23 | graph/circular/force와 Sankey DAG/cyclic/edge 경계 | deterministic seed, node/link lineage·유량/폭·cycle routing·tooltip/adjacency |
| AT-24 | native histogram/KDE contour의 saddle/hole/disconnected/empty | 선택한 estimator/bin/threshold 계약과 독립 수치·topology oracle 일치 |
| AT-25 | calendar 윤년/연말/DST/weekStart/누락날짜 | 날짜→cell mapping과 month boundary, timezone/aggregation 정확 |
| AT-26 | native chart capability와 조합 recipe 전수 | GGA/USR별 의미·geometry·guides·behavior 검증; 외부51/154 분모 사용 금지 |
| AT-27 | Pyramid/OHLC/waterfall/table/sparkline와 reference-band 조합 | role별 의미·hit·정렬, KPI/Gauge 전용 개발 제외, 별도 Bullet facade0 |
| AT-28 | trail/polar/radar/rose/streamgraph/violin native variants | width/area/angle/baseline/bandwidth의 자체 의미·수식·missing/negative/zero 계약 |
| AT-29 | 자체 projection API와 native-supported projection/planar/inset | 수학 reference 및 forward/inverse/fit/clip 검증; Flint preset parity 아님 |
| AT-30 | GeoJSON/TopoJSON hole/dateline/pole/geometrycollection/null | ring/feature identity·clipping·join 정확; NaN path와 hidden-backside hit 없음 |
| AT-31 | custom geography levels와 region join, county/stateLOD | 중복/미매칭 정책, LOD hysteresis, 선택·annotation rebase, asset hash 보존 |
| AT-32 | geo pan/zoom/rotate/region fit/reset/resize/tween | native camera/viewport 왕복·anchor·dateline·clipped inverse 정확 |
| AT-33 | 모든 geometry와 legend/axis/header/title hit at DPR1/2/3 | CSS좌표 기준 same semantic target, clip/occlusion/stroke tolerance와 provenance 정확 |
| AT-34 | animation frame hit와 overlapping enter/exit/crossfade | 현재 보이는 geometry 선택, semantic key 중복 이벤트 없음 |
| AT-35 | native interaction command와 gesture/options/reset 충돌 | 자체 상태·event·화면 계약 일치, 실제 pointer/touch/keyboard; Flint preset 이름 불필요 |
| AT-36 | brushx/y/angular/lasso/log/time/category의 down→move→cancel/up | domain invert/0-2π crossing/빈선택·capture정리; commit1회 또는 cancel1회 |
| AT-37 | native parameter/selection bind/empty/toggle/nearest/resolve | 자체 의미와 선언된 option 계약 정확; legacy/new 외부 selection 번역 제외 |
| AT-38 | linked brush/filter/legend/reorder/controls/contextmenu | scope·order·focus 보존, origin loop 없음, 삭제된 data/child 선택 reconciliation |
| AT-39 | native update commands와 preview/commit/cancel/reset | 불변 baseline·결정적 overlay·도메인 갱신; 외부7ops 특례 복제 없음 |
| AT-40 | programmatic/user 입력의 native event 순서 | origin/phase/revision 명확, 중복 commit0, preview취소와 async settlement 정확 |
| AT-41 | mount/update/asset/resize 중 cancel/destroy/reentry | stale 결과 덮어쓰기0, 중복destroy안전, listener/timer/DOM leak0 |
| AT-42 | t=0,.25,.5,.75,1와 duration0의 deterministic transition | endpoint 동일, 색/형상/guide/kernel sample 수치와 topology 올바름 |
| AT-43 | play/pause/seek/reverse/rate/repeat/interrupt | 현재 frame에서 이어짐, finished상태정확, virtualclock 재현 |
| AT-44 | logscale/polar/geo/layout/data 동시변경 | transformed-space·camera kernel 정확, 잘못된 topology morph와 flicker 없음 |
| AT-45 | animation envelope 저장→offline 새프로세스 replay | endpoint/asset/font/kernel 버전고정, same time same frame, reduced motion 보존 |
| AT-53 | keyboard focus·screenreader표·tooltip·reducedmotion | 차트 정보와 actionable targets 접근 가능, hidden/filter 상태 일치, focus 복구 |
| AT-54 | SVG/Canvas/PNG/PDF·frame export 비교 | 같은 semantic/geometry, asset embedding/font/clip 정확, vector/raster역할명시 |
| AT-55 | 저장된 interacted chart/geo/animation offline 재개 | 필수자원 동봉, 상태/선택/viewport 복원, functions/network숨은의존없음 |
| AT-56 | sizeclass별 startup/update/hit/frame/memory benchmark | 사전에고정한SLO통과, 장비·size·P50/P95 기록, 반복mount/dispose 안정 |
| AT-57 | npm pack clean consumer, SSR/browser/Node/types | 소스checkout없는환경에서실행, optionaldeps 격리, schema/types/runtime일치 |
| AT-58 | catalog/contracts/types/examples/docs/LLM/MCP 산출물 검사 | new API계약누락0, executableexamples통과, planned와current지원구분 |
| AT-59 | active GGA/USR requirement→work→test→evidence | active orphan0·미완료0; reference-only 외부2,279행은 gate 분모 제외 |
| AT-60 | 모든 실패 diff 독립검토와 성공 stratified sample review | 통계/폰트/레이아웃/입력원인별판정, baseline대량재생성으로실패덮음없음 |
| AT-61 | 동일 candidate tarball을CI·설치·출판·docs에서hash대조 | 필수CI통과+공개artifact동일; native capability evidence 버전 동봉 |
| AT-62 | 동일 hierarchy에서 Icicle/Sunburst 생성 | 같은 normalized partition/node ID, value·순서·선택 동등 |
| AT-63 | partition 수치 fixture와 zero/internal value/forest/cycle | 독립 기대 interval·합·containment; 잘못된 구조 명시 오류 |
| AT-64 | partition orientation/padding/rootVisible/deep tree/작은 wedge | finite geometry·clip·label·hit 일치; radial area 의미 명시 |
| AT-65 | partition focus/filter/breadcrumb/keyboard/coordinate morph | 같은 node 선택 유지, 각 frame hit 정확, bend endpoint와 reduced motion |
| AT-70 | kNN directed/union/mutual와 ties·duplicate points | 수작업 fixture edge 일치, stable ID tie, 0거리 edge 유지 |
| AT-71 | radius/similarity/metric/preprocessing 경계 | inclusive radius, cosine zero/Jaccard empty/geo units/null 정책과 provenance |
| AT-72 | MST/forest/group/sequence rule | 독립 Kruskal 결과, component 수·비용, group 경계·lag·edge budget |
| AT-73 | exact accelerator와 opt-in approximate search | brute-force exact 일치, approximate seed/recall 기록, 무음 sampling0 |
| AT-74 | data revise/k change/layout drag/resize와 graph selection | topology invalidation 이유 정확, node/edge ID 및 observed/inferred 보존 |
| AT-75 | 네 bundling 방법 공통 입력 불변성 | graph/adjacency/node position 불변, edge ID/count/direction/weight·endpoint 보존 |
| AT-76 | HEB hierarchy mapping/LCA/strength0·1/누락 endpoint | independent hierarchy path oracle, 직선 endpoint, missing mapping 진단 |
| AT-77 | FDEB compatibility/subdivision/schedule/zero·opposite edges | paper reference numeric oracle, deterministic double buffer, finite 고정 endpoint |
| AT-78 | KDE grid/gradient/endpoint pin/direction/resample | density reference와 tolerance, vector route 보존, grid 밖 NaN0 |
| AT-79 | Edge-path connected/disconnected/directed/stretch | route provenance 실제 graph path, maxStretch 준수, fallback·locking 결정적 |
| AT-80 | bundle 겹침/선택/unbundle/tooltip/keyboard | candidate edge 목록 정확, 가짜 junction node0, current frame hit와 accessibility |
| AT-81 | bundle animate/interrupt/seek/revise/geo date line | endpoint attachment·ID 지속, clip/backside 정확, hidden route hit0 |
| AT-82 | bundling sizeclass/abort/worker/cache/export | stage별 SLO·메모리, incomplete 진단, SVG/Canvas/PNG/PDF route 동등 |
| AT-83 | Pyramid 공개 명칭과 단계형 geometry | 이전 Funnel 의미·order·gap·value 보존; 외부 alias 구현은 의무 아님 |
| AT-84 | Marginal/Bullet/Combo action AST와 composition fixtures | 전용 constructor0, 공통 layout/scale/role 사용, 같은 frame Y 공유 |
| AT-85 | 같은 frame에 두 Y scale/guide·숨긴축·mirror axis | 모두 정책 오류, 독립 scale 숨김·overlaid frame 우회 금지 |
| AT-86 | 독립 facet/concat panels·y2 range·polar/geo | 합법적 별도 frame/범위 endpoint 오탐0; native frame 의미로 단일 Y 검증 |
| AT-87 | KPI/Gauge 전용 API 제외와 docs/LLM scope | 필수개발·새 facade로 재유입0; 외부 입력 adapter admission은 의무 아님 |
| AT-88 | native 정책과 외부 참고 원장의 분리 | native fixture에 단일Y·조합·제외 정책 적용; 외부 reference-only를 pass/필수로 집계하지 않음 |
| AT-89 | 새 resource/action save/load/type/schema/clean consumer | JSON codec·refs·version·lineage 왕복, source checkout/DOM 숨은 의존0 |
| AT-90 | 신규 domain docs/agent packet/recipes/option presets | planned/current 구분, parameter defaults/version 고정, 실행 예제와 negative cases |
| AT-91 | native completion manifest와 기존 CI | 필수 GGA/USR qualification과 공개artifact 일치; 외부 호환성·번역 미요구 |
| AT-92 | core/API/event/defaults/dependency/release gate 독립성 | Flint·번역기 import, upstream 변경·adapter·corpus parity의 필수 의존0; native 기능 축소0 |
