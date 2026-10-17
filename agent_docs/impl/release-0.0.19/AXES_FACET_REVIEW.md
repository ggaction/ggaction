# Cartesian 축과 shared facet 범례 설계 검토

## 진행 상태와 승인 경계

- [x] 담당 이슈 #166, #174, #194, #195, #197, #199, #206의 요구와 기존 proposal 조사
- [x] 현행 public action, semantic/config 소유자, refresh, persistence, facet 경로 대조
- [x] 현행 공개 호출의 거절과 immutable parent 보존을 직접 재현
- [x] 충돌하는 선택을 하나의 권고 계약으로 정리
- [x] 이 문서의 구체적인 public API와 저장 상태 변경에 대한 사용자 승인
- [ ] 승인 후 구현·검증·선언·계약·공개 문서·검색 메타데이터 동기화

Gate: **ready-for-review**. 사용자의 “미구현 28개도 설계 검토 후 모두 구현”은
기능 범위 승인이다. 아직 검토되지 않은 세부 public/persisted 계약은 루트
`AGENTS.md`와 `agent_docs/impl/AGENTS.md`에 따라 승인 후 구현한다.
이 문서는 런타임 구현이나 테스트 통과 보고가 아니다. 아래의 제안 호출은 현재
런타임에서 실행 가능한 API라고 주장하지 않는다. 부모 작업이 다른 담당 문서와
함께 검증된 검토 commit을 원격에 게시하고 승인을 요청한다.

조사 기준: `7a215304f3110e2e161bd9c5ec23b91fe51de3a0`.
렌더러나 원시 행은 바꾸지 않았다. 유료 모델 요청과 차트 픽셀 검사는 하지 않았다.

## 1. 범위와 기존 설계의 재사용

| 이슈 | 요구 | 권고하는 기존 action 확장 |
| --- | --- | --- |
| #166 | 틱·그리드의 균일 및 값별 dash | Cartesian ticks에 `strokeDash`; ticks/grid에 typed `strokeDashMap` |
| #174 | 플롯 안/위의 소유된 축 제목 | signed title `offset`, local `align`/`baseline` |
| #194 | 축 전체를 바깥으로 이동 | complete axis의 non-negative `offset` |
| #195 | 축 레이블의 명시적 텍스트 정렬 | Cartesian labels의 local `align` |
| #197 | 한 플롯의 독립적인 양쪽 축 | complete-axis `id`, component `target`, aggregate 배열 |
| #199 | 축 제목을 축 방향으로 이동 | title `alongOffset` |
| #206 | 좁은 cell보다 넓은 shared 내부 범례 | `facet` 계열의 `guides.legend` 객체, facet parent의 기존 범례 편집 |

기존 상세 제안은 중복 구현 계획이 아니라 근거다. 아래 통합 계약이 승인되면 해당
역사적 proposal에는 승인 commit/새 canonical contract 링크만 남긴다.

- #194: revision `2662f06c6927de4bc86bf85c936e8d6357fbf2ec`,
  `agent_docs/impl/cartesian-axis-frame-offset/PROPOSAL.md`.
- #195: revision `5f434ef868047fb4034d39e9aaa3bc6e8eb8cedf`,
  `agent_docs/impl/cartesian-axis-label-alignment/PROPOSAL.md`.
- #197: revision `52dfd002510f5d68566ca124c767484f650f908b`,
  `agent_docs/impl/independent-axis-guides/PROPOSAL.md`.
- #199: revision `47b9f80783bba9fe2a3de05178fc9af6ac8ed589`,
  `agent_docs/impl/axis-title-along-offset/PROPOSAL.md`.

### 기본 작성 흐름

완전한 축·범례를 먼저 선언하고, 의미가 있는 세부 편집으로 좁힌다. 공개 primitive로
축을 그리거나 일반 text mark로 축 제목을 대체하지 않는다. 각 호출은 가능하면
핵심 옵션 세 개 이내로 유지하되, typed nested 객체는 필요한 소유 관계를 보존한다.

```js
// base는 이미 데이터·mark·독립 scale이 있는 program이다.
base
  .createAxes({
    x: { scale: 'time' },
    y: [
      { id: 'quantity', scale: 'quantityScale', position: 'left' },
      { id: 'share', scale: 'shareScale', position: 'right' }
    ]
  })
  .editYAxis({ target: 'share', offset: 20 })
  .editYAxisLabels({ target: 'share', align: 'left' })
  .editYAxisTitle({ target: 'share', rotation: 0, baseline: 'bottom' });
```

## 2. 조사한 현행 경계와 재현

현재 `guideConfigs`는 `materializationConfigs.guides`를 읽는 facade다.
Cartesian 축은 `semanticSpec.guides.axis.x/y`,
`guideConfigs.axis.x/y.{line,ticks,labels,title}` 및 고정된
`xAxisLine` 등의 concrete ID를 사용한다. `axisScaleBindings`,
`planScaleGuideRematerialization`, collision collector, facet outer-axis planner가
두 canonical 채널을 직접 열거한다. 이름만 추가하고 이 소비자를 그대로 두면
refresh/삭제/저장 후 복원이 깨진다.

