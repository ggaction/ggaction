# 범례·마크 기능 12건 통합 설계 검토

## 상태와 승인 경계

- Gate: `ready-for-review`. 이 파일은 설계 권고이며 공개 API·저장 schema·renderer 변경을 승인된 것으로 기록하지 않는다.
- 사용자 범위: 미구현 기능을 설계 검토한 뒤 모두 구현. 이 문서는 #164, #170, #171, #173, #175, #176, #177, #193, #200, #203, #205, #208의 구체적인 선택을 제시한다.
- 이 checkpoint에는 runtime, declarations, tests 변경이 없다. 구현·시각 검증은 아래 결정을 명시적으로 승인받은 뒤 진행한다.
- 기존 상세 proposal의 동작을 재사용하되, 아직 정해지지 않았던 reset, block 선택, 융합 표현, clip 및 compositing 경계를 여기서 명시한다. 기존 proposal의 승인 상태를 소급 변경하지 않는다.
- 새로운 시각 결과는 아래 primitive 명세와 public 호출을 쌍으로 제시하는 별도 visual Gate가 필요하다. 현재 런의 차트 이미지를 이미 검토했다는 의미가 아니다.

## 조사한 현재 경계

| 책임 | 현재 owner / 이번 설계의 원칙 |
| --- | --- |
| 범례 target 및 block 식별 | `src/actions/guides/legends/target.js`: target은 유일해야 하고 block key는 정렬된 channel 집합이다. first-match 선택을 추가하지 않는다. |
| block override | `src/actions/guides/legends/blocks.js`: 기존 `blockOverrides`를 확장하며 별도 render state를 만들지 않는다. |
| focused editor | `src/actions/guides/legends/focused.js`: public focused action은 같은 의미의 whole editor와 동일한 child materialization을 호출한다. |
| 범례 배치 | 기존 family layout → `legendGroups` / guide transaction. 최종 title·glyph·stroke·text bounds로 위치와 충돌을 검증한다. |
| 점 모양 | `src/grammar/pointShapes.js`: named polygon을 실제 면적으로 정규화하고 concrete circle/rect/path로 만든다. renderer는 이름을 모른다. |
| clip | 기존 nested concrete `canvas`가 translate와 rectangular clip을 갖는다. 새 clip primitive를 도입하지 않는다. |
| painter | Canvas/SVG는 `graphicSpec`만 읽는다. PNG/PDF는 기존 Node adapter가 같은 concrete result를 소비한다. |
| 저장 | `guideConfigs`, mark config 및 semantic intent가 canonical이다. concrete 결과는 action이 명시적으로 다시 만든다. renderer cache나 중복 dataset을 저장하지 않는다. |
| package | Full에 편집 lifecycle, Basic에 지원되는 생성 경로만 제공한다. Basic에 편집 method나 facet을 새로 노출하지 않는다. |

기본값 생략 프로그램은 새 optional key를 저장하지 않아 기존 semantic/graphic/trace의 정확한 parity를 유지한다. 새로 추가하는 key는 creation, edit, load에서 동일한 closed grammar로 검증한다. finite 수치, plain-object shape, resource/작업량 한도와 immutable 원자성을 기존 helper가 소유한다.

## A. 전체 기능을 함께 쓰는 규칙

### A1. block 선택과 융합은 다른 차원이다

권고 공개 입력:

```js
program.editLegend({ channel: 'opacity', labels: { fontSize: 10 } });
program.editLegendTitle({ channel: 'opacity', title: 'Strength' });
program.editLegendBlock({ target: 'points', channel: 'size', position: 'bottom-left' });
program.createLegend({ combine: 'size-shape' });
program.createLegend({ combine: 'color-size', values: [0, 5, 10] });
```

- `channels` 복수형은 기존처럼 **전체 target의 최종 content 집합**이다. `channel` 단수형은 **이미 있는 하나의 block을 고르는 selector**이며 content를 추가·제거하지 않는다. 같은 호출에 둘을 넣으면 오류다.
- 새 `channel?: LegendChannel`을 `editLegend` 및 기존 focused editor 다섯 개에 제공한다. 이슈 #177의 labels/title 외에도 같은 선택을 layout/symbols/border에 재사용하여 서로 다른 선택 API가 생기지 않게 한다.
- target을 생략하면 기존 `resolveLegendTarget`의 유일 target 규칙을 유지한다. channel로 여러 target 중 하나를 추정하지 않는다. target이 여러 개면 명시하도록 오류를 낸다.
- selector를 넣으면 기존 block descriptor를 정확히 하나 찾아 family editor로 라우팅한다. 없는 channel이나 모호한 descriptor는 오류다. 병합 block은 어떤 member channel로 골라도 같은 block을 한 번만 편집한다.
- selector를 생략한 기존 whole/focused 호출은 기존 categorical+size sharing과 priority를 그대로 보존한다. 기존에 여러 block을 다 편집하던 것처럼 소급 변경하지 않는다. 모호성을 줄이고 싶으면 새 selector를 쓰라는 문서를 제공한다.
- `combine` 권고 union은 `'separate' | 'size-shape' | 'color-size'`이다. 생성 생략은 기존 separate, 편집 생략은 현재 policy 보존, `'separate'`가 명시적 reset이다. 생성/전체 편집에만 적용하며 `channel` selector와 함께 쓰지 않는다.
- categorical 융합은 기존 categorical config의 channels에 `size`를 허용하는 opt-in 경로를 쓴다. quantitative 융합은 새 `colorSize` kind를 쓴다. channel 의미와 numeric sampling이 달라 두 표현을 같은 kind로 숨기지 않는다.
- 하나의 channel은 target 안에서 정확히 하나의 live block에만 소속된다. 충돌하는 단독 block을 다시 만들려면 먼저 explicit separate transition이 필요하다. member channel을 제거하면 융합 block 전체를 제거하며 mark encoding은 보존한다.

