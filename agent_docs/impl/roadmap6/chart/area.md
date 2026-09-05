# Roadmap 6 — Area / ranged ribbon / stacked area

**승인된 Phase 4 A 계약 / 미구현. 아직 Current API가 아니다.**
[P4-C01–C03 계약](../phase4/CONTRACT_REVIEW.md), [Gate](../phase4/GATES.md),
[재현과 acceptance](../phase4/VALIDATION.md)가 이 계약을 연결한다. 연결 항목은 F05·D03이다.

## 목적과 최종 public API 제안

Simple area의 value→baseline, ribbon의 두 endpoint, stack의 누적 두께를 구분한다.
상위 액션은 아래층의 측정·group·layout·guide를 조합하고, 별도 chart recipe를 저장하지 않는다.

~~~javascript
// Proposed API. Each result branches independently from base.
import { chart } from 'ggaction';
const values = [
  { time: 1, value: 2, low: 1, high: 3 },
  { time: 2, value: 4, low: 2, high: 6 },
  { time: 3, value: 3, low: 1, high: 5 }
];
const base = chart().createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'data', values });
const simple = base.createAreaPlot({ id: 'a', x: 'time', y: 'value' });
const ribbon = base.createAreaPlot({ id: 'a', x: 'time', y: { lower: 'low', upper: 'high' } });
const horizontal = base.createAreaPlot({ id: 'a', x: 'value', y: 'time', valueChannel: 'x', baseline: 0 });
const logArea = base.createAreaPlot({
  id: 'a', x: 'time', y: { field: 'value', scale: { type: 'log' } }, baseline: 1
});
~~~

`createAreaPlot(options)`는 다음 shape를 사용한다.

| 옵션 | 허용값·기본값 |
| --- | --- |
| id/data/coordinate | optional string, id 기본 `areaPlot`; data와 Cartesian coordinate는 기존 resolver |
| x, y | 필수. 독립 위치는 field string 또는 `{field, fieldType?, temporalUnit?, scale?}`. fieldType은 quantitative/temporal |
| valueChannel | `"x"|"y"`, 기본 `"y"`. 해당 위치는 아래의 measurement union, 반대쪽은 독립 위치 |
| measurement | field string 또는 `{field, scale?}` 또는 `{lower, upper, scale?}`. quantitative만 |
| lower/upper | field string 또는 `{datum: finiteNumber}`. 최소 하나는 field, 두 상수는 오류 |
| baseline | simple field measurement에만 finite number, 기본 0. range measurement와 함께 지정하면 오류 |
| groupBy | optional string 또는 nonempty unique field tuple. 명시적으로 encodeGroup에 전달 |
| layout | `"overlay"|"stack"|"fill"|"diverging"|"center"`, 기본 overlay. group는 Area에 부적합하므로 오류 |
| missing | `"error"|"break"`, 기본 error. createAreaMark의 semantic policy에 전달 |
| color | optional field string 또는 `{field, fieldType?:"nominal"|"ordinal", scale?, palette?}`. 자동 group/color 추론 없음 |
| area | `{fill?, opacity?, stroke?, strokeWidth?, curve?}`. 기존 Area style 검사와 기본값 사용 |
| guides | false 또는 기존 Cartesian categorical guide shape `{axes?, grid?, legend?}`. 생략 시 적용 가능한 guide 확보 |

Nested target/coordinate, aggregate/bin/stack/unknown, 추가 alias는 허용하지 않는다.
Measurement의 scale은 기존 non-point quantitative position 옵션을 사용한다. Color의 scale은 기존 non-point
categorical color 옵션만 지원한다. Tuple group와 color field가 다르더라도 group 안에서 색 값이 한 개면 허용한다.
Fill과 field color를 함께 명시하면 기존 conflict 정책에 따라 오류다. Group만으로 legend나 색을 만들지 않는다.
Stack/fill/diverging은 baseline 0인 single-field measurement만, center는 이에 더해 vertical만 허용한다.
Two-field ribbon에 layout을 누적시키거나 lower/upper 차이를 자동 value로 추론하지 않는다.

