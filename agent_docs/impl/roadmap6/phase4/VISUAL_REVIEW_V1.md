# Phase 4 V1 — Area와 시리즈 배치 시각 목표

## 현재 상태와 승인 범위

검토 package commit은 `ee9daf0c58eb682a09ab0dddc3af9ff241bb76a1`이며 원격 push와 ref 일치를 확인했다.
상태는 ready-for-review다. 사용자는 A와 `encodeLayout` → `layoutSeries` 이름 변경을 승인했다.
이 문서는 그 계약에 따른 **Area 9개와 Bar 2개, 총 11개 primitive 표현**을 검토한다.
새 이름은 Bar/Area의 series 배치이며 canvas/facet 배치가 아니다. 옛 이름 alias는 만들지 않는다.

V1 승인 뒤 W1/W2의 `createAreaPlot`, `layoutSeries`와 관련 lower owner·호환 경로를 구현한다.
이후 실제 전환, 실패 rollback, scale/guide/selection/data 소비자와 public/primitive 동등성을 검증한다.
Rose/Radial·theta order의 V2, midpoint/legend의 V3, 최종 X는 이 승인에 포함하지 않는다.

## 재현 source와 표시 내용

- [입력과 목표 publicCalls](../../../../test/gates/area-layout/targets.json): 11개 사례의 유일한 실행 fixture owner. 원본 행, 옵션, 1000×700 / margin 150 포함.
- [시각 manifest](../../../../test/gates/area-layout/manifest.js): 제목, primitive factory, call chain, 색상과 plot-region ink 조건.
- [실제로 실행한 primitive](../../../../test/gates/area-layout/primitive.program.js): 기존 lower action과 editSemantic/editGraphics의 명시적 chain.
- [독립 수학 oracle](../../../../test/oracles/series-area.js), [fixture reference](../../../../test/gates/area-layout/reference-values.js), [literal/invariant 검사](../../../../test/gates/area-layout/reference-values.test.js), [상태·renderer 검사](../../../../test/gates/area-layout/primitive.test.js).
- [PNG 회귀 entry](../../../../test/gates/area-layout/png.render.js), [기록/재현 runner](verify-visual-v1.mjs), [실제 결과 JSON](visual-v1-results.json).

아래 public call은 **구현할 목표 호출**이다. 현재 실행 trace는 primitive/lower action이며,
결과 JSON의 `executedPrimitiveTopLevelOperations`와 구분해서 보존했다. 새 public method는 아직 없다.
각 PNG 폴더의 variant.json에도 동일한 목표 call chain이 기록된다.

## 의미·표현에서 확인할 것

| 사례 | 의미와 수치 기준 |
| --- | --- |
| area-simple | 값 [2,4,3], baseline datum 0. y domain [0,4], 닫힌 path 1개. 기준선용 가짜 필드 없음 |
| area-signed-baseline | 값 [2,-2,3], baseline 1. y domain [-2,3], baseline y=310. 기준선 위·아래를 그대로 표현 |
| area-horizontal-log | valueChannel x, log domain [1,4], baseline 1. 값 2의 x=500, 값 4의 x=850. y는 독립 time 축 |
| ribbon-crossing | lower/upper [1,3],[6,2],[1,5]. 두 입력 경계가 교차해도 min/max로 swap하지 않음 |
| area-missing-break | 원본 null 보존. x [0,1] 및 [3,4]의 closed path 2개, x=2를 가로지르는 edge 없음 |
| area-stack | 첫 위치의 경계 [0,2],[2,3], 최대 합 6. groupBy series와 color region 분리 |
| area-fill | 첫 위치 [0,2/3],[2/3,1]. 매 위치 총 두께 1, domain [0,1] |
| area-diverging | 첫 위치 [0,2],[0,-1], domain [-1,6]. 매 표본에서 양수·음수를 각각 누적 |
| area-center | 첫 위치 [-1.5,0.5],[0.5,1.5], domain [-3,3]. 매 위치 총 두께 중심 0 |
| bar-independent-stack | color 없이 series로 6개 cell을 누적. domain [0,6], x 위치 공유, legend 없음 |
| bar-layout-roundtrip | group→stack→group 후 기대하는 group 최종 상태. 6개 Bar, domain [0,4], 슬롯 너비의 72%, legend 없음 |