현재 제목은 `at`으로 scale상의 위치를 정하고, plot baseline으로부터 non-negative
`offset`으로 이동한다. `textAlign:'center'`, `textBaseline:'middle'`과 multiline
중앙 정렬이 고정되어 있다. `inferredOffset`은 측정한 labels와 title의 간격을 계산한다.
따라서 signed explicit offset과 inferred offset의 구분을 유지해야 한다.

현재 canonical 축은 focused component마다 `position`을 저장한다. 기존 저수준
호출로 component들이 다른 side인 상태도 만들 수 있다. 이름 있는 축의 단일-side
정책을 이 legacy 상태에 소급하여 강요하지 않는다. 현재 공통 collision collector는
axis↔axis 쌍을 건너뛰며, 제목 materializer가 자기 축 label과의 충돌을 별도로 검사한다.
“현재 모든 축 사이 충돌이 이미 검증된다”고 간주하면 안 된다.

현재 shared 범례는 child에서 materialize한 범례를 최종 composition에 promote한다.
따라서 60px child plot에 들어가지 않는 200px 범례는 246px 최종 plot union이 있어도
진입할 수 없다. `editLegendLayout` 또한 unit 전용 action이라 parent 편집이 거절된다.
child bounds 검증을 느슨하게 하는 것은 이 문제의 해결책이 아니다.

다음은 조사 기준 revision에서 직접 실행한 최소 재현이다. 원래 `base()`와 그
caller-owned 값은 실패 전후 동일했다. 이는 구현 후 검증 결과가 아니라 현재의
기능 부재 증거다.

```js
import { chart } from './src/index.js';

function base() {
  return chart()
    .createCanvas({
      width: 700, height: 500,
      margin: { left: 110, right: 110, top: 90, bottom: 100 }
    })
    .createData({ values: [
      { x: 0, y: 1, g: 'Short', p: 'A' },
      { x: 1, y: 2, g: 'Long label', p: 'B' },
      { x: 2, y: 3, g: 'Third', p: 'C' }
    ] })
    .createBarPlot({ x: 'g', y: 'y', guides: false });
}

// 아래 각 줄은 새 base()에서 독립적으로 실행한다.
base().createYAxis({ ticksAndLabels: { values: [1, 2, 3] } })
  .editYAxisTicks({ strokeDash: [2, 2] });
base().createXAxis({ title: { text: 'Axis title', offset: -30 } });
base().createXAxis({ offset: 20 });
base().createYAxis({ ticksAndLabels: { labels: { align: 'left' } } });
base().createYAxis({ id: 'left', scale: 'y', position: 'left' });
base().createXAxis({ title: { text: 'Axis title', alongOffset: 85 } });
base().encodeColor({ field: 'g', layout: 'overlay' })
  .facet({ field: 'p', guides: { axes: 'outer', legend: false } })
  .editLegendLayout({ position: 'top-left' });
```

| 이슈 | 실제 거절 메시지 |
| --- | --- |
| #166 | `Unknown editYAxisTicks option "strokeDash".` |
| #174 | `Axis title offset must be a non-negative finite number.` |
| #194 | `Unknown createXAxis option "offset".` |
| #195 | `Unknown createYAxisTicksAndLabels.labels option "align".` |
| #197 | `Unknown createYAxis option "id".` |
| #199 | `Unknown createXAxis.title option "alongOffset".` |
| #206 | `editLegendLayout is not available on a composition ChartProgram.` |

별도 numeric line base에서 기존 `createYAxis({position:'left'})` 뒤
`createYAxis({position:'right'})`도
`createYAxisLine requires a missing y-axis line.`로 실패했다.
`strokeDash:[{value:1,dash:[]},{value:2,dash:[2,2]}]`를 grid에 전달하면
`Grid strokeDash must be an even-length array of non-negative finite numbers.`로 실패한다.

## 3. #166: 틱과 값별 guide dash

### 정확한 추가 문법

```ts
type CartesianGuideDashMap = ReadonlyArray<Readonly<{
  value: AxisValue;                // string | boolean | finite number
  strokeDash: readonly number[];
}>>;

// CartesianAxisTickStyleOptions / AxisTickOptions에 추가
strokeDash?: readonly number[];
strokeDashMap?: CartesianGuideDashMap | 'auto';

// GridDirectionOptions / EditGridOptions의 기존 strokeDash는 그대로 유지하고 추가
strokeDashMap?: CartesianGuideDashMap | 'auto';
```

```js
program
  .createYAxis({ ticksAndLabels: { values: [1, 2, 3] } })
  .editYAxisTicks({ strokeDash: [2, 2], strokeDashMap: [{ value: 1, strokeDash: [] }] })
  .createHorizontalGrid({ values: [1, 2, 3], strokeDash: [2, 2],
    strokeDashMap: [{ value: 1, strokeDash: [] }] });
```

권고: `strokeDash` 자체를 배열/맵 union으로 바꾸지 않는다. 기존 uniform 배열은
그대로 두고 `colorMap`/`labelMap`과 같은 별도 typed map을 사용하면 생성 모델과
declaration이 명확해지고 이전 grid 입력의 뜻도 바뀌지 않는다.