### A2. override precedence와 replay

1. 원본 mark/scale meaning → family의 inferred native config.
2. 명시적 whole legend config → 선택 block override.
3. block-local position이 있으면 group 위치/packing에서 제외하고 자체 anchor를 쓴다. reset 후에만 group에 재합류한다.
4. glyph의 mapped shape/area/color 등 data meaning은 display override보다 우선한다. mapped property를 scalar patch로 대체하려 하면 오류다.
5. recipe layer opacity와 clip은 glyph paint/visible window만 바꾸고 sample value나 encoding을 바꾸지 않는다.
6. layout은 **clip 이후 보이는 glyph bounds + text + title + border stroke**를 측정한 뒤 기존 guide transaction에서 최종 배치한다.

scale/data/Canvas/theme/mark/coordinate 변경 및 facet/repeat는 이 순서를 명시적 materialization으로 다시 실행한다. eligibility가 깨지거나 bounds가 맞지 않으면 전체 action을 거부한다. stale 그림 유지, 자동 split, 자동 첫 resource 선택은 없다.

### A3. facet shared legend와의 접점 (#206)

facet 검토안의 `facet({ guides: { legend: false | 'shared' | LegendOptions } })`를 공통으로 따른다. shared block은 child의 우연한 기존 범례가 아닌 facet parent의 명시적 guide owner다. parent의 target은 source mark ID이며 parent `editLegend`/focused/remove가 그 owner를 대상으로 동작한다.

- #177의 `channel`은 parent target 안의 block을 고른다. child target을 first-match하지 않는다.
- #193의 edge/corner 위치는 child plot이 아닌 **최종 child plot union** 기준이다. shared parent group packing에서도 explicit local position을 존중한다.
- #171/#205의 융합은 모든 child가 같은 field/grain, compatible shared domain/mapping을 갖는 경우만 허용한다. 독립 scale을 강제로 합치거나 child 중 하나의 scale을 대신 쓰지 않는다.
- #200 direction/title 및 #208 recipe opacity, #176 clip/#173 border/#164 labelMap도 같은 parent config에 저장하고 한 번 materialize한다.
- unit 및 shared parent에서 동일한 descriptor/override 검증 helper를 소비한다. parent와 child에 같은 설정을 중복 소유하지 않는다.

## B. 이슈별 공개 계약

### #164 — 연속 size sample의 표시 labelMap

```js
program.editLegendBlock({
  target: 'points', channel: 'size',
  labelMap: [{ value: 3.14159, label: '0' }, { value: 65.44985, label: '2' }]
});
program.editLegendBlock({ target: 'points', channel: 'size', labelMap: 'auto' });
```

- 기존 direct `labelMap`의 적용 대상을 sampled continuous **size** block까지 확장한다. 새 top-level option이나 `text.labelMap`은 만들지 않는다. #205 colorSize block은 size member로 동일한 numeric 표시 map을 적용한다.
- array entry는 정확히 `{value, label}`이며 value는 finite number, label은 문자열이다. exact numeric equality는 기존 display-label helper의 `===`를 재사용하므로 `0`과 `-0`은 같은 key다. NaN/Infinity, string key, 중복 key, extra key, malformed entry는 원자적 오류다.
- `''` label은 해당 text만 생략한다. symbol, sample, 항목 slot과 map key는 보존한다. unmapped value는 기존 formatter로 표시한다.
- 생성 기본값은 map 없음, 편집에서 생략은 보존, `'auto'`는 override 제거다. 빈 array도 유효한 명시적 빈 map이다.
- 현재 sample에 없는 finite key는 거부하지 않고 map에 보존한다. sample이 사라지면 그 entry는 비활성, 같은 value가 돌아오면 다시 적용된다. data/scale edits가 map key를 재해석하거나 바꾸지 않는다.
- raw rows, size domain/range, sample 순서와 area는 변경하지 않는다. 바뀔 수 있는 것은 text 및 그에 따라 다시 측정되는 occupied bounds다.
- 소유권: 기존 `blockOverrides[key].labelMap`. sampled size normalizer는 공통 typed-map 검증 뒤 numeric 제한을 추가한다. 다른 sampled opacity/strokeWidth로 확장하는 것은 이번 scope에 포함하지 않는다.
- 검증: exact samples/format fallback/empty label/reset/sample 제거·재등장, geometry equality, all edge/corner, selected block coexistence, facet parent, persistence 악성 key, immutable caller/parent, runtime/type/docs/installed Full consumer. Basic 생성 API에 이 편집을 거짓 노출하지 않는다.

### #170 — 좁은 named wedge

```js
program.editPointMark({ shape: 'wedge' });
program.encodeShape({ field: 'kind', scale: { range: ['circle', 'wedge'] } });
```