Area opacity는 기존 0.2, 팔레트와 기본 Cartesian guide 스타일은 기존 정책을 따른다.
가로 log Area도 현재 createGuides의 horizontal grid 기본을 유지한다. 이 사례는 가로 grid 정책을 새로 정의하지 않는다.
Ribbon 축 제목은 첫 endpoint field인 low다. 새 range 제목 합성 정책을 도입하지 않는다.

**Diverging 해석:** 부호 분리는 각 표본 위치에서 정의된다. 그 사이 경계는 직선으로 연결하므로
부호가 전환되는 구간에서 다른 series와 겹쳐 보일 수 있다. Zero-crossing 교차점을 삽입하거나
중간 표본을 추가하지 않은 목표다. Ribbon의 교차도 의도적으로 보존한다.

## 지금 검증한 것과 남은 것

Focused **20/20**, discovery 포함 **33/33**, 정상 누적 **2608/2608**, PNG **11/11**, fail/cancelled/skip 0. 실제 모든 plot 영역이 최소 1000 ink pixels와
각 기대색 최소 100 pixels 조건을 통과했다. 11개 원본 이미지를 3개의 contact sheet로 함께 확인했다.
독립 oracle의 literal anchors와 두께 보존·정규화·중심 대칭·부호별 누적·log 단조성을 검사했다.
원본 데이터 불변, datum endpoint, closed path와 finite bounds, group/color 독립, resolved domain을 검사했다.
전체 program과 graphicSpec만 준 경우의 Canvas drawing calls도 정확히 같다.

Primitive는 미래 public domain resolver를 대신 구현하지 않는다. 독립 oracle의 수치 domain으로 scale을
materialize한 다음 semantic domain을 auto로 기록한다. break 사례는 기존 strict field reader가 null을
허용하지 않아 scale 계산 동안 value-field 연결을 떼고 같은 scale의 constant baseline consumer와
명시 domain을 사용한 뒤 연결을 복구한다. 원본 행을 삭제·수정하거나 가짜 필드를 넣지는 않는다.
향후 공개 owner가 datum·missing·layout domain을 직접 처리해야 한다.

Bar roundtrip은 **최종 목표 상태만** 작성했다. 실제 group→stack→group 전환, 중간 offset 정리,
immutable failure, public trace·graphicSpec·decoded pixels의 primitive/public 일치는 구현 후 검증한다.
현재 결과를 API 완료나 해당 버그 해결로 기록하지 않는다. 새 public docs/example/type method도 아직 추가하지 않았다.
기존 bundle 상한 237000/125000/25000은 유지한다. 이전 Phase의 packed artifact/coverage 결과를 새 소스의 검증으로 재사용하지 않는다.

## 재현 명령

저장소 root에서 실행한다. Node와 의존성 버전은 lockfile을 따른다.

```sh
export TMPDIR="$PWD/.artifacts/repository-study/tmp"
export NPM_CONFIG_CACHE="$PWD/.artifacts/repository-study/npm-cache"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.artifacts/repository-study/browsers"
node --test test/gates/area-layout/*.test.js
node --test test/gates/area-layout/png.render.js
node agent_docs/impl/roadmap6/phase4/verify-visual-v1.mjs
npm test
```

검증 runner는 11개 PNG와 contact sheet를 다시 만들고 source/geometry/pixel hash와 ink 결과를
기록 JSON에 대조한다. `--record`는 의도적으로 목표를 변경할 때만 쓴다. OS/font에 따른 픽셀 차이는
동일 환경의 재현 여부와 구분해야 하며 새 hash로 자동 승인하지 않는다.
이미지는 gitignored artifact이고 재현 source·fixture·수치/hash 기록은 git에 포함한다.

