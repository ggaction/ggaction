# 단일 Y 정책 통합 검증과 릴리스 계약

## Frame 단위 single Y

Cartesian frame은 같은 plot region에서 한 coordinate mapping으로 데이터를 읽는 semantic owner다. layer ID와 같지 않다. overlay/compose layer는 같은 frameId를 공유하고 독립 facet/concat panel은 별도 frameId다. frame에 속한 모든 y/y2 encoding의 resolved scale identity가 하나여야 한다. y2는 범위 endpoint로 같은 scale에 map된다. 같은 numerical domain이라는 이유만으로 별도 scale 두 개를 허용하지 않는다.

표시 Y guide는 최대 하나다. mirrored second axis도 거부한다. guide를 숨겨도 independent scale이 남으면 error다. 같은 plot rect에 independent frame을 overlay하여 정책을 우회하는 구성도 reject한다. 겹침을 일부 허용하는 일반 annotation/image와 독립 척도를 가진 plot-frame overlap을 구분한다. 좌표계가 polar/geo/parallel이면 Cartesian Y validator를 잘못 적용하지 않는다.

검증 위치는 public create/edit preflight, semantic schema validator, composition binding validation, materialized frame metadata validation, deserialize validation 다섯 곳이다. 다섯 구현을 복제하지 않고 한 pure validator와 boundary별 adapter를 쓴다. 새 state를 before mutation에 검사한다. 오류에 frameId와 conflicting scale/guide owner 목록을 담는다.

## Consumer completion matrix

모든 신규 mark family/geometry는 아래 열을 갖는 matrix row다. 열: create, edit, source revise, encodings, scales, guides, nested composition, selection/highlight, hit, scene/animation, SVG, Canvas, PNG, PDF, persistence, types, package, docs, accessibility. 상태는 required/passed/failed/not-run/not-applicable이고 N/A에는 이유가 필수다. marks만 렌더되면 row 전체 passed로 바꾸지 않는다.

행은 compound path, pattern, image, partition Cartesian, partition polar, tree, treemap, graph nodes, graph edges 4method, Sankey DAG, Sankey cyclic, contour line, contour filled, calendar, table, Pyramid, OHLC, waterfall, trail, geo shape, geo point, geo line, graticule이다. 기존 rose/radar/streamgraph/violin은 regression row로 추가한다. 상호작용 row는 pointer/keyboard/touch, preview/commit/cancel, undo/redo, linked, async/dispose, restore가 별도 축이다.

## 필수 종단 시나리오

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

## 시험 계층과 명령

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

## 성능 기준 제안

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

## 패키지와 agent 문서

브라우저 entry에는 Node-only canvas/fs/worker_threads가 유입되지 않아야 한다. ggaction/png/pdf만 optional native dependencies를 요구한다. interaction/animation 추가 export의 imports/types/browser-safe bundle budget을 package consumer로 검사한다. npm pack 산출물을 temp directory에 설치하고 source checkout 없는 환경에서 program 생성→serialize→load→edit→render를 수행한다.

새 action마다 shortest call, complete call, options/defaults, target inference, stored result, trace, revise/remove, invalid cases, supported consumers를 current contract에 작성한다. action catalog, relationships, cards, knowledge/task packet, docs/LLM manifest, inspection descriptor, MCP exposure, type declaration, executable example을 동기화한다. planned 기능은 구현 완료 전 current 문서에 올리지 않는다. 다음 약한 모델용 packet은 action chain+입력+expected+negative case+수정 경로+파일 링크를 포함한다. source code 전체를 복제해 별도 진실로 만들지 않는다.

## Release 순서

기능 qualification의 모든 active requirement30과 AT79가 실제 evidence로 닫히고 consumer matrix의 required cell이 남지 않아야 한다. excluded/deferred/reference를 성공으로 세지 않는다. 독립 reviewer가 실패 전부와 domain별 성공 표본을 확인한다. 대량 snapshot 갱신은 reason/semantic evidence 없는 한 금지한다.

당시 사용자가 릴리스를 승인한 범위에서 version/CHANGELOG/types/docs를 정리하고 clean candidate commit을 만든다. annotated tag와 package/lock version 및 commit 일치 확인→tag ref에서 release workflow dispatch→canonical candidate tarball 한번 생성→모든 verify job에서 같은 artifact 다운로드→consumer/coverage/render/docs/qualification→protected publish→registry artifact의 hash/integrity와 candidate 대조→공개 docs/release links 검증 순서다. git HEAD, CI 성공, npm publication, Pages publication을 각각 확인한다. 하나가 나머지를 증명하지 않는다.

실패 시 이전 public release를 삭제하거나 tag를 이동하지 않는다. 미공개 candidate는 원인 수정 후 새 candidate identity로 다시 검증한다. 이미 공개된 version은 덮어쓰지 말고 fix release 계획을 세운다. 릴리스 보고에는 exact commit/tag/tarball SHA256/registry integrity/CI run/docs URL과 남은 제한을 포함한다.