- `PointShape`에 `'wedge'` 한 값만 추가한다. constant create/edit, shape scale range/unknown, mark·legend consumer에서 현재 다른 named shape와 같은 범위를 갖는다. arbitrary path 입력은 계속 거부한다.
- 독립 primitive target: 정규화 전 `(0,-2/√3), (-1/4,1/√3), (1/4,1/√3)`을 잇는 닫힌 삼각형. centroid `(0,0)`, 면적 `√3/4`, 위쪽이 0도다. 원하는 면적 `A`에 `sqrt(A/(√3/4))`를 곱한다.
- 위치 anchor는 centroid, 기존 clockwise degree 회전은 그 anchor 중심이다. area=0의 기존 퇴화 mark 정책을 유지하고 finite bounds를 검증한다. radius/area 의미를 새로 정의하지 않는다.
- 이전 target 재사용: `git show proposal/point-wedge-bar-blend:agent_docs/impl/point-wedge-shape/target.svg`; 상세 근거는 같은 branch의 `PROPOSAL.md`다. Gate에서 정규화한 literal polygon과 기존 point public chain을 나란히 렌더한다.
- semantic mark 및 appearance scale에는 named value만 저장하고 concrete는 path commands다. 기본 shape, 다른 shape의 polygon과 default 결과는 그대로다.
- 검증: polygon 면적·centroid·orientation·stroke bounds, filled/unfilled 및 0/90/임의 회전, constant/data-bound shape, categorical legend와 ordinal-size fusion, selection/highlight, scale/data/Canvas/facet replay, persisted malformed shape, Full/Basic 생성 및 Full 편집, SVG/Canvas/PNG/PDF.

### #175 — named arrow

```js
program.editPointMark({ shape: 'arrow' });
```

- 같은 `PointShape` vocabulary에 `'arrow'`를 추가한다. 범위와 schema/consumer matrix는 #170과 같다. shaft가 있는 7점 polygon을 triangle이나 tick으로 대체하지 않는다.
- 독립 target의 정규화 전 vertices, 순서대로:
  `(-1/7,1), (1/7,1), (1/7,-1/8), (2/5,-1/8), (0,-1), (-2/5,-1/8), (-1/7,-1/8)`.
- 이 polygon의 실제 면적은 `47/70`이다. 목표 면적 `A`에 `sqrt(A/(47/70))`를 곱한다. anchor는 bounding-box center `(0,0)`이며, geometric centroid의 y값 `-35/4512`로 재중앙화하지 않는다. 이 차이는 모양의 기준점과 회전 중심을 보존하기 위한 의도적인 결정이다.
- 0도는 위쪽, clockwise angle은 anchor 중심이다. 기존 물리 면적 size 계약을 그대로 유지한다.
- Gate 재현: 위 literal vertices로 독립 closed SVG path를 만들고 A=`25,100`, angle=`0,90` 네 target을 같은 `createPointMark`/`encodeSize`/`editPointMark` public 결과와 비교한다. target에 쓰는 좌표 계산은 runtime shape helper를 import하지 않는다.
- 기본값·reset은 기존 shape 편집과 동일하다. 잘못된 이름/숫자/경로 문자열, malformed load를 원자적으로 거부한다. #170과 동일 consumer matrix에 arrow silhouette/shaft/anchor 별도 assertion을 추가한다.

### #171 — ordinal size + shape 한 categorical block

```js
program.createLegend({ channels: ['size', 'shape'], combine: 'size-shape' });
program.editLegend({ combine: 'separate' });
```

- **권고 material 선택: 자동 fusion 대신 explicit opt-in**. 기존 `channels:['size','shape']`만인 호출이 separate 출력을 유지하도록 한다. #205와 같은 `combine` option을 재사용한다.
- 대상은 하나의 point owner이며 size는 nominal/ordinal finite enumerated area scale, shape는 categorical shape scale이어야 한다. 두 encoding의 field/data/grain과 raw ordered domain이 typed equality로 정확히 같아야 한다. raw numeric categories도 categorical identity를 그대로 보존한다.
- `combine:'size-shape'`에서 channels를 생략하면 정확히 size+shape를 뜻한다. 제공하면 순서 무관하게 정확히 그 pair여야 한다. 별도 color block은 그대로 유지한다. color까지 자동 합치거나 범위를 확장하지 않는다.
- 하나의 기존 categorical config가 `channels:['shape','size']`와 각각의 scale reference를 갖는다. title/label list/domain 순서는 하나, glyph마다 shape mapping과 physical area mapping을 함께 사용한다. 예: categories `['A','B','C']`, shape `['circle','square','triangle-up']`, area `[25,100,225]`의 target은 동일 label 셋 옆 3개 literal equal-area polygon/circle이다.
- primitive Gate: circle radius=`sqrt(25/π)`, square side=`10`, 면적225의 정삼각형을 각각 독립 계산한 SVG에 그린다. public mark·scale helper를 import하지 않는다. 독립 color block 하나를 추가해 최종 block 수가 정확히2인지 검증한다.
- fixed symbol size/shape patch가 mapped 값을 덮으면 오류다. paint/stroke/opacity 같은 비mapping appearance는 기존 applicable recipe 규칙으로 가능하다. `order`는 두 scale mapping을 바꾸지 않고 표시순서만 바꾼다.
- 생성 생략은 separate, edit 생략은 보존, explicit separate는 두 기존 family를 복원한다. 생성/전환에 주어진 config가 우선하며 오래된 둘 중 첫 config를 임의로 선택하지 않는다. explicit 옵션이 없는 공통 title/style/layout은 native defaults로 시작한다. 재분리는 융합 block의 shared typography/title/placement를 두 family에 복사하고 원래 scale/domain을 보존한다.
- member channel로 block edit/remove하면 하나의 block 전체에 적용한다. overflow는 categorical prefix policy를 그대로 사용하고 mapped glyph bounds를 측정한다. domain이 다르거나 shared-facet eligibility가 깨지는 revision은 전체 오류다.
- 검증: count/title/labels, typed category/order, per-glyph area+shape, unrelated color 유지, native spacing 및 clip/opacity/independent position, split/recombine, creation/edit/remove/replay/persistence, Full/Basic 생성, all renderers, default parity.

### #173 — dashed legend border

```js
program.createLegend({ border: { color: 'lightgrey', lineWidth: 5, strokeDash: [4, 2, 6, 1] } });
program.editLegendBorder({ border: { strokeDash: [] } });
```