## 목표 public calls와 실제 이미지

다음 목록은 canonical fixture에서 생성한 표시용 사본이다. 수정은 targets.json에서 시작한다.

### area-simple

[실제 primitive PNG](../../../../.artifacts/test/png/review/area-layout/area-simple/primitive.png)

```js
chart()
  .createCanvas({"width":1000,"height":700,"margin":150})
  .createData({"id":"data","values":[{"time":1,"value":2,"low":1,"high":3},{"time":2,"value":4,"low":2,"high":6},{"time":3,"value":3,"low":1,"high":5}]})
  .createAreaPlot({"id":"m","x":"time","y":"value"});
```

### area-signed-baseline

[실제 primitive PNG](../../../../.artifacts/test/png/review/area-layout/area-signed-baseline/primitive.png)

```js
chart()
  .createCanvas({"width":1000,"height":700,"margin":150})
  .createData({"id":"data","values":[{"time":1,"value":2,"low":1,"high":3},{"time":2,"value":-2,"low":2,"high":6},{"time":3,"value":3,"low":1,"high":5}]})
  .createAreaPlot({"id":"m","x":"time","y":{"field":"value","scale":{"nice":false}},"baseline":1});
```

### area-horizontal-log

[실제 primitive PNG](../../../../.artifacts/test/png/review/area-layout/area-horizontal-log/primitive.png)

```js
chart()
  .createCanvas({"width":1000,"height":700,"margin":150})
  .createData({"id":"data","values":[{"time":1,"value":2,"low":1,"high":3},{"time":2,"value":4,"low":2,"high":6},{"time":3,"value":3,"low":1,"high":5}]})
  .createAreaPlot({"id":"m","x":{"field":"value","scale":{"type":"log","nice":false}},"y":"time","valueChannel":"x","baseline":1});
```

### ribbon-crossing

[실제 primitive PNG](../../../../.artifacts/test/png/review/area-layout/ribbon-crossing/primitive.png)

```js
chart()
  .createCanvas({"width":1000,"height":700,"margin":150})
  .createData({"id":"data","values":[{"time":1,"value":2,"low":1,"high":3},{"time":2,"value":4,"low":6,"high":2},{"time":3,"value":3,"low":1,"high":5}]})
  .createAreaPlot({"id":"m","x":"time","y":{"lower":"low","upper":"high"}});
```

### area-missing-break

[실제 primitive PNG](../../../../.artifacts/test/png/review/area-layout/area-missing-break/primitive.png)

```js
chart()
  .createCanvas({"width":1000,"height":700,"margin":150})
  .createData({"id":"data","values":[{"x":0,"value":2},{"x":1,"value":3},{"x":2,"value":null},{"x":3,"value":4},{"x":4,"value":2}]})
  .createAreaPlot({"id":"m","x":"x","y":"value","missing":"break"});
```

### area-stack

[실제 primitive PNG](../../../../.artifacts/test/png/review/area-layout/area-stack/primitive.png)

```js
chart()
  .createCanvas({"width":1000,"height":700,"margin":150})
  .createData({"id":"data","values":[{"x":0,"value":2,"series":"a","region":"north","category":"0"},{"x":1,"value":4,"series":"a","region":"north","category":"1"},{"x":2,"value":3,"series":"a","region":"north","category":"2"},{"x":0,"value":1,"series":"b","region":"south","category":"0"},{"x":1,"value":2,"series":"b","region":"south","category":"1"},{"x":2,"value":1,"series":"b","region":"south","category":"2"}]})
  .createAreaPlot({"id":"m","x":"x","y":"value","groupBy":"series","layout":"stack","color":"region"});
```

### area-fill

[실제 primitive PNG](../../../../.artifacts/test/png/review/area-layout/area-fill/primitive.png)