Canvas와 materialized dataset은 이미 있어야 한다. data는 explicit→current→unique를 사용하고 mark child에
명시적으로 전달해 다른 mark의 encoding을 우연히 상속하지 않는다. Coordinate는 Phase 3의 공통 resolver를
재사용한다. Explicit 새 id는 Cartesian으로 생성하며 family 충돌·모호한 복수 resource는 오류다.
같은 mark id를 두 번 생성하면 오류다. guides:false는 이 호출의 생성 생략이며 기존 guide 삭제가 아니다.

## 정확한 하위 호출과 hierarchy

아래는 simple facade의 **미래 lower equivalence**다. 현재 Area datum은 미지원이므로 아직 실행되지 않는다.

~~~javascript
// Proposed equivalent of simple above; value remains on primary y.
const lower = base.createAreaMark({ id: 'a', data: 'data' })
  .encodeX({ target: 'a', field: 'time' })
  .encodeYRange({ target: 'a', lower: 'value', upper: { datum: 0 } })
  .layoutSeries({ target: 'a', mode: 'overlay' })
  .createGuides();
~~~

Ranged ribbon의 두 string endpoint는 **현재도** 같은 range owner로 만들 수 있다.
실행 가능한 현재 예제는 [A04 probe](../phase4/baseline.probes.mjs)에 고정했다.

~~~text
createAreaPlot
├─ createAreaMark (data, style, semantic missing policy)
├─ createCoordinate? (existing resolver)
├─ encodeGroup? (explicit series identity)
├─ encodeX / encodeY (independent field)
├─ encodeXRange / encodeYRange (final pair preflight)
│  ├─ encodeX / encodeY (primary field or datum)
│  ├─ encodeX2 / encodeY2 (secondary, same scale)
│  └─ shared scale → Area materialization
├─ layoutSeries (canonical mode; reused series math)
├─ encodeColor? (series-constant appearance)
└─ createGuides? (applicable axes/grid/legend)
~~~

기본 simple은 value를 primary, baseline을 secondary에 저장한다. Range 객체는 lower를 primary,
upper를 secondary에 저장한다. Lower/upper라는 역할 이름을 수치의 대소나 화면 위/아래로 오해하지 않는다.
Ranged ribbon에서 lower>upper를 자동 swap하거나 오류로 바꾸지 않는다. 기존 crossing 지원을 유지한다.
별도 encodeBaseline/editAreaPlot/removeAreaPlot 액션은 만들지 않는다.

## 저장 결과와 기본값의 의미

- semanticSpec: x/y/x2/y2의 field 또는 datum, fieldType·scale·coordinate, encoding.group, layer.layout.mode,
  mark.missing. Endpoint 0은 원본 행에 가짜 field를 추가하지 않고 저장한다.
- graphicSpec: 실제 baseline/양쪽 boundary와 closure를 포함하는 concrete M/L/C/Z path commands와 paint.
  Pixel 좌표는 materialization 결과다. Renderer가 0, stack, missing을 추론하지 않는다.
- markConfigs: fill 기본 기존 mark 색, opacity 기본 **0.2**, curve 기본 linear, 명시적 outline 등 appearance.
  Missing이나 layout의 canonical 사본을 이 config에 다시 넣지 않는다.
- guideConfigs/resolvedScales: canonical endpoint/layout를 소비한 layout/cache. Axis title은 datum이 아니라
  실제 측정 field를 설명해야 한다. 단색 grouped Area는 color legend가 없다.
- context/trace: 다음 호출의 current resource와 실제 wrapped child 호출만. Facade recipe/derived path 배열 복제 없음.