- 기존 `LegendBorderOptions`에 `strokeDash?: readonly number[]`를 추가한다. public key는 기존 graphic vocabulary와 동일한 `strokeDash` 하나이며 alias `dash`를 추가하지 않는다.
- 기존 grid/concrete dash와 같은 문법을 사용한다. 각 원소는 finite nonnegative number이고 배열 길이는 짝수여야 한다. empty는 solid, all-zero는 기존 concrete 정책을 따른다. 홀수 길이/음수/NaN/Infinity/non-array/unknown key는 오류다. 새 border만 홀수를 자동 복제하는 별도 정책을 만들지 않는다. caller array는 복제·freeze한다.
- omitted creation은 기존 solid 및 저장 shape를 유지한다. omitted edit은 현재 border 객체의 기존 merge/replace 규칙을 따르며, dash를 확실히 제거하려면 `strokeDash:[]` 또는 `border:false` 후 재생성한다. dash만 새로 다른 merge 규칙을 만들지 않는다.
- border stroke 폭과 padding이 occupied bounds를 결정한다. dash 공백으로 bounds를 축소하지 않는다. background는 계속 solid fill이며 glyph나 plot border에 전파하지 않는다.
- 기존 rect graphic schema가 `strokeDash`를 허용하지 않으므로 **dashed frame만 closed path**로 materialize하는 권고다. fill+stroke를 갖는 rectangle path를 existing renderer로 그린다. solid 기본 frame은 기존 rect ID/type/output을 보존한다. dash on/off 전환은 해당 frame ID의 type을 원자적으로 교체하고 group placement를 보존한다.
- independent primitive Gate: 4변 closed path와 위 dash 배열의 SVG/Canvas 결과. 각 모서리 dash phase는 한 연속 path의 기본 phase0이며 변마다 restart하지 않는다.
- 모든 applicable family와 shared parent가 같은 border normalizer/materializer를 쓴다. replay/roundtrip/style edit/reset/zero lineWidth/large stroke/bounds, SVG `stroke-dasharray`와 Canvas `setLineDash`, installed types 및 기본 parity를 검증한다.

### #176 — encoded size를 보존하는 symbol clip window

```js
program.createLegend({ channels: ['size'], clipHeight: 30 });
program.editLegendSymbols({ channel: 'size', clipHeight: 30 });
program.editLegendBlock({ target: 'points', channel: 'size', clipHeight: 'auto' });
```

- **권고 material 선택:** 기존 legend option에 `clipHeight?: number`, whole/focused symbol/block edit에 `number | 'auto'`를 추가한다. positive finite logical px만 허용한다. 0/negative/nonfinite/wrong type는 오류다. creation 생략은 clip 없음, edit 생략은 보존, `'auto'`는 제거한다.
- 지원: sampled size/opacity/color-symbols, #205 combined block, point-bearing categorical recipes 및 #171 fused block. gradient body, interval swatch-only, line-only/strokeWidth block은 명시적으로 거부한다. 복합 recipe는 point-bearing인 경우 그 항목의 전체 sample glyph(다른 recipe layer 포함)를 같은 window로 clip한다.
- window는 각 sample의 **glyph anchor y를 중심으로** `[-H/2,+H/2]`다. 좌우는 원래 stroke-inclusive 전체 glyph extent를 보존하여 수평 clipping을 추가하지 않는다. fill과 stroke를 모두 clip하고 labels/title/border는 clip하지 않는다.
- scale area/radius, sample 값, shape geometry와 item identity는 절대 축소하지 않는다. visible bounds는 원래 painted bounds와 window의 교집합이다. native pitch는 visible bounds 및 label bounds를 수용하되 기존 최소 itemGap을 유지한다. 작은 glyph를 H높이로 늘리지 않는다.
- 구현 경계는 sample마다 기존 nested concrete `canvas`를 만들고 sample graphics를 local 좌표로 옮기는 것이다. background 없는 canvas에 width=원래 전체 stroke width, height=H, x=원래 left, y=anchorY-H/2를 저장한다. glyph anchor/local path를 같은 평행이동만 하며 circle radius/path 간 비율을 바꾸지 않는다. 전체 sample이 top-level clip window를 공유하지 않는다.
- geometry/persistence/reference validator는 기존 canvas owner를 그대로 사용한다. guide placement와 occupied-bounds collector가 nested sample의 **clipped visible intersection**을 읽도록 책임을 연결한다. renderer에서 legend sample을 추정하거나 별도 clip schema를 만들지 않는다.
- visual Gate: radius=`sqrt(5000/π)` circle, H=30, anchor=(50,50), window `(50-r,35,2r,30)`의 literal SVG clipPath target; 옆에 실제 full circle과 radius15 circle을 같이 두어 crop와 축소가 다름을 확인한다. lineWidth=2이면 x extent는 r+1을 사용한다. public call은 sample size scale을 유지한 createLegend clipHeight다.
- 검증: radius/area 불변, 잘린 stroke·transparent glyph, 큰/작은 glyph, mixed shapes/recipe layers, 모든 placements와 independent block, mapped opacity 0, item overlap/Canvas bounds, edit/reset, grouping/facet/shared parent/persistence, SVG clipPath/Canvas clip parity, 기존 무clip 정확한 parity.

### #177 — coexisting opacity block을 focused editor로 선택

```js
program.editLegendLabels({ channel: 'opacity', fontSize: 10 });
program.editLegendTitle({ channel: 'opacity', fontSize: 11, fontWeight: 700 });
```