- map이 있는 raw tick value에만 override한다. 미매칭 값은 uniform `strokeDash`를
  쓴다. creation omission은 solid `[]`; edit omission은 이전 uniform/map을 유지한다.
- map은 입력 순서가 아니라 typed raw identity로 찾는다. `1`, `'1'`, `true`는 서로
  다르고 `0`과 `-0`은 같은 값이다. 날짜 object/정규식/함수/`null`은 받지 않는다.
  temporal 축은 기존 axis tick 계약대로 numeric timestamp를 쓴다.
- 각 entry는 정확히 `value,strokeDash` 두 키만 받는다. 같은 typed value의 중복,
  잘못된 scalar, 비배열/홀수 길이 dash, 음수/비유한 수, 알 수 없는 키를 거절한다.
  `[]`는 solid. `[0,0]` 등 현재 grid가 받는 even non-negative pattern의 처리도
  기존 shared concrete dash 정책을 그대로 따른다. odd pattern을 자동 복제하지 않는다.
- map의 값이 현재 선택 tick에 없어도 보존한다. data/domain/count 변경 후 해당 값이
  생기면 적용된다. map은 tick/domain에 새 값을 추가하지 않는다. `[]` 또는 `'auto'`는
  map만 지우고 uniform dash를 보존한다. uniform을 `[]`로 편집해도 map은 남는다.
- 같은 guide의 value 수와 map 길이는 기존 generated-item/work 예산으로 제한한다.
  읽기 전용 normalized map은 구조적으로 복사하고 frozen caller 배열을 수정하지 않는다.
- band grid의 `bandPosition:'boundary'`는 선택 band의 두 경계에 그 band value의
  pattern을 적용한다. 인접 band가 한 경계를 공유하고 pattern이 다르면 중복 stroke를
  겹치지 말고 **현재 selection order에서 먼저 생성된 band의 스타일**을 사용한다.
  이 순서는 기존 boundary dedup 순서와 일치해야 한다. 정렬을 바꾸면 선택 순서도 명시적이다.
- 의미 있는 틱/그리드는 기존 native guide에 남는다. concrete item별 `strokeDash`는
  기존 line primitive로 materialize하며 renderer가 map이나 scale을 해석하지 않는다.
- complete-axis, ticks-and-labels group, focused tick creation/editing, `createGuides`,
  grid facade/editor의 nested closed validators와 metadata를 모두 동기화한다.
  Polar/Parallel에는 이 Cartesian 확장을 암묵적으로 전파하지 않는다.

## 4. #174 + #194 + #199: 축 frame과 제목 배치

### 네 가지 독립적인 좌표 규칙

| 옵션 | 단위·방향 | 소유자·생략·reset |
| --- | --- | --- |
| complete-axis `offset` | finite logical px, >=0, 각 side의 바깥 방향 | axis frame, creation 0, edit omission 보존, 0으로 reset |
| title `offset` | finite signed logical px, 양수 바깥·음수 안쪽 | title, 기존 inferred 기본 유지, 명시 숫자는 inference 해제 |
| title `at` | 기존 start/center/end 또는 scale-domain 숫자 | 기존 title 계약 유지 |
| title `alongOffset` | finite signed logical px, X는 오른쪽·Y는 아래쪽이 양수 | title, 기본 0, edit omission 보존, 0으로 reset |

`axis.offset`과 `title.offset`은 nesting으로 구별한다. 음수 whole-axis offset은
거절하고 음수 title offset만 허용한다. title `at:272.5`를 pixel 위치로 재해석하지
않는다. side나 reversed scale을 바꿔도 `alongOffset`의 screen direction은 유지한다.

정확한 계산 순서는 다음과 같다.

```text
축 ID → bound coordinate + scale + 각 component side
  → plot baseline + axis outward offset = displaced frame
  → title at를 scale로 매핑 + signed screen alongOffset
  → displaced frame으로부터 signed title offset
  → local align/baseline으로 glyph/multiline block 배치
  → resolved anchor를 중심으로 rotation
  → painted bounds, Canvas fit, guide collisions
```

X bottom은 `(mappedAt + alongOffset, plotBottom + axisOffset + titleOffset)`,
X top은 `(mappedAt + alongOffset, plotTop - axisOffset - titleOffset)`이다.
Y left는 `(plotLeft - axisOffset - titleOffset, mappedAt + alongOffset)`,
Y right는 `(plotRight + axisOffset + titleOffset, mappedAt + alongOffset)`이다.
scale range의 원래 global 좌표를 두 번 plot origin에 더하지 않는다.

### 추가 title style

```ts
// Cartesian AxisTitleOptions에만 추가/확장
offset?: number;          // 기존 >=0 제한을 finite signed로 확장
alongOffset?: number;
align?: 'left' | 'center' | 'right';
baseline?: 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom';
```

권고: 별도 `titleX/titleY`나 자유 anchor 객체를 추가하지 않는다. 기존 `at`, signed
perpendicular `offset`, screen `alongOffset`이 두 자유도를 이미 표현한다. baseline은
기존 text domain과 같은 closed enum을 쓰며 새 backend 전용 값은 추가하지 않는다.

