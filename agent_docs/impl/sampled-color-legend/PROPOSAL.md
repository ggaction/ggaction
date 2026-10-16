# 연속형 색상 범례의 심볼 표현 제안

## 진행 상태

- [x] 현재 public API의 최소 재현과 실패 조건 확인
- [x] 실제 참조 SVG DOM에서 네 개의 원형 샘플 확인
- [x] API·저장 소유자·전환·기본값·호환성·검증 범위 구체화
- [ ] 사용자 승인
- [ ] 구현과 전체 소비 경로 검증

Gate 상태: **ready-for-review**. `decisions.json`의 항목은 Proposed이며 현재 API나 Planned inventory에 넣지 않았다. 승인 전 구현하지 않는다. 독립적인 범례 배치·글꼴·축 수정과 기존 차트 검증은 계속한다. PR·패키지 출판·문서 배포는 포함하지 않는다.

## 관찰과 재현

참조 0392의 settled 색상 scale은 domain `[1,9]`인 연속형 linear다. 실제 SVG에는 gradient strip 없이 `2,4,6,8` 네 개의 원형 색상 샘플이 세로로 있다. 원은 반지름5이며 같은 sample color가 fill과 stroke에 사용된다. 범주형 scale로 바꾸면 차트의 색상 의미가 달라지므로 해법이 아니다. DOM 측정·입력 해시는 `evidence.json`에 있다.

`node agent_docs/impl/sampled-color-legend/reproduce.mjs`는 현재 default가 gradient인 점과 정확한 sample 요청이 `Gradient legends do not support exact sample values.`로 실패하는 점을 검증한다. 이전 immutable program도 그대로인지 검사한다. `target.svg`는 요청할 심볼/레이블 구조를 보여 주는 독립적인 선언형 목표이며 새 API의 실행 결과라고 주장하지 않는다. 사용자가 차트 이미지를 보지 말라고 지시하여 승인·검증 근거는 SVG 구조와 DOM 좌표다.

## 승인할 public 계약

기존 `createLegend`와 `editLegend`에 **`representation?: 'gradient' | 'symbols'`**만 추가한다. 새 action은 만들지 않는다. 이 옵션은 선택된 target의 연속형 **color** 블록에만 적용하며 target이 모호하면 명시적인 target이 필요하다. 범주형·구간·stroke-only 요청에 지정하면 실패한다. `editLegend`에서 channels 생략은 기존 content 집합을 유지하고 color 표현만 바꾼다. 명시한 channels는 기존처럼 target의 **최종 content 집합을 교체**하며 selector로 재해석하지 않는다. 새 집합에 color가 없으면 representation 지정은 실패한다. 다른 채널이 함께 남을 때 size/opacity 등은 바꾸지 않는다.

승인 대상 public 호출 예시(완전한 프로그램은 재현 파일의 `program`을 사용):

```js
// 제안이며 현재는 실행되지 않는다.
const sampled = program.createLegend({representation:'symbols',values:[2,4,6,8],position:'top-left'});
const moved = sampled.editLegendLayout({columns:1});
const smaller = moved.editLegendSymbols({symbol:{type:'point',radius:5}});
const gradient = smaller.editLegend({representation:'gradient'});
```

각 호출의 top-level 파라미터는3개 이하다. 고수준 생성 뒤 기존 layout/symbol/text editor로 세부사항을 고친다. 위 코드의 참조 색상/폰트 복원은 실제 번역 시 지정 모델이 작성한다.

### 샘플과 심볼

- 생략한 representation은 신규 생성에서 기존 gradient를 유지한다. 편집에서 생략하면 현재 representation을 유지한다.
- symbols의 `values`는 기존 size/opacity 샘플 계약처럼 비어 있지 않은 finite ascending unique number array이며 resolved continuous domain 안에 있어야 한다. reversed domain도 numeric ascending 입력을 받는다. 각 값은 mark와 **동일한 resolved color mapping**으로 색상을 얻는다. 데이터·scale type·domain·range는 바꾸지 않는다.
- values가 없으면 기존 continuous sampler와 count를 사용한다. 기본 count5, 기존 count 범위와 log/symlog tick 규칙을 재사용한다. values와 count의 동시 명시는 실패한다. `editLegend`/`editLegendBlock`의 `values:'auto'`는 symbols를 유지하며 기억한 자동 count로 돌아간다.
- 기본 심볼은 기존 sampled-opacity와 같은 단일 point recipe(radius7)다. `symbol:'auto'`도 이 기본으로 복원한다. `symbol:{type:'point',radius,stroke,strokeWidth}`를 지원하며 fill은 sampled scale color가 소유한다. 고정 fill override는 색상 의미와 충돌하므로 거부한다. 생략한 stroke는 sampled color, 기본 strokeWidth1이다. 처음 범위에서 line/swatch/layered recipe는 명시적으로 거부한다.
- label formatter, title inference/hide, typography, border, labelMap은 기존 editor 계약을 재사용한다. `editLegendBlock`의 고정 symbol.fill은 거부하고 size/stroke/strokeWidth/opacity는 기존 단위·검증을 따른다. 모든 sample은 같은 radius/style을 사용하며 color만 scale에서 바뀐다. 같은 target에 여러 블록이 있을 때 특정 color 블록의 text/symbol/sample 편집은 기존 `editLegendBlock({target,channel:'color',...})`를 사용한다. channel 선택자가 없는 focused editor는 기존 적용 범위를 유지하며 여러 의미 중 하나를 고르는 경우 명시적 block 편집을 요구한다. 첫 family를 조용히 고르거나 focused editor의 의미를 바꾸지 않는다.
- symbols는 기존 item-layout 계약을 따른다. corner/left/right의 기본 vertical pitch18, top/bottom의 horizontal 기본20, 명시적 direction/columns/itemGap 허용, sample/text 크기에 따른 안전 최소 pitch 유지. 그룹의 row/column/wrap과 항목 배열은 독립적이다. gradient-only length/thickness 옵션은 symbols와 함께 지정하면 실패한다.