- A1의 단수 `channel` selector를 권고한다. `target`만으로 같은 owner의 여러 block이 구분되지 않던 문제를 해결한다.
- `editLegend({channel:'opacity',labels:{fontSize:10}})`와 focused labels 호출은 동일 concrete 결과 및 의미 config를 만든다. wrapper top-level trace 이름만 역할에 맞게 다르다.
- selector 없는 기존 편집의 categorical 우선순위/size typography sharing은 호환성상 유지한다. selector가 있으면 sharing을 적용하지 않고 선택 block만 편집한다. selection 자체로 legend를 생성하거나 opacity sample을 바꾸지 않는다.
- title selector의 `title:'auto'`는 해당 block의 field inferred title로, `false`는 해당 title 숨김으로 기존 reset 규칙을 재사용한다. labels typography는 기존 validators/default를 그대로 쓴다.
- persisted selector 자체는 action trace 입력이며 중복 guide state가 아니다. 바뀐 family config 및 기존 override만 저장한다. malformed stored trace arguments도 persistence policy에 맞게 검증한다.
- 검증: color+opacity, color+size+opacity 및 #171/#205 fused coexistence, explicit target/no target ambiguity, 잘못된/없는channel, whole/focused equivalence, 다른 block geometry/style 불변, replay/facet parent/persistence, Full types. focused edit를 Basic에 추가하지 않는다.

### #193 — block별 독립 anchor

```js
program.editLegendBlock({ target: 'points', channel: 'size', position: 'bottom-left' });
program.editLegendBlock({ target: 'points', channel: 'size', position: 'inherit' });
```

- 기존 `editLegendBlock.position`에 current4edges+4corners+`'inherit'`를 추가한다. A1의 selected whole/focused layout에서도 같은 local override로 라우팅한다. selected route에서는 `'inherit'` reset을 허용하고 group-wide 위치 union에는 이를 추가하지 않는다.
- omission은 override 보존, `'inherit'`는 local field 제거다. 직접 block 생성의 기존 anchor/group 동작을 바꾸지 않고 먼저 high-level group을 만든 뒤 block을 refine한다.
- local block은 inherited group packing에서 제외한다. whole-group position/blockLayout/at 변경도 local override를 덮지 않는다. 다른 local block과의 충돌도 기존 full occupied-bounds로 검사한다. 다른 데이터 mark와 plot 내부 overlap은 기존 inside-plot legend와 같은 정책이다.
- corners는 기존 inset8, edges는 해당 family의 native external gap/axis-lane inference를 쓴다. 새 offset/custom coordinates/자동 크기 조절은 추가하지 않는다.
- merged categorical 또는 combined quantitative block은 member 어느 것으로 선택해도 함께 이동한다. independent color와 size를 합치려는 전환에 서로 다른 local anchor가 남아 있으면 임의 선택하지 않고 명시적으로 reset/위치 지정하도록 오류를 낸다.
- owner는 기존 block override의 optional position. group materializer는 inherited/local로 partition하고 family layout을 명시적으로 실행한다. renderers/schema에 semantic anchor는 넣지 않는다.
- compatibility·검증은 기존 `fa693ceb6c8f1494d97c26c94100a0b9393dcb9f` proposal 재사용: 모든8anchor, reset/편집순서, bounds/invalid atomicity, group precedence, merged blocks, data/scale/Canvas/coordinate replay, facet/repeat와 #206 parent, persistence, 기존 no-override output parity.

### #200-A — position과 독립적인 gradient direction

```js
program.createLegend({ position: 'right', direction: 'horizontal', gradient: { length: 120, thickness: 16 } });
program.editLegendLayout({ channel: 'color', direction: 'horizontal' });
```

- 현재 `direction:'horizontal'|'vertical'`을 gradient family에도 허용한다. position은 group anchor, direction은 strip/ticks/labels 방향이다. length는 진행방향, thickness는 직교방향이다.
- 생성 생략은 현재 edge-derived 방향 그대로, explicit intent만 저장한다. edit 생략은 intent 보존. **권고 reset 추가:** edit-only `direction:'auto'`는 explicit gradient direction을 제거하고 position-derived 방향으로 복귀한다. categorical family의 기존 direction union과 reset은 변경하지 않는다.
- horizontal은 값 증가 left→right와 labels below, vertical은 기존 bottom→top mapping을 유지한다. left anchor의 vertical labels는 왼쪽, 나머지는 오른쪽이다. reverse/log/sqrt/symlog/midpoint는 기존 scale evaluator를 사용한다.
- gradient→symbols transition 때 gradient 전용 direction intent는 보존하되 inactive로 두며 symbol layout의 방향을 덮지 않는다. 다시 gradient로 바꾸면 복귀한다. malformed representation/config pair를 load할 때도 closed grammar를 적용한다.
- right horizontal target은 literal120×16 strip과 tick/labels이며 group은 right anchor를 유지한다. 별도 scale/renderer 회전은 없다. native title gap과 complete occupied-top alignment를 유지하고 충분한 margin 없으면 오류다.
- `f188cc83`의 `gradient-layout-direction-bottom-title/PROPOSAL.md`를 재사용하며 implicit/explicit default parity, position-only edits, all placements/groups/selected block, transformed scale/opacity, Canvas/facet/persistence 및 SVG/Canvas parity를 검증한다.

### #200-B — gradient title의 bottom 위치 (A와 별도 승인)

```js
program.editLegendLayout({ channel: 'color', titlePosition: 'bottom' });
```