- `align`/`baseline` 기본은 기존 `center`/`middle`이다. local text frame에서 적용하고
  그 뒤 회전한다. 글자가 회전한 뒤 screen-left를 맞춘다는 뜻이 아니다.
- complete-axis title, whole-axis title patch, focused title creation/editing에 동일 적용한다.
  생략한 편집은 explicit/기본 상태를 보존한다. `align:'center'`, `baseline:'middle'`,
  `alongOffset:0`은 기존 기본값으로 되돌린다. 새 `'auto'`/`null` reset literal은 추가하지
  않는다. offset inference로 복귀하려면 title 제거 후 offset 없이 재생성한다.
- explicit signed title offset은 label 자동 회피로 덮어쓰지 않는다. omitted title offset은
  현재 `inferredOffset` 정책대로 새 frame·폰트·align·baseline의 실제 bounds를 사용한다.
- 줄바꿈 제목은 line ordering/1.2×fontSize 간격을 유지한다. `align`은 각 줄의 공통
  local anchor, `baseline`은 전체 block 배치를 결정한다. 기존 no-option multiline의
  concrete `lines` 값과 SVG는 그대로다. 회전은 전체 block의 같은 anchor를 사용한다.
- 완전한 축의 line/ticks/labels/title은 같은 owner offset을 한 번 적용한다. component를
  없앴다가 같은 owner에 만들면 그 frame을 상속한다. marks, plot 크기, scale range,
  grid의 길이/위치는 움직이지 않는다. tick/label의 기존 `alongOffset`도 중복 적용하지 않는다.
- 명시적 Canvas가 부족하면 기존 overflow 오류가 난다. 이미 opt-in한 inner-plot sizing의
  기존 margin expansion은 유지하지만, 이 옵션만으로 새 자동 확장/축소 모드를 켜지 않는다.
- 안쪽 제목과 data mark의 의도적인 겹침을 새로 금지하지 않는다. 기존 native guide
  bounds와 자기 label/title 충돌은 계속 검증한다. 회전·정렬 후 측정 bounds를 쓴다.
  잘못된 값과 불충분한 여백은 earlier program과 caller input을 바꾸지 않고 실패한다.

구체적인 승인 대상 예:

```js
program
  .createXAxis({ title: { text: 'Lower title', offset: -30, at: 'end' } })
  .editXAxisTitle({ align: 'right' });

program
  .createYAxis({ title: { text: 'Upper title', rotation: 0, at: 'end' } })
  .editYAxisTitle({ offset: 5, alongOffset: -5, align: 'left' })
  .editYAxisTitle({ baseline: 'bottom' });

program
  .createXAxis({ title: { text: 'Attribution', at: 'center' } })
  .editXAxisTitle({ alongOffset: 85 });
```

마지막 예는 375px 플롯의 기존 중심 global291.5를 global376.5로 이동시키는 #199의
재현 목표다. #174의 제목은 같은 coordinate frame과 source anchoring에 맞춘
`at`/signed offsets로 복원하며 임의 margin이나 데이터를 보정하지 않는다.

## 5. #195: 축 레이블의 명시적 정렬

`CartesianAxisLabelStyleOptions.align?:'left'|'center'|'right'`를 추가한다.
complete/group/whole/focused creation·edit의 모든 경로가 같은 validator를 쓴다.

- 생략한 생성은 지금의 side/rotation/endpoint-flush 추론을 그대로 사용한다.
  생략한 edit은 이전 explicit 값을 보존한다. 새 reset literal은 추가하지 않는다.
  inferred 상태로 돌아가려면 labels를 제거하고 align 없이 재생성한다.
- 명시적 align은 회전 전 local text anchor다. side나 `flush`가 추론한 anchor보다
  우선한다. explicit align 때문에 tick/label 위치, 값, format, labelMap/colorMap,
  font, wrapping, alongOffset, outward offset 또는 stored flush intent를 바꾸지 않는다.
- named axis와 canonical 축 모두 같은 옵션을 사용한다. side 변경 시 explicit 값은
  유지되고 inferred 값은 새 side를 따른다. multiline/wrap의 각 줄과 전체 bounds도
  선택한 align으로 계산한다. 기존 no-option `flush` 결과는 동일해야 한다.
- theme은 기존 explicit-style 우선순위를 따른다. theme replay가 explicit align을
  지우거나 font-only edit에서 inferred align을 explicit으로 굳히면 안 된다.
- 실제 variable-width label들의 동일 left/right edge, 0/45/90도 회전, 서로 다른 side,
  source의 nine-label shared-left 요구를 concrete anchor와 bounds로 검증한다.

## 6. #197: 이름 있는 독립 Cartesian 축

### public identity와 selector

```ts
// complete-axis 생성에 추가
id?: string;
offset?: number;

// complete 및 focused component 편집/생성/제거에 추가
target?: string;   // axis resource ID; mark/scale ID가 아니다.

// createAxes와 createGuides.axes의 Cartesian x/y를 확장
x?: false | CompleteAxisOptions<XAxisPosition> |
    readonly [NamedCompleteAxis<XAxisPosition>, ...NamedCompleteAxis<XAxisPosition>[]];
y?: false | CompleteAxisOptions<YAxisPosition> |
    readonly [NamedCompleteAxis<YAxisPosition>, ...NamedCompleteAxis<YAxisPosition>[]];
// NamedCompleteAxis는 id가 필수인 CompleteAxisOptions다.
```