### 저장·편집·전환

- 새 kind나 중복 semantic scale을 만들지 않는다. 기존 **`guideConfigs.legend.gradient`** 소유자가 `representation:'symbols'`, sample mode/values/count, point recipe와 item layout을 보관한다. 기존 `semanticSpec.guide.legend.color`의 scale/title 의미는 그대로다.
- 기존 저장 결과에서 representation 생략은 gradient로 읽고 기존 output을 보존한다. 새 discriminator는 persistence validator와 resource reference collector가 검증한다. target-owned group map은 기존 그룹 계약을 유지한다.
- symbols는 같은 colorGradient prefix의 Symbols/Labels/Title/Background graphics를 만들고 gradient Strips/Ticks는 만들지 않는다. 전환 시 이전 표현 전용 graphics만 정리하고 semantic target/scale와 그룹 소유권은 유지한다. renderer는 concrete graphicSpec만 읽는다.
- gradient→symbols 전환에서 생략한 values는 auto, count는 기존 count를 재사용한다. symbols→gradient에서는 active exact samples와 symbol-only layout/recipe를 제거하고 기존 gradient defaults(length120/thickness12)를 복원한다. 공통 제목/폰트/색/위치/그룹/border는 보존한다. 전환과 충돌하는 같은-call 옵션은 실패한다. 이전 표현의 숨은 snapshot을 쌓지 않는다.
- scale/data 수정 시 자동 샘플과 paint를 다시 계산한다. exact sample이 새 domain 밖으로 나가면 atomic failure이며 값을 조용히 버리거나 clamp하지 않는다. scale을 범주형/구간형으로 바꾸는 기존 전환 경로는 symbols 전용 상태를 정리한다.
- `editLegendSymbols`, `editLegendLabels`, `editLegendTitle`, `editLegendBlock`, remove/recreate, Canvas 변경, 그룹 layout, facet/repeat/shared guide, persistence replay까지 같은 소유자를 사용한다. 모호한 target을 첫 resource로 추측하지 않는다.

## 구현 후 필수 검증

1. 현재 gradient default의 semantic/graphic/trace 회귀 fixture를 그대로 통과한다. 대표 point/bar/rect/text의 기존 연속형 color consumer를 모두 검증한다. Basic은 현재 노출된 생성 경로만 지원하고 Full은 전체 edit lifecycle을 지원한다. stroke 확장은 이번 범위가 아니다.
2. 현재 public continuous-color scale인 **sequential/log/symlog**에서 자동/정확 샘플을 검증한다. midpoint/diverging 표현은 기존 sequential midpoint 지원 안에서만 검증한다. 참조의 linear는 위 관찰의 scale 개념이며 새 ggaction linear-color 타입을 만들지 않는다. 새로운 temporal color 지원도 이번 범위가 아니다. expected paint는 독립 literal 값/기존 mark output과 비교하며 새 legend helper로 기대값을 만들지 않는다.
3. 네 모서리/네 외부 edge/at, item direction·columns, 그룹 row/column/wrap, border와 실제 text bounds를 검증한다. overlap/Canvas overflow는 원자적 실패다.
4. representation 전환, labels/title/symbol/block editor, data/scale/Canvas 변경, remove/recreate, facet/repeat/shared guide, persistence, 입력·이전 program 불변성과 안정적인 semantic identity를 검증한다.
5. SVG/PNG/PDF는 기존 concrete primitives만 읽고 동일한 sample count/color/geometry를 그리는지 확인한다. chart pixels를 직접 보지 않고 SVG DOM과 rendered-output equality로 검증한다.
6. declarations/current contract/public docs/generated reference/architecture/package consumer를 동기화하고 unit/contracts/docs/affected chart·composition/installed package 검증을 통과한다. package 크기 한도 변경이 필요하면 실제 증가량과 이유를 별도로 검토한다.
7. 0392의 모든 번역 단계는 지정 학교 모델로 작성하고 단계 간 같은 결과, 원본 위치·폰트·samples를 다시 확인한다. 이를 통과하기 전 성공으로 집계하지 않는다.