- gradient-only `titlePosition:'bottom'`을 추가한다. A가 승인되어도 B가 자동 승인되는 것은 아니다. 보이지 않는 reference title의 DOM anchor를 visible blocker라고 기록하지 않는다.
- omitted creation은 현재 `'top'`, omitted edit는 보존, explicit `'top'`이 reset이다. 다른 family에는 bottom을 허용하지 않는다.
- strip/ticks/labels의 전체 occupied union 아래에 기존 gap12를 두고 title을 놓는다. horizontal은 strip 중심, vertical은 strip left를 native anchor로 삼고 명시된 existing titleStyle.align을 존중한다. multiline/빈 줄은 현재 text lines를 그대로 사용한다.
- hidden title은 occupied title이 없다. paint를 임의로 visible로 바꾸지 않는다. title이 Canvas 밖으로 나가면 전체 오류다.
- primitive target은 같은 ramp+ticks+labels union 아래 정확한12px clearance를 둔 text다. A/B 각자와 조합, titleStyle align 및 rotation 없는 native text, invisible/false/multiline title, persisted family validation, default parity를 별도로 검증한다.

### #203 — bar의 difference compositing

```js
program.editBarMark({ blend: 'difference' });
program.editBarMark({ blend: 'normal' });
```

기존 `7ae85b09d4b76fe969ceb2ca43635873f5db92bf:agent_docs/impl/bar-difference-blend/PROPOSAL.md` 및 같은 디렉터리 `target.svg`를 visual target으로 재사용한다. 아래 renderer·schema 선택은 기존 proposal에 없던 material 세부 결정으로 함께 승인받아야 한다.

#### 공개 입력과 의미

- `editBarMark`에 `blend?: 'normal'|'difference'`를 추가한다. createBarMark/facade에 동일 옵션을 확장하지 않고 high-level 생성 뒤 appearance를 refine한다. 생략은 보존, explicit normal은 현재 source-over로 reset한다. 기본 normal은 새 persisted key를 남기지 않는다.
- bar meaning은 semantic bar mark의 optional `blend`가 소유하고 기존 rematerialization config와 모순되는 두 값을 저장하지 않는다. selection/highlight도 glyph의 같은 blend를 유지한다. 다른 mark-family appearance에 blend를 허용하지 않는다.
- 각 **개별 bar 하나의 fill+outline을 합친 source**에 difference를 한 번 적용한다. 모든 bars를 한 번에 격리하거나 fill과 stroke 각각 difference를 두 번 적용하지 않는다. per-bar painter order를 유지한다.
- CSS 색 성분 sRGB의 blend 함수는 `B(Cs,Cb)=abs(Cb-Cs)`이다. straight-alpha source-over는 `αo=αs+αb(1-αs)`, premultiplied output은 `(1-αs)αbCb + (1-αb)αsCs + αsαbB(Cs,Cb)`를 사용한다. 기존 paint alpha와 mark opacity를 source에 한번만 적용한다.

#### backend-neutral graphic 저장 모양

- concrete rect 및 path의 closed properties에 optional `blend:'difference'`를 추가한다. omission은 source-over이고 explicit normal은 materialization에서 key를 제거한다. collection은 blend를 상속하지 않으며 **각 bar item**이 자신의 rect/path property를 갖는다.
- fill/stroke/rounded commands/opacity는 기존 primitive property로 유지한다. source paint를 합쳐야 한다는 뜻은 이 property의 고정된 계약이다. renderer-local surface나 CSS 문자열을 저장하지 않는다.
- `validateGraphicProperty`, concrete validator, collection item grammar, graphic bounds/reference traversal 및 persistence가 이 enum을 함께 검증한다. raw extension이 이 concrete property를 쓸 수는 있지만 ordinary authoring API는 bar에만 노출한다.
- save/import는 concrete blend를 그대로 보존한다. 미지원 enum·text/circle/line에 있는 blend는 load와 renderer preflight에서 거부한다. materializer는 bounds를 stroke/miter/clip까지 포함해 계산한다.

#### SVG와 Canvas 결정

- SVG: 해당 bar primitive element 하나에 `mix-blend-mode:difference`를 직렬화하여 fill/stroke를 하나의 element source로 합친다. difference가 존재하는 document에서만 root를 자신 안의 Canvas background/grid/preceding marks를 사용하는 isolation 경계로 설정한다. nested clipping/facet group을 불필요하게 isolate하여 부모 backdrop을 지우지 않는다. normal 경로 SVG bytes는 그대로다.
- Canvas: bounds-limited transparent intermediate surface에 **normal source-over**, mark opacity1로 원래 paint alpha의 fill/stroke를 합친다. 그다음 destination에 `globalCompositeOperation='difference'`, `globalAlpha=markOpacity`로 source image를 한번 draw한다. mark opacity를 fill/stroke 각 operation에 미리 곱하지 않는다. source/destination transform, pixelRatio, nested clip을 반영하고 save/restore로 상태를 돌린다. 흰 바탕을 임의로 intermediate에 채우지 않는다.
- surface 공급은 renderer private capability다. browser는 OffscreenCanvas 또는 DOM canvas를 사용하고 Node PNG/PDF adapter는 이미 로딩한 native backend의 createCanvas를 private drawing call에 전달한다. Node/native import가 browser entry에 유입되지 않는다. 일반 사용자 `render`가 native Canvas context를 직접 전달하는 경우에는 해당 context가 제공하는 canvas constructor로 동형 surface 생성이 검증될 때만 사용한다. 무지원 custom/mock context는 clear/draw 이전 capability preflight 오류를 낸다. 새 public factory option을 만들지 않는다.
- private renderer preflight는 difference가 있을 때만 drawImage/composite/surface capability 및 surface 작업 한도를 확인한다. normal context의 기존 필요 method를 증가시키지 않는다. 한 intermediate 최대 dimension32,767 및 pixel16,777,216을 현재 raster 한도와 공유하고 재사용한다. 임의로 해상도를 낮추거나 오류 뒤 절반 그린 chart를 반환하지 않는다.
- **PDF material 선택:** 기본/normal은 현재 vector 출력 유지. difference bar 하나의 source만 native raster surface로 만든 뒤 PDF context의 native difference image painting을 사용한다. 이 opt-in glyph가 raster가 될 수 있음을 문서화한다. backdrop 전체를 rasterize하거나 원본 데이터를 이미지로 대체하지 않는다. native backend가 PDF difference image를 보존하지 못하면 구현 완료로 처리하지 말고 renderer Gate를 다시 열어야 한다. silent normal fallback은 금지다.
- native 사전 probe(`targets/blend-native-probe.json`)에서는 불투명 3개 backdrop의 내부/윤곽 sample이 Canvas와 PDF에서 모두 같았지만 alpha0.5에서 일부 RGB channel이1 차이 났다. 이 결과를 통과로 바꾸지 않는다. 신규 difference glyph에 한해 PDF rasterization의 반올림1단계 허용 여부도 이번 승인 대상이다. 정확한 합성 수식·기하·alpha와 불투명 내부는 별도로 엄격히 검증하며 기존 렌더 회귀의 한도를 완화하지 않는다. 구현 중 더 큰 내부 차이가 나오면 이 Gate를 다시 연다.
- 이 변경은 renderer capability/graphic schema에 걸치므로 SECOND_ARCHITECTURE의 해당 책임 경계 및 current rendering contract를 구현 checkpoint에 함께 갱신한다.