```js
chart()
  .createCanvas({"width":1000,"height":700,"margin":150})
  .createData({"id":"data","values":[{"x":0,"value":2,"series":"a","region":"north","category":"0"},{"x":1,"value":4,"series":"a","region":"north","category":"1"},{"x":2,"value":3,"series":"a","region":"north","category":"2"},{"x":0,"value":1,"series":"b","region":"south","category":"0"},{"x":1,"value":2,"series":"b","region":"south","category":"1"},{"x":2,"value":1,"series":"b","region":"south","category":"2"}]})
  .createAreaPlot({"id":"m","x":"x","y":"value","groupBy":"series","layout":"fill","color":"region"});
```

### area-diverging

[실제 primitive PNG](../../../../.artifacts/test/png/review/area-layout/area-diverging/primitive.png)

```js
chart()
  .createCanvas({"width":1000,"height":700,"margin":150})
  .createData({"id":"data","values":[{"x":0,"value":2,"series":"a","region":"north","category":"0"},{"x":1,"value":4,"series":"a","region":"north","category":"1"},{"x":2,"value":3,"series":"a","region":"north","category":"2"},{"x":0,"value":-1,"series":"b","region":"south","category":"0"},{"x":1,"value":2,"series":"b","region":"south","category":"1"},{"x":2,"value":-1,"series":"b","region":"south","category":"2"}]})
  .createAreaPlot({"id":"m","x":"x","y":"value","groupBy":"series","layout":"diverging","color":"region"});
```

### area-center

[실제 primitive PNG](../../../../.artifacts/test/png/review/area-layout/area-center/primitive.png)

```js
chart()
  .createCanvas({"width":1000,"height":700,"margin":150})
  .createData({"id":"data","values":[{"x":0,"value":2,"series":"a","region":"north","category":"0"},{"x":1,"value":4,"series":"a","region":"north","category":"1"},{"x":2,"value":3,"series":"a","region":"north","category":"2"},{"x":0,"value":1,"series":"b","region":"south","category":"0"},{"x":1,"value":2,"series":"b","region":"south","category":"1"},{"x":2,"value":1,"series":"b","region":"south","category":"2"}]})
  .createAreaPlot({"id":"m","x":"x","y":"value","groupBy":"series","layout":"center","color":"region"});
```

### bar-independent-stack

[실제 primitive PNG](../../../../.artifacts/test/png/review/area-layout/bar-independent-stack/primitive.png)

```js
chart()
  .createCanvas({"width":1000,"height":700,"margin":150})
  .createData({"id":"data","values":[{"x":0,"value":2,"series":"a","region":"north","category":"0"},{"x":1,"value":4,"series":"a","region":"north","category":"1"},{"x":2,"value":3,"series":"a","region":"north","category":"2"},{"x":0,"value":1,"series":"b","region":"south","category":"0"},{"x":1,"value":2,"series":"b","region":"south","category":"1"},{"x":2,"value":1,"series":"b","region":"south","category":"2"}]})
  .createBarPlot({"id":"m","x":"category","y":{"field":"value","aggregate":"sum"}})
  .encodeGroup({"target":"m","field":"series"})
  .layoutSeries({"target":"m","mode":"stack"});
```

### bar-layout-roundtrip

[실제 primitive PNG](../../../../.artifacts/test/png/review/area-layout/bar-layout-roundtrip/primitive.png)

```js
chart()
  .createCanvas({"width":1000,"height":700,"margin":150})
  .createData({"id":"data","values":[{"x":0,"value":2,"series":"a","region":"north","category":"0"},{"x":1,"value":4,"series":"a","region":"north","category":"1"},{"x":2,"value":3,"series":"a","region":"north","category":"2"},{"x":0,"value":1,"series":"b","region":"south","category":"0"},{"x":1,"value":2,"series":"b","region":"south","category":"1"},{"x":2,"value":1,"series":"b","region":"south","category":"2"}]})
  .createBarPlot({"id":"m","x":"category","y":{"field":"value","aggregate":"sum"}})
  .encodeGroup({"target":"m","field":"series"})
  .layoutSeries({"target":"m","mode":"group"})
  .layoutSeries({"target":"m","mode":"stack"})
  .layoutSeries({"target":"m","mode":"group"});
```
