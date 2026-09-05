# Phase 3 시각 검토 — Pie · Density · Horizon

## 검토 상태와 승인 범위

**R6-P3-A와 R6-P3-V는 승인되었다.** 2026-09-05 사용자가 “승인한다”로 아래 9개 target과 호출을 승인했다. 아래는 V 승인 당시의 snapshot이다(Current 174 / Planned 3, public 미구현). 구현 진척은 [STEP1](STEP1.md)을 따른다.

[전체 검토 화면](../../../../.artifacts/roadmap6-authoring/phase3-visual-review.html)은 9개 이미지마다
**구현할 정확한 public 호출**과 **현재 실행한 primitive source**를 함께 표시한다.
[9개 이미지 개요](../../../../.artifacts/roadmap6-authoring/phase3-visual-overview.png)와
[source·input·semantic·PNG·pixel hash 및 수치 기록](visual-results.json)도 제공한다.
이미지와 HTML은 gitignored 산출물이며 아래 명령으로 재생성한다.

Primitive source commit은 [`fa603c29e820014caae7b8c0d9d205b34e2cc241`](https://github.com/ggaction/ggaction/commit/fa603c29e820014caae7b8c0d9d205b34e2cc241)이다.
검토 package [`1f7debaab66856597deaf8a039648ce23b123e41`](https://github.com/ggaction/ggaction/commit/1f7debaab66856597deaf8a039648ce23b123e41)를 원격 branch에 push했다.
승인 기록은 [GATES.md](GATES.md#r6-p3-v--visual-target)가 소유한다.

이번 V는 아래 9개 결과와 공개 호출의 대응을 승인하는 단계다. 승인되면 A의 P3-C01–C07에 따라
세 facade를 구현하고 하위 편집·trace·types·discovery·package 및 렌더링 동등성을 검증한다.
V 승인이 Phase 3 구현 완료나 X 승인으로 간주되지는 않는다.

## 실제 시각 목표

공통 Canvas는 **1000×700, margin 150**, PNG는 **pixelRatio 2의 2000×1400**이다.
표의 숫자는 source/reference test로 검증했고, 실제 PNG의 plot 영역에서 필요한 색과 ink를 별도로 검사했다.

| # | Variant | 입력과 승인할 의미 | 실제 이미지 |
| --- | --- | --- | --- |
| 1 | pie-plot/count | A가 2행, B가 1행. Count 2:1 → 240°/120°. Category color legend만 표시 | [PNG](../../../../.artifacts/test/png/review/pie-plot/count/primitive.png) |
| 2 | pie-plot/weighted | A의 2+3, B의 5를 explicit sum. 5:5 → 180°씩 | [PNG](../../../../.artifacts/test/png/review/pie-plot/weighted/primitive.png) |
| 3 | pie-plot/donut | 같은 5:5에 innerRadius .55, padAngle 2°. Padding이 weight/share를 바꾸지 않음 | [PNG](../../../../.artifacts/test/png/review/pie-plot/donut/primitive.png) |
| 4 | density-plot/vertical | [1,2,3,5]의 KDE 한 profile·61 samples. x=value, y=density. Group/color 자동 추론 없음 | [PNG](../../../../.artifacts/test/png/review/density-plot/vertical/primitive.png) |
| 5 | density-plot/grouped | A=[1,2], B=[3,5]. Group와 같은 field color를 명시. 두 profiles·122 samples | [PNG](../../../../.artifacts/test/png/review/density-plot/grouped/primitive.png) |
| 6 | density-plot/horizontal | 동일 두 profiles를 x=density, y=value로 작성. 현행 y축 기준 horizontal grid 유지 | [PNG](../../../../.artifacts/test/png/review/density-plot/horizontal/primitive.png) |
| 7 | horizon-plot/signed | 7개 관측값 [-4,-3,-1,0,1,3,4]. Extent 4, bandHeight 4/3, sign별 3 bands, 6 paths·24 derived rows | [PNG](../../../../.artifacts/test/png/review/horizon-plot/signed/primitive.png) |
| 8 | horizon-plot/temporal | 동일 y에 explicit timestamp [1000,1100,1300,1500,1700,1900,2000]. Domain [1000,2000] | [PNG](../../../../.artifacts/test/png/review/horizon-plot/temporal/primitive.png) |
| 9 | horizon-plot/baseline-style | Baseline 2에 상대적인 같은 진폭. bands 2→3 edit, opacity .8→.6 edit. 최종 6 paths | [PNG](../../../../.artifacts/test/png/review/horizon-plot/baseline-style/primitive.png) |

Pie count/weighted/donut은 같은 raw rows와 category partition을 사용한다. Density 세 예제는
bandwidth 1, extent [0,6], steps 61로 추정값의 비교를 고정한다. Horizon은 원본 x만 축으로 표시하며,
folded [0,1] y축이나 internal band color legend를 생성하지 않는다.

### 정확한 호출과 source의 단일 소유자

| Chart | 단일 manifest와 정확한 public call | 실제 primitive | 독립 reference / normal test |
| --- | --- | --- | --- |
| Pie/Donut | [manifest.js](../../../../test/charts/pie-plot/manifest.js) | [primitive.program.js](../../../../test/charts/pie-plot/primitive.program.js) | [reference](../../../../test/charts/pie-plot/reference-values.js) · [tests](../../../../test/charts/pie-plot/primitive.test.js) |
| Density | [manifest.js](../../../../test/gates/density-plot/manifest.js) | [primitive.program.js](../../../../test/gates/density-plot/primitive.program.js) | [reference](../../../../test/gates/density-plot/reference-values.js) · [tests](../../../../test/gates/density-plot/primitive.test.js) |
| Horizon | [manifest.js](../../../../test/gates/horizon-plot/manifest.js) | [primitive.program.js](../../../../test/gates/horizon-plot/primitive.program.js) | [reference](../../../../test/gates/horizon-plot/reference-values.js) · [tests](../../../../test/gates/horizon-plot/primitive.test.js) |

각 manifest가 dimensions, values를 사용한 target call, primitive 함수, color/region 기대와 artifact identity를 묶는다.
Generator는 표시할 `createData`의 실제 값과 primitive source dataset을 비교한다. Public chain은 파싱해
정확한 옵션과 후속 edit 호출을 검사하지만 아직 실행하지 않는다. 각 variant의 `userFacing`은 비어 있다.

Primitive는 **현재 존재하는 mark → encoding → guide 액션의 명시적 조합**이다. 새 H0와 private helper를
미리 구현하거나 모든 graphics를 손으로 작성한 방식은 아니다. 새 facade가 아직 없다는 점을 generator도 확인한다.
수학 검증은 production을 import하지 않는 sector path, Gaussian mixture, Horizon folding reference를 이용한다.
Pie는 수치뿐 아니라 concrete command 좌표를, Density는 모든 sampled values를, Horizon은 모든 folded rows를 비교한다.

## A 이후 명확히 한 두 사항

### Density의 기본 grid

A의 “orientation에 맞는 현재 자동 grid 방향”이라는 문장은 불명확했다. 실제 lower chain의 자동
Cartesian grid는 두 방향에서 모두 y축 기준 horizontal이다. 가로 density를 만들 때 자동으로 vertical로
바뀐다는 최초 테스트 가정을 바로잡았다. Public target options와 production default를 바꾸지 않았다.
Axes는 densityChannel에 맞게 value/density 역할을 교환한다. 별도 grid 요청은 기존 guide options를 따른다.

### Horizon의 시각 fixture

A의 time 0/1, value -4/+4 두 점은 현행 sample folding과 선형 연결에서 세 band가 같은 삼각형으로 겹쳤다.
이를 그대로 보여주면 색 단계와 band 경계를 검토하기 어렵다. **V 이미지의 관측값을 7개로 늘렸으며**,
위 표와 manifest의 값이 이번 승인 대상이다. Temporal도 같은 7개 y를 쓰고 baseline-style은 모든 y에 2를 더한다.

기존 두 점 baseline 관측과 수치 검증은 보존했다. API/options, sample folding, palette, renderer는
변경하지 않았다. 관측점 사이 연속 곡선의 band 경계를 새로 삽입하는 기능을 구현하거나 검증한 것으로 세지 않는다.
세 band별 색을 실제 plot 영역에서 검사하며 opacity .6 예제는 흰 배경 위 누적 alpha 합성값을 확인한다.

## 검증 결과와 한계

- 전체 normal suite **2,451/2,451**, fail/cancelled/skipped 0. 기존 2,432개에 active slice 19개를 추가했다.
- 새 slice의 numeric/geometry/guide/target-call normal tests **19/19**, PNG **9/9**.
- Commit에 고정한 source로 review generator를 실행해 **9개 이미지·12개 plot 영역**의 ink와 색을 확인했다.
- Generated HTML을 실제 브라우저로 확인해 9개 image 로드와 9개 표시 호출의 manifest 일치, page error·가로 overflow 0을 확인했다.
- Pie의 240°/120°·180°/180°·hole/padding을 독립 sector commands와 비교했다.
- Gaussian oracle는 두 literal 수치에 anchor하고 61/122 samples 전체와 값의 비음수성을 비교했다.
- Horizon은 extent/bandHeight, sign/band별 amplitude, folded [0,1]과 x domain을 독립 oracle와 비교했다.
- 실제 PNG에서 sector, 두 density 색과 영역, sign별 세 band, opacity, 범례·축 label 배치를 직접 확인했다.

Source tree `9d3bd5e26b67634851e6009faac4b8c7c9e15002`와 types tree
`25e66ad6bb83ea1481194255e3521d5f2911dbea`는 Phase 2 결과와 같다. 이 단계에서 새 public flow의
semantic/graphic/Canvas/pixel equality, strict declaration, installed consumer를 통과했다고 주장하지 않는다.
그 검증은 V 뒤 구현과 함께 수행한다. 기존 package·coverage·realistic 결과의 정확한 범위는
[VALIDATION.md](VALIDATION.md#동일-source의-누적-기준)를 따른다.

PNG의 text rasterization은 native 환경에 의존한다. JSON에 Node/platform/arch를 기록했고
같은 실행의 public/primitive decoded pixel equality는 구현 뒤 별도로 확인한다.

Pie 실행 소스 링크는 승인 후 이전한 stable owner를 가리킨다. 승인 당시의 정확한 파일과 hash는 위 primitive commit과 `visual-results.json`에 보존했다.

## 재현

위 source commit 또는 이 검토 package를 clean checkout한 repository root에서 실행한다.
의존성이 없다면 먼저 `npm ci`를 수행한다. 다른 프로젝트/디렉터리는 필요 없다.

~~~sh
export TMPDIR="$PWD/.artifacts/repository-study/tmp"
export NPM_CONFIG_CACHE="$PWD/.artifacts/repository-study/npm-cache"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.artifacts/repository-study/browsers"

node --test test/gates/pie-plot/primitive.test.js \
  test/gates/density-plot/primitive.test.js test/gates/horizon-plot/primitive.test.js
node --test test/gates/pie-plot/png.render.js \
  test/gates/density-plot/png.render.js test/gates/horizon-plot/png.render.js
npm test
node agent_docs/impl/roadmap6/phase3/render-review.mjs
~~~

Generator는 src/types/test와 generator 자체의 clean commit 및 기존 source/types tree를 요구한다.
세 신규 facade가 아직 없는 상태에서만 실행할 수 있다. Public 구현 후에는 이 primitive 승인 snapshot을
덮어쓰지 않고 public parity 증거를 별도로 만든다. 승인·구현 후 slice는 stable capability 경로로 옮긴다.