#### 필수 검증

- default/explicit normal의 semantic/graphic/SVG parity; unknown mode/type/잘못된 stored key 원자적 거부.
- white/gray/colored/transparent backdrop, paint alpha0/.5/1, mark opacity, fill-outline intersection, rounded corner, gradients, touching bars/overlap painter order, clipping과 zero-width/zero-height.
- 독립 수식으로 opaque interior RGB/alpha를 검증하고, 실제 SVG raster와 Canvas는 동일 size/ratio에서 비교한다. geometry와 antialias 경계의 오차를 interior exact 검증과 구분한다. SVG CSS 속성만 있다는 것으로 renderer parity를 주장하지 않는다.
- browser DOM/Offscreen, Node native PNG 및 PDF native image composite 결과, missing capabilities preflight, maximum surface budget, pixelRatio/nested translations, save/restore.
- grouped/stacked/horizontal/ranged/faceted bars, mark/data/scale/Canvas/theme/selection replay, persistence, immutable input/parent, installed package Full edit; Basic에는 존재하지 않는 editor를 노출하지 않는다.

### #205 — quantitative color + size 한 sampled block

```js
program.createLegend({ combine: 'color-size', values: [0, 100, 200] });
program.editLegendSymbols({ channel: 'color', symbol: { stroke: '#333', strokeWidth: 1 } });
```

- 기존 `6d8236ec143fe2704464c5cbd7df785634113e1e`의 joint-quantitative-legend proposal을 재사용한다. `combine` union을 #171과 합쳐 A1처럼 확장한다.
- 한 ordinary Cartesian point owner, constant circle shape, 같은 quantitative field/data/grain, finite numeric domain endpoints 동일일 때만 허용한다. encoded shape/ordinal size/different aggregate/independent dataset은 원자적으로 거부한다. shared facet parent도 동일 eligibility를 증명한다.
- channels 생략은 정확히 color+size, 지정하면 정확히 그 pair다. transformed scale은 각 scale evaluator를 독립 사용하지만 공통 sample domain은 같아야 한다. `values`는 엄격히 증가하는 finite list, count와 동시 사용 불가다.
- owner는 새 `colorSize` config: target, field/fieldType, colorScale/sizeScale reference, shared sample policy와 기존 title/label/layout/symbol/border config. channel alias color/size는 하나의 key `['color','size']`를 가리킨다. 새 dummy dataset/mark는 없다.
- one sample의 fill은 color mapping, radius=`sqrt(mappedArea/π)`다. fill/size/radius scalar override는 오류. stroke/strokeWidth/opacity는 기존 sample style로 가능하고 body paint에만 적용한다. #208 categorical layers를 이 sampled symbol type으로 억지 확대하지 않는다.
- #164 map을 member size로 넣어도 color로 선택한 같은 block에서 동일 labels가 보인다. #176 window와 #193 위치도 하나의 block에 적용한다. values/order/label list를 두 개 저장하지 않는다.
- split/recombine의 defaults와 config transition은 #171과 A1을 따른다. 새 combined defaults로 시작하고 오래된 둘 중 첫 config를 선택하지 않는다. separate로 복귀하면 기존 gradient+size 표현을 shared styles/title/placement로 만들고 sample values는 지원하는 family에만 넘긴다. eligibility가 깨지는 edits는 silent split 없이 오류다.
- independent primitive Gate: numeric samples0/5/10, color `['#000','#808080','#fff']`, area `[π,4π,9π]`인 하나의 title/label list 옆 radius1/2/3 circles. literal SVG는 scale helper 없이 expected mapping으로 작성하고 public combined program과 비교한다.
- 검증: sample0/endpoint/transform/midpoint, one-block cardinality, mapped paint+area, split/removal/aliases, all styles/placements/clip/map, invalid scales/grain/shape, group/facet/Canvas replay, malformed persistence, Full/Basic 생성 및 supported Full edit, SVG/Canvas/PNG/PDF, 기존 separate parity.

### #208 — categorical recipe layer opacity

```js
program.createLegend({ symbol: { layers: [{ type: 'point', size: 5, opacity: 0.7 }] } });
program.editLegendSymbols({ symbol: { layers: [{ type: 'line', opacity: 0.4 }] } });
```