단일 `createXAxis/createYAxis`에는 `id`를 쓰고 `target`을 받지 않는다. 이미 있는
owner에 component를 생성할 때는 `createYAxisTitle({target:'share',...})`와 같이 쓴다.
생성자의 optional `scale`은 기존 owner binding과 같아야 한다. binding 변경을 focused
editor의 숨은 동작으로 추가하지 않는다.

권고: 동일 coordinate에서 물리적 side당 한 축만 지원한다. 서로 독립인 left/right
Y와 top/bottom X는 허용하지만 같은 side의 여러 축, 자동 displacement, 축 재명명,
scale 간 변환은 이번 범위에 넣지 않는다. #194의 explicit offset을 줘도 same-side
두 번째 축을 허용하지 않는다.

- `id` 생략은 지금의 canonical `x`/`y` identity다. explicit `id:'x'/'y'`는 해당
  채널의 canonical alias로만 허용한다. 반대 채널 및 기존 reserved `theta`, `radius`,
  `parallel`은 named Cartesian ID로 거절한다. 다른 ID는 기존 `validateUserId`를 따른다.
  축 ID namespace의 중복과 같은 coordinate/side 점유는 atomic 오류다.
- `target` 생략은 해당 채널 canonical이 있으면 그 owner, canonical이 없고 후보가
  하나면 그 owner를 선택한다. named-only 후보가 둘 이상이면 explicit target이 필요하다.
  존재하지 않는 target, 반대 채널 target, binding이 다른 scale/coordinate 필터는 오류다.
  생성 시 canonical이 없다는 이유로 기존 named-only owner를 덮어쓰지 않는다.
- aggregate 배열의 모든 entry는 id 필수, 빈 배열은 오류다. 전체 ID/binding/side/최종
  bounds를 먼저 검증하고 하나의 immutable action에서 명시한 순서대로 materialize한다.
  세 번째 entry가 실패해도 반환 가능한 반쪽 program이나 caller 배열 변경은 없다.
- named owner는 complete creator가 선언한 단일 side를 가진다. side 변경은
  `editYAxis({target:'share',position:'left'})`처럼 전체 축을 함께 움직이는 action에서
  수행하고 destination이 점유되어 있으면 오류다. named focused component의 position이
  owner side와 다르면 거절하고 whole-axis editor를 안내한다.
- 기존 canonical focused component들의 독립 side 동작은 유지한다. 새 named 축의
  same-side 점유 검사에서는 기존 canonical에 실제 남아 있는 모든 component side를
  읽는다. legacy mixed-side 상태를 새 저장 형식으로 import했다고 임의 정규화하지 않는다.
- 전체 축 제거는 선택한 owner의 semantic/config/graphics만 지운다. component를 제거할
  때는 owner와 sibling component를 보존하고 마지막 component가 없어지면 기존 cleanup
  원칙대로 owner를 제거한다. 다른 축/marks/scales/grid를 대신 삭제하지 않는다.
- `removeAxes` 같은 aggregate remover가 있으면 기존 options의 축 channel 선택 의미를
  유지하며 named Cartesian 축도 해당 channel 집합에 포함한다. focused 선택이 필요한
  경우 기존 `removeXAxis/removeYAxis({target})`를 쓴다. 새 selector 문자열 문법은 없다.

### 상태의 단일 소유자와 concrete identity

```text
semanticSpec.guides.axis[axisId]
  canonical x/y: 기존 entry shape 유지
  named: 기존 scale/coordinate/title + channel:'x'|'y' + position

materializationConfigs.guides.axis[axisId]
  binding / line / ticks / labels / title: 기존 역할 유지
  frame?: { offset }              ← 0을 명시한 경우에도 author intent 보존

concrete graphics
  canonical: 기존 xAxisLine / yAxisLabels 등의 ID 그대로
  named: axis_<axisId>__Line / __Ticks / __Labels / __Title
  facet: 기존 child namespace를 위 concrete ID 바깥에 적용
```

named concrete prefix는 canonical/다른 domain ID와 충돌 여부를 기존 graphic ID 검증으로
확인한다. 사용자가 우연히 만든 extension primitive와 충돌하면 덮어쓰지 않고 실패한다.
서로 다른 user IDs는 서로 다른 suffix prefix를 만든다. axis ID를 문자열 path에 그대로
넣어도 기존 `[A-Za-z0-9_-]+` 검증 덕분에 property traversal로 해석되지 않는다.

frame offset은 appearance/placement intent이므로 `guideConfigs.axis[id].frame.offset`
한 곳에 저장한다. semantic entry에 동일 수치를 복제하지 않는다. component config와
concrete geometry에는 그 frame을 해결한 결과만 전달한다. canonical 기본 offset을
생략한 program에 새 frame 객체를 추가하지 않는다. 제목의 text 의미는 기존 semantic
entry에, title placement/style은 기존 title config에 남는다.

### refresh와 facet의 필수 결합