Automatic scale domain에는 baseline과 field endpoints를 모두 포함한다. Log 0은 오류이며 epsilon 대체가 없다.
기본 선형 simple에 signed data는 유효하다. Nonlinear의 정확한 조건은 기존 scale owner를 따른다.
Empty dataset, 두 점 미만의 series, 유효한 segment가 전혀 없는 break 결과는 오류다.
두 점 이상이고 값이 모두 baseline이면 의미가 있는 0 면적 결과다. Plot ink 조건의 예외를 이 경우에만 수치로 설명한다.

## 결측과 layout

Missing:error는 기존처럼 null/undefined endpoint를 거부한다. Missing:break는 독립 위치를 유지한 채
결측 endpoint에서 닫힌 segment를 나눈다. Independent missing, NaN/Infinity, invalid group는 오류다.
연속 유효점 2개 이상만 그린다. 예를 들어 x=0,1,2,3,4의 value=[2,3,null,4,2]는 두 개의 path다.

Stacked Area는 같은 independent grid에 group당 하나의 행을 요구한다. 빠진 행을 생성하거나 임의 보간하지 않는다.
한 위치의 어느 group라도 null endpoint라면 break에서는 전체 stack을 그 위치에서 함께 끊는다.
Stack/fill/center는 nonnegative만, diverging은 양/음수 별도 누적을 지원한다. Center는 vertical만이다.
Fill sum=0은 두께 0, domain [0,1]이며 total=0을 분모로 나누지 않는다.
같은 group 안에서 서로 다른 color 값은 오류다. Density/Horizon의 결측·통계는 해당 transform이 계속 소유한다.

## 아래층 편집과 lifecycle

| 작업 | 공개 owner / 조건 |
| --- | --- |
| baseline 변경 | encodeX2/encodeY2 datum 재할당. Scale/domain/guide 전체 갱신 |
| field↔datum / ribbon 변경 | encodeXRange/encodeYRange로 최종 pair를 atomic 검증 |
| overlay→stack→fill→overlay | layoutSeries. Raw baseline 0, aligned grid 등 최종 mode 조건 검사 |
| group / series-constant color 변경 | encodeGroup / encodeColor. 명시적 group은 color 변경으로 교체하지 않음 |
| missing·appearance 변경 | editAreaMark. Missing은 semantic 정책, appearance는 기존 config owner |
| scale·resize | editScale / editCanvas. Endpoint·stack·guide·selection을 같은 planner로 갱신 |
| orientation 전환 | 기존 encoding 제거/재작성 경로. 새 one-call orientation editor는 Phase 6 범위 |
| endpoint 제거 | removeEncoding. 남은 lower intent가 incomplete이면 빈 graphics; 자동 baseline 복원 없음 |

모든 실패는 이전 program/trace/caller 입력 불변이다. Atomic range는 이전 pair와의 일시적 충돌 없이 최종 구성을 검사한다.
Aggregation·stack math·path generation을 facade에 복제하지 않는다. Data/scale/selection/label consumers가
지원하지 않는 조합은 승인 범위를 넓힌 것처럼 숨기지 말고 명시적으로 거부한다.

## 시각·수치 acceptance와 범위 밖

[V1 계획](../phase4/VALIDATION.md)은 simple signed/explicit baseline, horizontal log, crossing ribbon,
missing segments, independent grouped Bar, stacked/fill/diverging/center Area를 다룬다.
Primitive source는 A 승인 후, public flow는 해당 V 승인 후 만든다. 각 target의 input/dimension/call을 하나의 manifest에
두고 실제 top-level trace와 대조한다. 독립 수치 oracle와 graphic/Canvas/decoded PNG pixel equality,
SVG/PDF, lifecycle·strict declarations·full/basic boundary로 완료를 판정한다.

Arbitrary baseline callback, raw missing row 보충, 불일치 grid 보간, 두 field 차이의 자동 stacking, horizontal center,
새 interpolation 종류, 모든 transform의 missing 재해석은 범위 밖이다. 구체적인 후속 요청 없이 자동으로 추가하지 않는다.