- 기존 `dc5ee512`의 legend-symbol-layer-opacity proposal을 그대로 재사용한다. 기존 line/point/swatch `LegendSymbolLayer` 각 member에 finite `[0,1]` `opacity?:number`를 추가한다. shorthand recipe union을 넓히지 않는다.
- 해당 recipe layer의 fill+stroke glyph 전체에 한 번 적용한다. title/labels/border/다른 recipe layer/plot mark opacity는 바꾸지 않는다. 0은 geometry/slot을 보존한다. point의 여러 concrete child에 alpha를 중첩하여 두 번 곱하지 않는다.
- ordinary native sample default1과 기존 specialized gradient-area fallback의 생략 동작을 모두 보존한다. mark opacity를 전역 자동 상속하지 않는다. explicit recipe opacity는 이후 mark opacity 수정에도 유지한다.
- symbol edit 생략은 보존, recipe 공급은 기존 whole-recipe replacement, replacement layer에서 opacity 생략은 native behavior, explicit1은 opaque, `symbol:'auto'`는 기존 inference reset이다. per-layer merge나 별도 reset enum은 없다.
- 소유권은 기존 immutable recipe layer optional key이며 create/edit/load의 closed grammar가 같은 검증을 쓴다. #171 fused mapped glyph는 recipe의 appearance layer로 opacity를 소비할 수 있으나 shape/size mapping을 덮지 않는다.
- primitive Gate: line/point/swatch 각0/.7/1, composite point+line의 독립 opacity와 반투명 fill+stroke 교차 target. Canvas/SVG 모두 전체 glyph 단위 opacity인지 확인한다. collection wrapper와 child에 같은 opacity를 중복 기록하지 않는다.
- 현재 Canvas rect/path drawer는 fill과 stroke 각각에 `globalAlpha`를 사용하므로 겹치는 반투명 fill/stroke의 결과가 SVG element-opacity와 이미 같다고 가정해서는 안 된다. explicit layer opacity의 새 경로는 #203에서 검토하는 bounded isolated-source paint helper를 재사용할 수 있지만 blend mode는 normal이다. 생략한 기존 glyph에 이 새 경로를 일괄 적용하지 않고 historical parity를 유지한다. 임의 polygon의 fill/stroke 합성 차이가 실제 검증에서 나타나면 opacity Gate가 해결될 때까지 완료 처리하지 않는다.
- required matrix는 기존 proposal 그대로: public direct/bundled create, whole/focused/applicable block edit, exact omission parity/specialized fallback, parent/input immutability, data/scale/Canvas/group/shared-facet replay, persistence, renderer property/actual output 및 installed Full/Basic creation/type/doc/card 검증.

## C. 구현 순서와 완료 증거

1. #177 block selector와 기존 descriptor/override grammar를 먼저 확장한다. 기존 group content와 selector가 분리되는 negative contract를 고정한다.
2. #164 display map, #173 border, #208 recipe opacity를 각각 coherent checkpoint로 구현한다. 기본값 byte parity를 먼저 확보한다.
3. #170/#175 named geometry를 한 consumer matrix에 추가한다. primitive/public visual Gate 승인 후 geometry·bounds·legend consumer를 구현한다.
4. #171/#205 combine eligibility/owner를 추가하고 common block aliases와 resource-reference collector/persistence/facet parent를 함께 동기화한다.
5. #193 local placement와 #200-A/B orientation/title을 기존 group planner에 통합한다. 전체 occupied-top 및 same-edge axis lane 회귀를 고정한다.
6. #176 clip window는 새 nested hierarchy를 glyph ownership/bounds와 통합한 뒤 #171/#205/opacity/recipe와 교차검증한다.
7. #203은 별도 graphic schema/renderer conceptual checkpoint로 진행한다. 다른 범례 기능의 renderer 변경과 섞지 않는다.
8. Full/Basic, browser/Node installed consumer, persistence v1/v2 legacy read, current snapshot roundtrip, resource removal, facets/repeat/shared parent, types/contracts/docs/generated search/MCP index를 동기화한다. 모든 required check와 실측 package/bundle budgets를 기록한다.

공통 완료 조건: 각 feature의 semantic state, concrete primitive, public trace 및 독립 expected target을 연결한 증거가 있어야 한다. output이 렌더된다는 사실만으로 시각적 등가나 지원 completeness를 주장하지 않는다. 이전 default의 변동·snapshot 호환·그룹 bounds·resource ambiguity를 별도 회귀로 확인한다. 아직 승인 안 된 결정이나 미지원 renderer cell이 남아 있으면 해당 이슈를 완료/close하지 않는다.

## D. 통합 승인 시 명시할 신규 material 선택

- `combine`은 opt-in3값이며 ordinal fusion의 기존 separate 기본은 유지한다.
- focused/whole edit의 단수 `channel` selector는 content의 복수 `channels`와 분리하고 모든 focused editor가 공통으로 쓴다.
- `clipHeight`는 anchor-centered per-item window이며 point-bearing samples만 지원하고 edit-only auto로 reset한다.
- #200의 gradient direction과 bottom title은 서로 별도 승인이다. direction의 edit-only auto reset도 explicit choice다.
- bar difference는 per-bar fill+stroke source를 한번 합성하며 rect/path의 concrete optional enum, bounded offscreen Canvas, opt-in PDF source raster를 사용한다.
- wedge는 centroid anchor, arrow는 명시한 bounds-center anchor다. 둘 다 기존 physical-area contract를 유지한다.

이 선택의 승인은 기능 구현의 설계 경계를 연다. repository-wide 별도 보호 작업은 상위 작업의 사용자 승인 증거를 재사용하며 이 파일이 release/배포 완료를 주장하지 않는다.