owner iterator는 `{id,channel,scale,coordinate,side,components}`를 명시적으로 반환하는
좁은 공통 resolver가 맡는다. 아래 기존 소비자가 이 iterator를 사용해야 한다.

- data/derived source 및 encoding 변화, scale edit/preview/removal/reference collector
- Canvas/margins/coordinate resize, font metrics/theme replay, guide reflow
- line뿐 아니라 ticks/title만 남은 축의 scale consumer와 standalone axis bindings
- grid의 inferred values 선택: scale binding이 일치하는 유일한 축만 사용한다.
  동일 scale의 여러 tick 정책이 서로 다르면 explicit grid values/count를 요구한다.
  scale 후보가 여럿이면 explicit scale/coordinate를 요구하며 첫 owner를 고르지 않는다.
- outer-axis facet policy: bottom은 각 column의 마지막 occupied row, top은 첫 row,
  left는 각 row의 첫 column, right는 마지막 column에 해당 side의 축을 보존한다.
  ragged/grid/repeat의 실제 occupied cell을 기준으로 한다. `axes:'each'`는 전부 보존한다.
- labels/title의 실제 side lane을 수집하는 legend clearance와 shared parent collision.

legacy canonical에 대해서는 기존 trace/IDs/graphics/omitted-target 및 저장 round-trip을
동일하게 유지한다. 새 named 축끼리 또는 named 축과 retained canonical label/title의
실제 occupied text bounds가 겹치면 named creation/편집에서 실패한다. 의도된
line↔tick 접촉이나 같은 축의 guide 연결을 새로운 text collision로 오인하지 않는다.
기존 axis↔axis 전체 skip을 그대로 복사해 named 축 검증을 빠뜨리지 않는다.

## 7. #206: 최종 facet plot union을 소유하는 shared 범례

### 선택한 public 계약

권고: 새 `createSharedLegend`를 만들지 않고 기존 facet guide 옵션을 객체로 확장한다.
unit의 `createLegend` containment를 완화하거나 child margin을 임시로 키우는 방식은
사용하지 않는다. 기존 `legend:'shared'`의 추론/promotion 결과는 exact parity를 유지한다.

```ts
interface FacetGuideOptions {
  axes?: 'each' | 'outer';
  legend?: false | 'shared' | LegendOptions;
}
```

객체는 최종 parent의 shared 범례를 **직접 선언**한다. `target`은 source template의
mark ID이며 child별 namespace나 concrete graphic ID가 아니다. 생략 시 source mark와
encoded scale/channel이 하나로 정해지는 경우만 추론한다. 객체의 omitted appearance와
position은 기존 unit `LegendOptions` 기본값을 사용한다. 기존 child legend style을
우연히 가져오지 않는다. source의 범례를 그대로 promote하려면 `'shared'`를 쓴다.

```js
baseWithoutLegend
  .facet({
    field: 'panel', spacing: 'plot',
    guides: { axes: 'outer', legend: { position: 'top-left' } }
  })
  .editCompositionLayout({ gap: 2 })
  .editLegendTitle({ fontSize: 11 })
  .editLegendLabels({ fontSize: 10 });
```

좁은 4개 cell의 inner plot60×275와 gap2를 그대로 유지하고 plot union246px를 검증한다.
범례는 child60px가 아니라 그 union의 top-left에 둔다. gap/columns 편집으로 union이
작아져 실제 범례가 더 이상 들어가지 않으면 그 편집은 원자적으로 실패한다.

### 기존 action의 facet parent lifecycle

- `editLegend`, `editLegendLayout/Labels/Title/Symbols/Border`, `editLegendBlock`,
  `removeLegend`는 해당 shared owner가 있는 **facet/facetGrid/repeat parent**에서도
  동작한다. 일반 concat이나 임의 nested composition까지 같은 기능이 있다고 주장하지
  않는다. renderer primitive나 `getCompositionChild`를 수정하는 우회는 필요 없다.
- post-facet `createLegend` 자체는 이번 확장에 넣지 않는다. 없는 parent 범례를 선언할
  때는 기존 `editFacetGuides({legend:{...}})`를 사용한다. 이것은 처음부터 `facet`에
  객체를 준 것과 같은 최종 결과를 만든다. promoted owner는 기존 focused editor로
  이동/스타일 변경할 수 있다.
- parent `target`은 source mark ID다. 채널/block 선택은 기존 unit과 같은 closed
  계약을 쓴다. 서로 다른 source mark를 합치거나 ambiguous target을 첫 child mark로
  대체하지 않는다. resolved scale/domain/range/encoding recipe가 모든 cell에서 같아야
  shared가 된다. incompatible/independent legend scale은 오류다.
- `removeLegend({target,channels})`는 해당 콘텐츠만 제거한다. 마지막 block을 없애면
  `guides.legend:false`와 같은 final parent 상태로 정리하여 refresh가 범례를 되살리지
  않는다. 부분 제거는 남은 shared 콘텐츠의 명시적 parent intent로 저장한다.
