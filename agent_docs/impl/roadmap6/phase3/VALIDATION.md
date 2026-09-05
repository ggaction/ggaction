# Phase 3 — A/V 검증과 구현 acceptance

상태: A 승인 기준과 V primitive 검증 증거. 새 API 구현 결과는 아니다.
공개 결정은 [CONTRACT_REVIEW.md](CONTRACT_REVIEW.md), 승인 경계는 [GATES.md](GATES.md)가 소유한다.
검토 package [`bd18718a9c1aed5f91b485bc1aeab54616e9e5a3`](https://github.com/ggaction/ggaction/commit/bd18718a9c1aed5f91b485bc1aeab54616e9e5a3)을 원격 branch에 push했다.

## A 준비 당시 실행한 검증

기준 commit `9625e71c374868756652fb8dff8153dc61500c6e`, source tree
`9d3bd5e26b67634851e6009faac4b8c7c9e15002`, types tree `25e66ad6bb83ea1481194255e3521d5f2911dbea`.

| 검증 | 결과 |
| --- | --- |
| Frozen baseline source와 JSON | 52/52 관측 일치, earlier program/trace 불변 |
| 아래 기존 test 27 files | 176/176, fail/cancelled/skip 0 |
| 최종 문서의 실제 lower chain | 3/3 실행, Pie 2 sectors / Density 2 paths / Horizon 6 paths 및 trace 확인 |
| 최종 navigation/documentation-truth | 10/10, fail/skip 0 |
| Review Markdown local routes/anchors | 11 files의 214 links 확인, GitHub heading slug 기준 오류 0 |
| 원장/범위/whitespace | 47 findings / 46 work packages / 12 phases, P2 X approved·P3 A 미승인·F20 제외; diff check 통과 |
| 새 API·new primitive render | 미실행. A와 V 승인 전 범위 |
| 누적 suite·coverage·package·realistic·browser | 이번 A에서 재실행하지 않음. 동일 runtime의 Phase 2 승인 결과 참조 |

Probe의 `rejected`는 예상한 lower rejection이며 production bug 수정으로 세지 않는다.
Fixtures/options는 freeze하고 모든 action 전후의 원래 program/trace를 deep compare한다.
Script는 기준 source tree와 src/types diff가 달라지면 중단한다. 향후 구현된 source에서 현재 baseline을
새 결과로 덮어쓰지 말고 baseline 또는 이 review commit을 checkout해 재현한다.
일반 확인은 flag 없이 실행하며 `--record`는 의도적으로 review snapshot을 갱신할 때만 쓴다.

~~~sh
export TMPDIR="$PWD/.artifacts/repository-study/tmp"
export NPM_CONFIG_CACHE="$PWD/.artifacts/repository-study/npm-cache"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.artifacts/repository-study/browsers"

node agent_docs/impl/roadmap6/phase3/baseline.probes.mjs
node --test \
  test/charts/cars-density-area/integration.test.js \
  test/charts/cars-density-area/primitive.test.js \
  test/charts/cars-density-area/public.test.js \
  test/charts/cars-density-area/reference-values.test.js \
  test/charts/cars-density-area/variants/primitive.test.js \
  test/charts/gapminder-horizon/primitive.test.js \
  test/charts/gapminder-horizon/public.test.js \
  test/charts/polar-arcs/primitive.test.js \
  test/charts/polar-arcs/public.test.js \
  test/charts/polar-arcs/reference-values.test.js \
  test/contracts/agent-docs-navigation.test.js \
  test/contracts/documentation-truth.test.js \
  test/unit/actions/charts/facade-guide-reuse.test.js \
  test/unit/actions/data/density-data.test.js \
  test/unit/actions/data/horizon-data.test.js \
  test/unit/actions/encodings/edit-density.test.js \
  test/unit/actions/encodings/edit-horizon.test.js \
  test/unit/actions/encodings/encode-density.test.js \
  test/unit/actions/encodings/encode-horizon.test.js \
  test/unit/actions/guides/density-guides.test.js \
  test/unit/actions/marks/arc-mark.test.js \
  test/unit/actions/marks/create-arc-mark.test.js \
  test/unit/actions/marks/density-area.test.js \
  test/unit/actions/selection/arc-selection.test.js \
  test/unit/grammar/arcs.test.js \
  test/unit/grammar/categorical-density.test.js \
  test/unit/grammar/horizon.test.js
git diff --check
~~~

Local logs: `.artifacts/roadmap6-authoring/phase3-baseline.log`,
`phase3-focused.log`, `phase3-focused-files.json`, `phase3-navigation.log`,
`phase3-document-calls.json`, `phase3-package-check.json`.
Remote reproduction은 위 명령과 git에 포함된 probe/source/JSON을 사용한다.
176건에는 기존 chart의 lower/primitive equivalence가 포함되며 새 Phase 3 facade 검증이라고 부르지 않는다.

A 준비 중 Arc scalar fill→color는 이미 오류였고, Horizon의 explicit lower folded y/legend는 허용됨을 확인해
probe와 계약을 교정했다. 최종 관측은 성공 여부뿐 아니라 error message, actual encoding/provenance,
count/guide/trace를 보존한다. Source 수정은 없었다.

## A 승인 이후 실제 검증

세 계약을 Planned에 등록했다(Current 174, Planned 3). Public facade와 declarations는 미구현이다.
Primitive source는 `fa603c29e820014caae7b8c0d9d205b34e2cc241`이며 원격 branch에 push했다.

| 검증 | 결과 |
| --- | --- |
| Planned registry / contracts | 260/260, fail/skip 0 |
| 새 active slice의 normal tests | 19/19; sector commands, KDE samples, Horizon folded rows와 guides·정확한 target calls |
| 전체 normal suite | 2,451/2,451, fail/cancelled/skipped 0. 이전 2,432에 새 19개 추가 |
| 세 slice의 PNG render tests | 9/9, 2000×1400 PNG, 12개 plot 영역의 ink와 필요한 색 확인 |
| Commit에 고정한 review generator | 9개 primitive 재생성, source/input/semantic/graphics/order/Canvas/PNG/decoded pixel hash 기록 |
| Generated HTML의 실제 브라우저 확인 | 9개 image 로드, 9개 표시 호출이 manifest와 일치, page error·viewport overflow 0 |
| 최종 navigation/documentation truth·기존 baseline 재현 | 10/10, 기존 52/52 관측 일치; 원래 program/trace 불변 |
| 검토 원장·source/artifact 정합성 | 9 variants, source 파일 hash 54회·PNG hash 9개·metadata 호출 9개 일치. 47 findings / 46 work packages / 12 phases, F20 제외 |
| 변경 Markdown local links | 16 files의 481개 경로/heading 확인. 기존 navigation test와 같은 case-insensitive fragment 정책; 기존 mixed-case 21개 포함 |
| 새 public flow와 parity | 미실행. V 승인 뒤 구현 범위 |

독립 oracle와 실제 PNG·call은 [VISUAL_REVIEW.md](VISUAL_REVIEW.md),
기계 판독 결과는 [visual-results.json](visual-results.json)을 따른다.
Density grid의 잘못된 테스트 가정을 y축 기준으로 고쳤고, Horizon 시각 fixture는 7개 관측값으로 구체화했다.
API/options/default/source/types는 바꾸지 않았다. 기존 2점 baseline은 보존한다.

Local logs: `.artifacts/roadmap6-authoring/phase3-planned-contracts.log`, `phase3-normal.log`,
`phase3-visual-normal.log`, `phase3-final-focused.log`, `phase3-visual-render.log`,
`phase3-review-generation.log`, `phase3-review-html.log`, `phase3-navigation.log`,
`phase3-baseline-replay.log`, `phase3-review-integrity.json`, `phase3-links.json`. 재현 명령은 시각 검토 문서에 있다.

## 동일 source의 누적 기준

[Phase 2 결과](../phase2/REVIEW.md)의 normal suite **2,432/2,432**, realistic **167/167**,
contracts **260/260**, PNG **22/22**, browser **2/2**, installed consumer exit 0을 기준으로 삼는다.
Coverage는 lines 95.03% / branches 91.15% / functions 98.75%, critical-file 72 floors 통과.
Package SHA-256 `f7c6f0e0f18140b237970a965148ba326034779c693991635e134aadfa1c8108`.
Full/Basic/SVG gzip은 234,258 / 124,897 / 6,418 bytes다. 이 package를 Phase 3 구현 결과로 배포하지 않는다.

## 승인 뒤 적용할 consumer matrix

아래는 필요한 acceptance이며 아직 통과한 새 구현 결과가 아니다. Stable tests는 capability-oriented
`test/`에 두고 Phase 3 완료 뒤 product test가 이 roadmap의 baseline script를 import하지 않게 한다.

| 소비자/경계 | Pie/Donut | Density | Horizon |
| --- | --- | --- | --- |
| H0 completion | 필수 category, count/sum, theta만으로 sectors | 필수 field, baseline KDE+area | 필수 x/y, signed bands; all-baseline만 정당한 empty |
| Lower parity | Same source/arc/theta/color/guide chain | Same source/KDE params/orientation/color/guide | Same source/folding/coordinate/opacity/guide |
| Numeric oracle | count 2:1, weight 5:5, sum of sweep, ratio .55 | 고정 Gaussian/grid 수치, group N과 count/unit 비율 | sign별 band clipping, extent·bandHeight, folded [0,1], timestamp |
| Guide defaults | axes/grid 0, category color legend 1 | value/density axes, 두 방향 모두 현행 y축 기준 horizontal grid, explicit group color legend | x axis/vertical grid만 |
| Guide conflicts | axes/grid object, 없는 color의 explicit legend, foreign target | foreign coordinate/scale/legend·unsupported gradient | y/horizontal/legend false 외 요청, foreign x scale |
| Reuse | Compatible Arc categorical recipe reuse, missing parts completion | Existing compatible axes/grid/color legend | Existing compatible x guides; explicit tick/style 충돌 |
| Scalar style | color+fill 오류, color:false+fill, padAngle/radius/opacity | color+fill 오류, explicit area style, lower stroke 제한 | palette ownership, explicit opacity가 encode 뒤 적용 |
| Revisions | Theta sum↔count, inner radius·padding·color assignment | editDensity bandwidth/extent/steps, supported source/group revision | editHorizon baseline/bands/palette/source revision, edited style 보존 |
| Scale | Existing theta domain/range/reverse·color palette | Value/density domain, zero baseline, shared-scale consumer preflight | x time/numeric scale, fixed folded y, shared scale preflight |
| Canvas | Frame resize와 legend reposition; sector ratio 보존 | Orientation별 path/domain/axes rematerialization | Folded paths/x guides/opacity rematerialization |
| Selection/highlight | Final sector key/members·stale selector 오류 | Derived profile selector의 현행 지원·stats revision compatibility | Derived final-item 의미·bands revision compatibility; raw amplitude selector를 신규 보장하지 않음 |
| Data/filter | Existing supported filtered source, all-zero/empty 오류 | Retained valid rows, output naming/collision·invalid profile 오류 | Existing missing policy, duplicated/invalid x, source group compatibility |
| Remove/recreate | Existing lower remove/assignment lifecycle·new id 생성 | Owned stats/encoding removal의 current boundary | Owned transform removal의 current boundary |
| Trace | createArcMark→encodeTheta→color?→guide | createAreaMark→encodeDensity→color?→guide | createAreaMark→coordinate?→encodeHorizon→opacity edit?→guide |
| Renderer | Ordinary paths + categorical guides | Ordinary closed paths + Cartesian guides | Ordinary closed paths + x guides |
| Future N/A | New theta order Phase 4, labels Phase 5, generic bind/filter Phase 6 | Orientation role edit Phase 6, metadata join 없음, category placement는 Violin | New amplitude guide·small multiples는 별도 guide/composition owner |

이 단계는 새 mark family를 만들지 않지만 기존 모든 applicable consumer를 통과해야 complete facade로 닫는다.
지원되는 consumer와 미지원 consumer를 타입·docs·runtime에서 일치시키고 실패 전에 이전 program/caller 입력을 보존한다.
기존 제한을 조용히 확대하는 구현이 필요하면 독립 결정으로 검토한다.

## Declaration·discovery·package acceptance

- 세 create methods의 required roles와 반환 ChartProgram. full positive, basic negative installed test.
- Pie count/sum discriminated union: value-only, sum-without-value, count+value, quantitative category,
  numeric scalar color, radius/size/labels option을 negative로 고정한다.
- Pie category scale는 band와 meaningful id/domain/range/reverse만. PadAngle·radius·stroke 등 수치 제한은 runtime로 검증한다.
- Density는 groupBy string/false, baseline-only, supported scales/output names. color는 nominal group field,
  no target/source/placement/tuple/center/stack. 타입으로 표현 못 하는 field equality는 runtime 검증한다.
- Horizon x temporalUnit discriminated union, folded y [0,1], no generic fill/color, x-only guide union.
  Required x/y와 explicit coordinate→existing child를 strict type/runtime 양쪽에서 확인한다.
- Exact same full methods registration = Current declarations = action index/catalog/cards = generated docs.
  예상 direct count 177, basic 표면 동일. 신규 Planned 잔여 0은 구현 후 X에서 확인한다.
- MCP Pie/Donut·Density·Horizon 반환 snippet을 실제 실행. Required encoding, item grain, owner source,
  automatic guide와 unresolved reporting 확인. Raw mark/transform lower 요청을 facade로 바꾸지 않는다.
- Full 235,000 / Basic 125,000 / SVG 25,000 bytes gzip ceilings 유지. 초과를 임의 상향·검증 제외로 해결하지 않는다.
- 구현에 맞는 unit/contracts/types 뒤 normal cumulative suite, realistic corpus, installed browser/package,
  docs generation/drift, coverage/critical floors를 수행한다. 이미 통과한 전체 검사를 이유 없이 반복하지 않는다.

## V evidence와 closeout

승인된 A에 따라 9개 primitive targets를 source/manifest/dimensions/values/public call과 함께 작성·렌더링했다.
`.artifacts/test/png/review/<chart>/<variant>/`와 git의 source를 함께 제공한다.
V에서는 plot-region ink와 independent numeric oracle를 확인하고, 새 public API를 실행했다고 표기하지 않는다.

승인된 target만 public flow를 구현한다. 같은 실행에서 exact graphicSpec, draw order, Canvas drawing calls,
decoded PNG RGBA parity를 확인한다. SVG/PDF는 현재 path/guide dispatch의 실제 출력을 검증한다.
All-baseline empty test는 nonempty visual target의 ink assertion과 분리한다.
X에서 stable capability owners로 evidence를 이전하고 review artifacts·완료 roadmap executable dependency를 정리한다.