- `editFacetGuides({legend:false})`는 shared graphic/config와 authored intent를 지운다.
  다시 `'shared'`를 명시하면 기존 template promotion/inference로 돌아간다. 객체를
  주면 새 authored shared declaration으로 교체한다. 객체에 `'auto'` reset 모드를
  추가하지 않는다. focused edit의 omission/reset은 unit과 동일하다.
- 이전 `'shared'` parent를 focused 편집하면 현재 resolved owner를 바탕으로 authored
  request를 만든다. explicit/inferred option flag를 보존하여, 기본 offset을 임의의
  숫자로 고정하거나 자동 title/domain sample을 문자열/배열로 굳히지 않는다.

### parent 상태와 rematerialization

```text
compositionSpec.facet.guides.legend
  false          → shared 없음
  'shared'       → legacy template promotion/inference (변경 없는 경로)
  LegendOptions  → authored parent request (단일 canonical 의도)
        ↓ 명시적 parent guide transaction
  source mark/channel resolver + 모든 child resolved-scale compatibility
        ↓ intrinsic symbol/text/border 측정 (child fit 검사 없음)
  final facet plot union + retained axes/headers/title 계산
        ↓ placement + 실제 occupied bounds 검사
  parent guideConfigs + fully concrete shared graphics
        ↓ renderer는 graphicSpec만 읽음
```

`compositionSpec.facet.guides.legend` 객체가 authored intent의 canonical owner다.
parent `guideConfigs`는 그 결과인 normalized materialization config이며 별도 authored
override registry를 추가하지 않는다. inference 표시는 normalized config가 기존처럼
보존한다. child template과 child programs에 parent legend intent를 복사하지 않는다.
old snapshot의 false/shared 문자열은 migration 없이 기존 의미로 해석한다.

scale/data/theme/font/Canvas 변경, `editCompositionLayout`, `editFacetSource`,
`editFacetScales`, header/guide 편집, persistence/import는 이 parent intent를 보존하고
같은 명시적 composition guide transaction을 실행한다. 기존 `rederiveFacet`가
template guideConfigs로 parent를 덮는 경로를 그대로 두면 안 된다. source 교체로
target/encoding이 사라지거나 incompatible해지면 silently reset하지 않고 atomic 오류다.

final plot union은 occupied child inner-plot들의 축정렬 bounding rectangle이다.
cell 사이 gap은 그 rectangle의 일부다. `position:'top-left'` 등은 unit과 같은 occupied
border 포함 anchor 규칙으로 union 안에 둔다. `at:{x,y}`는 union top-left 기준이다.
제목은 plot union의 기준이 아니다. 내부 범례는 실제 symbol/text/border bounds가 union
및 Canvas 안에 있어야 하고 retained axes/header/title과 겹치면 실패한다. data mark와
겹치는 것은 내부 범례의 의도이므로 새 mark-collision 금지는 추가하지 않는다.

outside placement는 기존 기본 lane/offset 규칙으로 실제 retained named/canonical axes
전체를 피한다. 명시적 offset은 그대로 유지하고 collision에서 실패한다. legend-only
parent reflow 때문에 child inner width/height, raw rows, encoding domains를 바꾸지 않는다.
outside parent Canvas의 기존 inferred fit 확장은 보존한다. 내부 placement를 맞추려고
cell 자체를 확대하거나 category/font/symbol을 임의로 줄이지 않는다.

### 범례 담당 기능과의 결합 계약

#193의 block position, #177의 channel selector, #200의 gradient direction/title-bottom,
#205의 combined legend가 승인·구현되면 이 parent owner에서도 **unit과 같은 closed
schema 및 선택 규칙**을 사용한다. facet 전용 유사 옵션이나 느슨한 validator를 만들지
않는다. source target + explicit channel로 선택한 block만 편집하고 sibling blocks는
유지한다. 합쳐진 block의 동일 의미·scale compatibility와 실제 occupied group bounds도
같은 resolver에서 검사한다. 서로 다른 cell의 차이를 conceal하기 위해 first-child
색상/심볼을 무조건 대표값으로 채택하지 않는다.

`guides.legend` authored 객체의 허용 option은 최종 승인된 `LegendOptions`를 참조하며,
partial editor가 전체 creator contract보다 넓은 option을 받아들이지 않는다. #193의
block placement가 group placement와 충돌할 때의 우선순위도 unit 계약을 그대로 따른다.
새 block selector와 gradient orientation을 serialization/reflow에서 소실시키지 않는다.

## 8. 공통 불변성·저장·오류·문서 계약

- 모든 nested 배열·style/map/request는 changed path를 복사한다. immutable speculative
  branch에서 complete final geometry와 reference를 검증한 뒤 반환한다. 실패 시 earlier
  program, trace, caller input, facet source/children은 exact-equal이어야 한다.
- action은 semantic/config 갱신과 wrapped materialization을 명시적으로 호출한다.
  named resources나 facet intent를 읽는 renderer compiler, global completion hook,
  user-facing rendering primitive는 추가하지 않는다.
- persistence validator는 새 optional finite 수치, closed enum, typed map, named ID와
  channel/coordinate/scale reference, facet legend 객체를 검증한다. malformed import와
  duplicate/same-side/unknown references를 live action과 같은 policy로 거절한다.
  resource reference collector와 inspection/diff는 새 axis IDs와 source mark 관계를 읽는다.
- serialized format/version을 바꿀 필요는 실제 encoded schema compatibility로 판단한다.
  단순 optional field 추가만으로 새 format을 발명하지 않는다. 새 enum/object가 기존
  schema에서 거부되는 부분은 current validator를 명시적으로 확장하고 legacy reader
  fixtures를 유지한다. 승인이 없는 migration이나 자동 state rewrite는 추가하지 않는다.
- 오류는 existing diagnostic taxonomy의 invalid value / unknown resource / ambiguous
  resource / incompatible resource / Canvas overflow를 재사용한다. optionPath와 axis ID
  또는 source target을 알려주고 원시 데이터 전체를 error에 담지 않는다. exact 영어
  sentence를 새 public compatibility 보장으로 만들지 않는다.
- declaration은 Full/Basic의 실제 capability를 반영한다. Basic의 현재 creation-only
  범위는 유지하고 새 editor/멀티-owner 기능을 몰래 Basic에 노출하지 않는다. creation
  옵션의 재사용이 Basic을 확장한다면 typed installed consumer와 bundle budget 증거를
  별도로 남긴다. 새 action 이름은 추가하지 않으며 metadata는 기존 action의 옵션으로
  갱신한다.
- canonical 계약은 `agent_docs/contract/current/AXES.md`, 관련 grid/facet/legend current
  문서가 소유한다. 공개 API/types, guide docs, examples, generated action cards/search
  references와 source validators를 같은 checkpoint에서 동기화한다.
- axis ID/parent guide ownership 확장은 `SECOND_ARCHITECTURE.md`의 deliberate ownership
  변경에 해당한다. 구현 시 macro-architecture에 바뀐 경계만 기록하고 상세 API는 owning
  contract로 링크한다. 이번 검토 문서를 runtime 또는 generated catalog 입력으로 만들지 않는다.

## 9. 구현 순서와 필수 검증 행렬

권고 순서: (1) named-axis identity/selector/consumer 기반 → (2) frame resolver →
(3) signed title/alongOffset/align/baseline 및 label align → (4) typed guide dash →
(5) final facet shared owner → (6) 범례 담당 기능 결합과 release 소비자 검증.
각 conceptual checkpoint는 선언/계약/docs와 함께 검증한 뒤 부모가 commit/push한다.

| 분야 | 구현 후 요구하는 증거 |
| --- | --- |
| 기본 호환 | no-new-option canonical graphicSpec/SVG bytes·IDs·trace hierarchy, old false/shared facet 결과, save/restore parity |
| 생성/편집 분해 | complete→whole→focused, aggregate array→개별 complete creators가 동일 final semantic/concrete 결과 |
| 좌표 | x/y 네 side, reversed/time/band/linear/transformed scales, frame0/20, title offset 음수/0/양수, alongOffset 부호와 회전/줄바꿈 |
| 실제 text bounds | local align 3종과 baseline6종, explicit vs inferred/flush/theme, 자기 label/title 및 named 다른 축의 충돌 |
| 지도/틱 | uniform/map/solid, typed0/'0'/false, duplicate/unknown map key, domain 변화, band boundary shared-edge 규칙 |
| identity | canonical+named, named-only 단일/복수, explicit·omitted target, wrong-channel/unknown/duplicate ID, same-side 거절 |
| lifecycle | component/whole 제거·재생성, data/derived/scale/coordinate/Canvas/theme/font refresh, reference-removal atomicity |
| facet | four60×275 plots+gap2의 union246, inside legend wider than60, top/bottom/left/right named outer axes, ragged/grid/repeat |
| parent 범례 | false/shared/object 생성, old promotion→focused edit, partial/remove-last, reflow/source 교체, #177/#193/#200/#205 결합 |
| 오류 | NaN/Infinity/음수frame/잘못된enum/부족한margin/불일치scale, malformed snapshots, 실패한 부모·caller·children 불변 |
| 렌더링 | 같은 concrete graphics의 Canvas/SVG/PNG/PDF 소비, multiline/text anchors/strokeDash export, plot-region ink와 finite bounds |
| 패키지/문서 | installed ESM/TypeScript Full/Basic 범위, current contracts/docs/generated metadata, measured package/browser budgets |

focused 검증 후 full unit/contracts/docs와 installed-package 경계를 실행한다. 기능 증가분
때문에 실제 budget을 넘으면 기존 정책대로 측정값과 최소 조정을 공개하고, 이전 한도를
통과했다고 쓰지 않는다. 실제 차트의 재번역은 별도 paused translation task를 임의로
재개하지 않으며, 새 runtime을 dataset 저장소에 동기화하는 부모 작업 범위에서 결정한다.

시각 변경 target은 현재 공개된 proposal 근거와 concrete source bounds를 재사용해
승인 package에 제시한다. 새 appearance가 과거 승인과 달라지면 해당 부분만 visual
Gate를 유지한다. 픽셀을 보지 않은 structural/export 검증을 인간 시각 확인으로 보고하지
않는다. 일곱 이슈의 구현·검증·문서가 끝나기 전에 이 검토 문서만으로 이슈를 닫지 않는다.
