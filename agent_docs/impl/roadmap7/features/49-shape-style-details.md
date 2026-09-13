# R49 — 둥근 모서리와 stroke cap·join

원래 감사 번호: **49**. Primary owner: **Phase 9**. 상태: **Implemented-primary**.
제품 구현과 검증은 `f650bba2`, `998ab022`, `354c0e8d`, `31a2eee9`, `1c5192f2`에 있다.
API, concrete 표현, 렌더러, painted bounds, 오류, facade와 전체 lifecycle의 승인된 범위를 모두 완료했다.

이 문서는 R49의 canonical 구현 계약이다. 구현자는 backend native rounded rectangle이나 renderer별 추론으로 의미를 바꾸지 않는다. 같은 requested mark style에서 하나의 renderer-neutral concrete geometry와 stroke attrs를 만들고 Canvas/SVG/PDF가 그대로 소비해야 한다.

## 1. 사용자 결과

R49는 새 generic action을 만들지 않고 기존 mark create/edit와 chart facade의 기존 style object를 확장한다.

- Bar와 Rect의 네 corner를 한 값으로 둥글게 만든다.
- 모든 strokable mark가 cap/join/miter limit을 보존한다.
- style이 resize, reencode, theme, selection highlight, legend, facet replay 뒤에도 남는다.
- clip/hit/layout은 fill box가 아니라 실제 stroke paint extent를 포함한다.
- Canvas/PDF context state가 이전 graphic에서 다음 graphic으로 새지 않는다.

범위 밖:

- per-corner radius
- stacked total의 바깥 corner만 자동 선택
- arc sector corner radius 또는 pad corner
- line endpoint arrow/marker 모양 변경
- arbitrary SVG/CSS renderer property
- generic `editMarkStyle`
- legend/highlight 전용 신규 공개 cap/join/radius option

## 2. 변경 전 source owner

| 책임 | 현재 owner | R49 변경 |
| --- | --- | --- |
| concrete property whitelist | `src/grammar/schemas/graphic.js` | four primitive types와 collection에 stroke detail attrs 추가 |
| concrete value validation | `src/grammar/schemas/concreteGraphic.js` | closed enum, positive miter validation |
| painted bounds | `src/grammar/schemas/graphicBounds.js` | active stroke, line caps, path joins와 miterLimit 반영 |
| Rect | `src/actions/marks/rect/actions.js` | requested style와 item replacement |
| Bar | `src/actions/marks/bar/create.js`, `edit.js`, `materialize.js` | `barAppearance`에 requested style |
| Line/Area | 각 mark의 `actions.js`, `materialize.js` | stroke attrs 전달 |
| Rule/Tick/Arc/Point | 각 family의 create/edit/materialize owner | stroke attrs 전달 |
| Canvas와 PDF | `src/renderers/canvas/{line,path,rect,circle}.js`, `src/renderers/pdf.js` | draw마다 context property 설정; PDF는 Canvas drawers 공유 |
| SVG | `src/renderers/svg.js` | SVG stroke attributes 출력 |
| legend/highlight | 현재 legend symbol recipe/materializer, `src/materialization/selection/**` | source style를 잃지 않는 clone/derivation |
| 타입/facade | `types/program.d.ts`, 해당 chart action | existing nested style type/whitelist 확장 |

공통 helper를 `src/grammar/strokeStyle.js`와 `src/grammar/roundedRect.js`에 둔다. 이미 같은 책임의 module이 생겼으면 그 module을 확장하고 중복 helper를 만들지 않는다.

## 3. exact public types

~~~ts
export type StrokeStyleDetails = {
  lineCap?: "butt" | "round" | "square";
  lineJoin?: "miter" | "round" | "bevel";
  miterLimit?: number;
};

export type RectStyleDetails = StrokeStyleDetails & {
  cornerRadius?: number;
};
~~~

다음 기존 type/action option에 `StrokeStyleDetails`를 교차하거나 같은 optional fields를 넣는다.

- `createPointMark`, `editPointMark`
- `createTickMark`, `editTickMark`
- `createLineMark`, `editLineMark`
- `createBarMark`, `editBarMark`
- `createAreaMark`, `editAreaMark`
- `createArcMark`, `editArcMark`
- `RectMarkOptions`, `EditRectMarkOptions`
- `RuleStyleOptions`와 이를 재사용하는 Rule/reference/error component

`RectStyleDetails`는 Bar와 Rect option에만 넣는다.

~~~ts
export interface RectMarkOptions
  extends RectStyleDetails {
  id?: string;
  data?: string;
  fill?: string;
  opacity?: number;
  stroke?: string | false;
  strokeWidth?: number;
}

export interface RuleStyleOptions extends StrokeStyleDetails {
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;
}
~~~

Text public options에는 네 property를 넣지 않는다. Point/Line/Area/Rule/Tick/Arc에 `cornerRadius`를 넣지 않는다. 새 generic action, renderer options, `strokeStyle:{...}` wrapper를 만들지 않는다.

## 4. family × property matrix

| family | `cornerRadius` | `lineCap` | `lineJoin` | `miterLimit` | concrete primitive |
| --- | --- | --- | --- | --- | --- |
| Bar | 지원 | 지원 | 지원 | 지원 | r=0 rect, r>0 path |
| Rect | 지원 | 지원 | 지원 | 지원 | r=0 rect, r>0 path |
| Line | 오류 | 지원 | 지원 | 지원 | open/closed path |
| Area | 오류 | 지원 | 지원 | 지원 | closed path |
| Rule | 오류 | 지원 | 지원 | 지원 | line |
| Tick | 오류 | 지원 | 지원 | 지원 | line |
| Arc | 오류 | 지원 | 지원 | 지원 | closed path |
| Point | 오류 | 지원 | 지원 | 지원 | circle; cap/join은 시각 효과 없음 |
| Text | 오류 | 오류 | 오류 | 오류 | text |

closed path의 `lineCap`도 valid requested property로 저장한다. 현재는 시각 효과가 없지만 path를 open/closed로 편집했을 때 요청을 잃지 않는다. Point circle의 cap/join/miter도 같은 이유로 저장하고 renderer에 안전하게 전달하되 circle 모양은 바꾸지 않는다.

## 5. defaults, omission, edit semantics

~~~text
cornerRadius = 0
lineCap = "butt"
lineJoin = "miter"
miterLimit = 10
~~~

1. create에서 key 생략은 위 default다.
2. edit에서 key 생략은 current requested value를 유지한다.
3. `cornerRadius:0`은 명시적인 rounding 해제다.
4. `lineCap:"butt"`, `lineJoin:"miter"`, `miterLimit:10`은 명시 reset과 같다.
5. lineJoin을 round/bevel로 바꿔도 miterLimit requested value를 삭제하지 않는다.
6. stroke를 제거해도 cap/join/miter requested values는 mark config에 남는다. 나중에 stroke를 되살리면 다시 적용된다.
7. 기존 family의 stroke/strokeWidth 상호 제약은 그대로다. R49 style key가 있다는 이유로 비활성 stroke를 활성화하지 않는다.
8. omitted new keys로 생성한 program의 semantic/graphic/trace/pixel은 기존 결과와 같아야 한다. default attrs를 모든 기존 graphic에 새로 써서 snapshot/serialization을 바꾸지 않는다. renderer와 bounds resolver가 누락 key를 butt/miter/10으로 해석한다.

## 6. validation과 오류

### 6.1 pure validators

`src/grammar/strokeStyle.js`의 공통 owner:

~~~js
export const DEFAULT_LINE_CAP = "butt";
export const DEFAULT_LINE_JOIN = "miter";
export const DEFAULT_MITER_LIMIT = 10;
export const LINE_CAPS = Object.freeze(["butt", "round", "square"]);
export const LINE_JOINS = Object.freeze(["miter", "round", "bevel"]);

export function validateLineCap(value, label) {}
export function validateLineJoin(value, label) {}
export function validateMiterLimit(value, label) {}
export function resolveStrokeDetails(request = {}) {}
~~~

- `cornerRadius`: finite number, `>= 0`
- `miterLimit`: finite number, `> 0`
- `lineCap`, `lineJoin`: 위 closed enum의 exact lowercase string
- numeric string, NaN, Infinity, null, boolean은 허용하지 않는다.
- unknown property는 해당 action의 existing closed whitelist가 거부한다.

### 6.2 error class

| 조건 | class | message 필수 내용 |
| --- | --- | --- |
| enum type 오류, number type/finite 오류 | `TypeError` | operation/mark와 property |
| negative cornerRadius, zero/negative miterLimit | `RangeError` | property와 유효 범위 |
| unsupported family/property | 기존 unknown-option `Error` | operation과 property |
| edit target ambiguity/missing | 기존 target resolver class | operation과 target |
| invalid final concrete property | concrete validator class | graphic type/id와 property |

validation 순서는 options plain object → closed keys → primitive value → target resolution → active-stroke conflict → materialization이다. late materialization 오류에서도 before program과 trace는 unchanged다.

고정 오류 예:

- `editPointMark({cornerRadius:2})`
- `editLineMark({lineCap:"flat"})`
- `editBarMark({cornerRadius:-1})`
- `editRuleMark({miterLimit:0})`
- `editTextMark({lineJoin:"round"})`

## 7. requested state owner

actual clamped radius나 concrete path를 requested config에 저장하지 않는다.

| family | exact requested owner |
| --- | --- |
| Bar | `materializationConfigs.marks[id].barAppearance` |
| Rect | 기존 `materializationConfigs.marks[id]` direct appearance |
| Line | 기존 `materializationConfigs.marks[id]` direct appearance |
| Area | 기존 `materializationConfigs.marks[id]` direct appearance |
| Rule | 기존 `materializationConfigs.marks[id]` direct appearance |
| Tick | 기존 `materializationConfigs.marks[id]` direct appearance |
| Arc | 기존 `materializationConfigs.marks[id]` direct appearance |
| Point | 기존 `materializationConfigs.marks[id]` direct appearance |

Bar/Rect config:

~~~js
{
  // existing fill/opacity/stroke/strokeWidth...
  cornerRadius: requestedFiniteNonNegative,
  lineCap: requestedEnum,
  lineJoin: requestedEnum,
  miterLimit: requestedPositiveFinite
}
~~~

다른 strokable family는 마지막 세 key만 같은 appearance owner에 둔다. 생략한 default는 실제 config에 쓰지 않고 accessor에서 보충한다. 사용자가 명시한 key만 requested config에 저장한다. 모든 materializer, renderer, bounds owner가 한 `resolveStrokeDetails`를 통해 effective default를 얻는다.

R49 style은 R47 theme frame 또는 explicit color override registry에 복제하지 않는다. theme는 이 네 geometry style key를 수정하지 않는다.

## 8. concrete graphic schema delta

`lineCap`, `lineJoin`, `miterLimit`를 다음 property whitelist에 추가한다.

- `collection`: item property 편집/validation을 위해 허용
- `circle`
- `rect`
- `line`
- `path`

`text`, `canvas`에는 추가하지 않는다. `cornerRadius`는 concrete property로 추가하지 않는다. requested radius는 mark config에 있고 concrete result는 rect 또는 path다.

`concreteGraphic.js` 규칙:

~~~text
lineCap: enum butt|round|square
lineJoin: enum miter|round|bevel
miterLimit: finite and > 0
~~~

`miterLimit`를 generic nonnegative set에 넣어 zero를 허용하면 안 된다. concrete attrs는 optional이며 stroke가 없어도 schema상 valid하나 renderer와 painted bounds는 active stroke가 있을 때만 사용한다. key가 없으면 effective butt/miter/10이다.

active stroke 정의:

~~~text
typeof properties.stroke === "string" && (properties.strokeWidth ?? 0) > 0
~~~

stroke가 없거나 width가 0이면 painted bounds를 확장하지 않는다.

## 9. rounded rectangle resolver

새 pure helper:

~~~js
export const ROUNDED_RECT_K = 4 * (Math.sqrt(2) - 1) / 3;

export function normalizeRectGeometry({x, y, width, height}) {}
export function resolveRoundedRectRadius(width, height, requestedRadius) {}
export function roundedRectCommands({x, y, width, height, radius}) {}
export function materializeRectItem(properties, requestedRadius) {}
~~~

### 9.1 normalization

mark materializer가 corner points를 가진 경우:

~~~text
x = min(x1, x2)
y = min(y1, y2)
width = abs(x2 - x1)
height = abs(y2 - y1)
~~~

이미 x/y/width/height인 경우 negative width/height를 normalization helper 밖으로 흘리지 않는다.

~~~text
if width < 0:  x = x + width;  width = -width
if height < 0: y = y + height; height = -height
actualRadius = min(requestedRadius, width / 2, height / 2)
~~~

- requested radius는 config에 그대로 남는다.
- actual radius는 item마다 다시 계산한다.
- width 또는 height가 0이면 actual radius는 0이고 기존 zero-size rect behavior를 사용한다.
- negative/reversed Bar도 normalized geometry에 동일한 규칙을 적용한다.
- stacked Bar의 각 segment를 독립 rectangle로 보고 네 corner에 같은 radius를 적용한다. 인접 segment 면을 자동으로 square로 만들지 않는다.

### 9.2 exact command array

actual `r > 0`이면 top-left tangent `(x+r,y)`에서 시작해 clockwise로 고정 10-command array를 만든다. straight segment 길이가 0이어도 command를 생략하지 않는다. 이 고정 shape는 test/serialization을 결정적으로 만든다.

~~~js
const c = ROUNDED_RECT_K * r;
[
  { op: "M", x: x + r,     y },
  { op: "L", x: x + w - r, y },
  { op: "C",
    x1: x + w - r + c, y1: y,
    x2: x + w,         y2: y + r - c,
    x:  x + w,         y:  y + r },
  { op: "L", x: x + w, y: y + h - r },
  { op: "C",
    x1: x + w,         y1: y + h - r + c,
    x2: x + w - r + c, y2: y + h,
    x:  x + w - r,     y:  y + h },
  { op: "L", x: x + r, y: y + h },
  { op: "C",
    x1: x + r - c, y1: y + h,
    x2: x,         y2: y + h - r + c,
    x:  x,         y:  y + h - r },
  { op: "L", x, y: y + r },
  { op: "C",
    x1: x,         y1: y + r - c,
    x2: x + r - c, y2: y,
    x:  x + r,     y },
  { op: "Z" }
]
~~~

`x=0,y=0,w=100,h=20,requested=50`의 actual radius는 10이다. `c = 5.522847498307936`이고 command count는 정확히 10이다.

Canvas `roundRect`, SVG `rx`, PDF native rounded rectangle을 사용하지 않는다.

## 10. Rect/Bar object representation transition

기존 homogeneous Rect/Bar owner는 property-array 기반 `type:"rect"` object를 유지한다.

item별 변환:

- actual radius 0 → `{type:"rect", properties:{x,y,width,height,...strokeDetails}}`
- actual radius >0 → `{type:"path", properties:{commands,...fill/stroke/strokeDetails}}`

owner update는 기존 `editGraphics({target:id, property:"items"})`의 normalization contract를 사용한다.

1. 모든 item이 rect면 owner는 homogeneous `type:"rect"`로 저장한다.
2. path가 하나라도 있으면 owner는 `type:"collection"`이고 각 item은 explicit `type`을 가진다.
3. `cornerRadius:0`으로 다시 편집해 모두 rect가 되면 owner는 homogeneous rect로 복귀한다.
4. object ID, parent attachment, child order, semantic layer ID는 전환 전후 동일하다.
5. item 순서와 source-row identity는 동일하다. radius 전환 때문에 selection key를 다시 번호 매기지 않는다.

`requireCompleteBar`, source selection adapter, legend/highlight consumer 등 owner type을 검사하는 코드는 다음을 valid Bar/Rect로 받아야 한다.

- homogeneous rect items
- collection of rect/path items produced by this resolver

arbitrary collection/path를 Bar라고 이름만 보고 받아들이지 않는다. mark config owner와 semantic layer family를 함께 확인한다.

## 11. family materialization

모든 family materializer는 requested config에서 `resolveStrokeDetails`를 한 번 호출한다. 사용자가 명시해 config에 존재하는 detail key만 item concrete properties에 복사한다. 누락 key의 effective value는 renderer와 bounds에서 공통 resolver로 보충한다. 이렇게 해야 R49 option을 쓰지 않은 기존 graphic snapshot이 그대로다.

| family | concrete 전달 위치 |
| --- | --- |
| Point | circle properties |
| Tick/Rule | line properties |
| Line | 각 path item properties |
| Area | 각 closed path item properties |
| Arc | 각 closed path item properties |
| Bar/Rect r=0 | rect properties |
| Bar/Rect r>0 | rounded path properties |

fill/stroke/opacity/strokeWidth/strokeDash의 기존 field-driven mapping은 그대로다. cap/join/miter는 이번 버전에서 encoding channel이 아니며 모든 item에 같은 requested constant를 전달한다.

reencode, data edit, scale edit, resize는 새 geometry를 계산할 때 current mark config의 requested radius와 stroke details를 다시 읽는다. 이전 concrete path를 좌표만 늘리거나 줄이지 않는다.

## 12. chart facade pass-through matrix

새 top-level facade key를 만들지 않는다. 아래 facade가 이미 가진 nested mark style object의 whitelist/type에 해당 property를 추가하고 하위 mark create call로 그대로 전달한다.

| generated family | facade의 existing style object/consumer | 추가 property |
| --- | --- | --- |
| Point | Scatter, PolarScatter, Strip, Beeswarm, Raincloud points, regression/endpoint 계열의 point object, Box outlier object | cap/join/miter |
| Tick | Rug의 tick object | cap/join/miter |
| Line | Line, PolarLine, Radar, ParallelCoordinates, ECDF/regression/endpoint connecting line object | cap/join/miter |
| Bar | Bar, Histogram의 bar object | cornerRadius + cap/join/miter |
| Rect | Heatmap의 rect object, ReferenceBand/box body가 Rect options를 직접 재사용하는 곳 | cornerRadius + cap/join/miter |
| Area | Area, Density, Horizon, Violin, ErrorBand area/boundary owner | cap/join/miter |
| Arc | Pie, Rose, RadialBar의 arc object | cap/join/miter |
| Rule | ReferenceLine, error-bar/whisker/median 등 `RuleStyleOptions` consumer | cap/join/miter |

구체 규칙:

1. facade가 해당 nested style object를 이미 노출하면 runtime whitelist와 TypeScript를 함께 확장한다.
2. facade가 style object를 전혀 노출하지 않으면 R49 때문에 새 unrelated wrapper를 만들지 않는다. 그 facade의 generated mark는 default stroke details를 쓴다.
3. wrapper가 일부 style key를 명시적으로 골라 하위 action에 전달하는 곳은 새 key 세 개 또는 네 개를 추가한다.
4. facade option과 field encoding conflict는 기존 fill/stroke/strokeWidth 규칙만 따른다. geometry detail은 field encoding과 충돌하지 않는다.
5. Full에 새 direct method는 없다. 기존 Basic의 Scatter/Line/Bar method에는 같은 option 확장이 반영되지만 Basic method inventory는 늘지 않는다.

## 13. Canvas와 PDF renderer

PDF는 `drawResolvedGraphicSpec`와 Canvas drawer를 공유한다. 별도 PDF mark 추론을 추가하지 않는다.

모든 active stroke 직전에 다음을 **항상** 설정한다.

~~~js
context.strokeStyle = properties.stroke;
context.lineWidth = properties.strokeWidth;
context.lineCap = properties.lineCap ?? "butt";
context.lineJoin = properties.lineJoin ?? "miter";
context.miterLimit = properties.miterLimit ?? 10;
context.setLineDash(properties.strokeDash ?? []);
~~~

적용 파일:

- `canvas/line.js`
- `canvas/path.js`
- `canvas/rect.js`
- `canvas/circle.js`

rect/circle에서도 모두 설정해야 한다. 그래야 이전 round node의 context state가 다음 default node에 새지 않는다. `save/restore`를 추가해도 explicit default 설정은 유지한다.

PDF preflight가 Canvas context capability 목록을 검증한다면 `lineCap`, `lineJoin`, `miterLimit` property assignment를 허용/검증한다. PDF output은 같은 concrete command와 attrs를 소비한다.

## 14. SVG renderer

active stroke가 있는 circle/rect/line/path에서 concrete property에 존재하는 detail key를 다음 attribute로 출력한다.

~~~text
stroke-linecap="<resolved cap>"
stroke-linejoin="<resolved join>"
stroke-miterlimit="<resolved positive number>"
~~~

- concrete key가 생략됐으면 SVG 표준 default butt/miter/10을 사용하고 attribute를 생략해 기존 serialization parity를 보존한다. SVG element 사이에는 Canvas 같은 mutable context state가 없다.
- 사용자가 default 값을 명시해 concrete key가 존재하면 해당 attribute도 명시한다.
- `formatNumber`를 miterLimit에 사용한다.
- stroke가 없으면 세 attrs를 출력하지 않는다.
- rounded Bar/Rect는 `<path d="...">`로 출력하고 `<rect rx>`를 사용하지 않는다.
- SVG path command 숫자는 기존 formatter를 사용한다. 새 반올림 정책을 만들지 않는다.

## 15. painted bounds

painted bounds는 active stroke일 때만 stroke geometry를 더한다. fill bounds와 stroke bounds를 union한다.

### 15.1 straight `line` primitive

길이가 0보다 큰 line에서:

~~~text
d = normalize(p1 - p0)
n = (-d.y, d.x)
h = strokeWidth / 2
~~~

- butt polygon corners: `p0 ± n*h`, `p1 ± n*h`
- square polygon corners: `p0 - d*h ± n*h`, `p1 + d*h ± n*h`
- round: butt polygon과 center p0/p1, radius h인 두 circle의 union

축 정렬 bbox에 h를 무조건 더하는 기존 구현은 butt endpoint 방향을 과대 계산하므로 교체한다.

zero-length line:

- butt → single coordinate의 degenerate bounds
- round → center ±h circle bbox
- square → center ±h square bbox
- NaN/Infinity/divide-by-zero를 만들지 않는다.

고정 oracle:

~~~text
line (0,0) → (10,0), strokeWidth 4
butt   = {left:0, right:10, top:-2, bottom:2}
round  = {left:-2, right:12, top:-2, bottom:2}
square = {left:-2, right:12, top:-2, bottom:2}
~~~

### 15.2 path subpaths

commands를 `M`부터 다음 `M` 또는 끝까지 subpath로 나눈다. 현재 path validator가 한 subpath만 허용하면 그 제약을 유지하되 bounds helper는 malformed input에서 추측하지 않는다.

각 nonzero segment의 시작/끝 tangent를 구한다.

- L tangent는 endpoint 차이 방향이다.
- C start tangent는 start→control1, 그게 zero면 start→control2, 그것도 zero면 start→end다.
- C end tangent는 control2→end, 그게 zero면 control1→end, 그것도 zero면 start→end다.
- zero-length segment는 join direction 계산에서 건너뛴다.

open subpath의 첫/마지막 유효 tangent에 lineCap을 적용한다. `Z`로 닫힌 subpath는 cap을 적용하지 않고 마지막→첫 vertex join을 계산한다.

straight L-only path는 line primitive와 같은 segment polygon을 union해 exact bounds를 만든다. cubic segment는 existing exact centerline extrema bounds를 각 축으로 h만큼 확장하는 finite conservative bound를 사용할 수 있다. 여기에 endpoint cap과 miter point를 추가한다. 이 bound는 실제 cubic stroke를 모두 포함해야 하며 arbitrary 큰 margin을 사용하지 않는다.

### 15.3 joins

두 nonzero segment가 만나는 vertex에서:

- round join은 radius h인 vertex circle 안에 있으므로 그 circle bbox를 union한다.
- bevel join은 두 outer offset endpoint를 union한다.
- miter join은 turn의 outer side 두 offset line 교점을 계산한다.

~~~text
interiorAngle = angle between (-incomingDirection) and outgoingDirection
miterLength = h / sin(interiorAngle / 2)
ratio = miterLength / h
~~~

`ratio <= miterLimit * (1 + EPSILON)`이면 outer miter point를 포함한다. 초과하면 bevel fallback bounds를 쓴다. collinear same-direction은 별도 join extension이 없다. exact reversal과 zero tangent는 finite bevel/segment fallback을 사용한다.

`includeMiter`의 hard-coded 10은 제거하고 resolved item `miterLimit`을 받는다.

### 15.4 other primitives

- rect: closed outline이므로 cap 무시, join/miter가 네 vertex에 적용된다. default miter rect는 strokeWidth/2 axis expansion과 같다.
- circle: cap/join/miter 무시, radius에 h를 더한다.
- closed rounded path: cap 무시. line→cubic tangent가 연속이므로 artificial sharp miter를 만들지 않는다.
- stroke width 0 또는 stroke 없음: fill/centerline bounds만 사용한다.

`resolveConcreteGraphicBounds`, union bounds, selection hit adapter, occupied layout, clipping이 같은 owner를 사용한다. renderer와 별도 간이 bbox를 만들지 않는다.

## 16. legend inheritance

R49는 legend public option을 늘리지 않는다. source-bound automatic legend symbol이 source requested style을 소비한다.

1. line symbol은 source lineCap/lineJoin/miterLimit을 복사한다.
2. point symbol은 source circle stroke details를 복사한다.
3. Bar/Rect swatch는 source requested cornerRadius를 swatch width/height에 다시 clamp하고 같은 rounded path helper를 사용한다.
4. Arc/Area swatch 또는 line symbol은 실제 recipe kind에 맞는 existing symbol을 유지하며 stroke details를 잃지 않는다.
5. R38 `editLegendBlock.symbol`의 fill/stroke/strokeWidth/opacity override는 source-derived geometry detail 위에 적용된다. R38에 새 cap/join/radius keys를 추가하지 않는다.
6. merge/split/reorder/recreate 뒤 descriptor가 같은 source mark를 다시 resolve하고 current requested style을 읽는다.
7. rounded swatch가 path로 바뀌어도 legend owner graphic ID와 descriptor key는 동일하다. radius 0 reset은 rect 표현으로 복귀한다.

## 17. highlight inheritance

R49는 highlight public option을 늘리지 않는다.

1. highlight는 latest unhighlighted source item을 baseline으로 복사한다.
2. existing highlight style delta를 적용할 때 새 `lineCap`, `lineJoin`, `miterLimit`을 whitelist omission으로 떨어뜨리지 않는다.
3. rounded Bar/Rect highlight는 source의 concrete path commands를 유지하고 fill/stroke/opacity/offset 등 기존 delta만 바꾼다.
4. highlight offset이 있으면 commands 전체에 기존 translation helper를 적용한다. backend native rounded geometry를 재생성하지 않는다.
5. selection membership key와 item order는 rect↔path 전환에서 유지된다.
6. R47 theme는 explicit R49 details를 바꾸지 않으며 theme-aware highlight paint만 바꾼다.

## 18. lifecycle

다음 action 뒤 requested state에서 다시 materialize한다.

- mark create/edit
- encode/reencode와 scale edit
- data bind/edit와 transform replay
- Canvas resize/fit
- theme apply/remove
- selection/highlight create/edit/remove
- legend create/edit/merge/split/reorder
- facet/repeat source edit와 child replay
- composition child replace/insert/reorder

`cornerRadius`는 매번 새 item width/height로 clamp한다. 이전 actual radius를 다음 replay의 requested radius로 사용하면 안 된다. 예를 들어 requested 50, 처음 height 20에서 actual 10이었더라도 resize 후 height 100이면 actual 50까지 회복할 수 있다.

## 19. exact implementation waves

### W3a — pure grammar와 bounds

1. `strokeStyle.js` validators/default resolver를 작성한다.
2. `roundedRect.js` 10-command resolver를 작성한다.
3. concrete schema whitelist/value validator를 확장한다.
4. line/path painted bounds를 수정한다.
5. pure unit tests를 먼저 통과시킨다.

### W3b — primitive renderer

1. primitive `createGraphics`로 line/path/rect/circle attrs를 검증한다.
2. Canvas drawer 4개가 매 stroke마다 defaults를 설정하게 한다.
3. SVG attrs와 rounded path serialization을 추가한다.
4. PDF shared Canvas path를 실행한다.
5. public mark를 사용하지 않은 primitive same-run graphic/PNG/SVG/PDF evidence를 만든다.

### W4a — mark owners

1. Bar/Rect requested radius와 item representation transition을 구현한다.
2. Line/Area/Rule/Tick/Arc/Point create/edit whitelist와 config를 확장한다.
3. 모든 materializer가 shared stroke resolver를 사용한다.
4. direct public mark contract/type tests를 통과시킨다.

### W4b — facade, legend, highlight

1. existing facade nested style whitelist/type/pass-through를 matrix대로 확장한다.
2. legend source style derivation과 R38 override ordering을 연결한다.
3. highlight baseline clone과 selection adapter를 연결한다.
4. Rect/Bar type guard가 collection rect/path를 안전하게 받게 한다.

### W5 — lifecycle와 package

1. resize/reencode/theme/facet replay를 검증한다.
2. Full/Basic inventory, strict types, current contracts/docs/cards를 갱신한다.
3. Canvas/SVG/PDF와 installed Node/browser/MCP consumer를 검증한다.
4. Phase 9 closeout fixture에서 R47/R49 precedence를 함께 검증한다.

각 wave는 focused test와 diff check 후 coherent commit/push를 남긴다. pure helper가 실패한 상태에서 public facade부터 연결하지 않는다.

## 20. independent acceptance oracle

### R49-N01 — radius clamp와 reset

Rect item `x=0,y=0,width=100,height=20`, requested 50:

- config requested radius = 50
- actual radius = 10
- concrete type = path
- command count = 10
- first command = M(10,0)
- top straight ends at (90,0)
- first cubic controls = (95.52284749830794,0), (100,4.477152501692064)
- first cubic ends = (100,10)

그 뒤 `cornerRadius:0`:

- requested = 0
- concrete owner가 homogeneous rect로 복귀
- fill/stroke/opacity/source order unchanged
- legacy r0 graphic/pixel parity

### R49-N02 — line caps

line `(0,0)→(10,0)`, width 4에 대해 15.1절 exact bounds를 검사한다. Canvas decoded pixel은 butt가 x<0을 칠하지 않고 round/square가 endpoint 밖을 칠한다. SVG attrs도 각 enum과 일치한다.

### R49-N03 — negative와 stacked Bar

- reversed/negative vertical Bar의 normalized x/y/w/h가 finite nonnegative다.
- requested r가 각 segment의 `min(w/2,h/2)`로 독립 clamp된다.
- stacked 내부 경계의 네 corner도 둥글다.
- source row/item identity와 stack order는 unchanged다.

### R49-E01 — validation

Point cornerRadius, negative/NaN/Infinity radius, `lineCap:"flat"`, `lineJoin:"sharp"`, miterLimit 0/negative/NaN, Text lineJoin을 각각 atomic error로 검사한다. before semantic/config/graphic/trace deep equality를 확인한다.

### R49-L01 — context state leak

같은 Canvas/PDF page에서 첫 node는 round/round/3, 둘째 node는 new keys omitted다. instrumented context call log와 decoded raster로 둘째가 butt/miter/10임을 확인한다. line만 검사하고 path/rect/circle을 누락하지 않는다.

### R49-L02 — consumer lifecycle

styled mark → auto legend → highlight → resize → reencode → R47 apply/remove → facet replay 순서로 실행한다.

- mark config requested style unchanged
- fresh concrete item에 attrs/path 유지
- auto legend와 highlight가 source details 유지
- explicit R38 block style 유지
- theme color/font 변경이 radius/cap/join/miter를 바꾸지 않음
- original pre-action programs unchanged

## 21. test files와 최소 assertion

| 파일 | 필수 내용 |
| --- | --- |
| `test/unit/grammar/rounded-rect.test.js` | normalization, clamp, exact 10 commands, zero size, freeze/immutability |
| `test/unit/grammar/stroke-style.test.js` | enum/default/numeric validation |
| `test/unit/grammar/graphic-bounds.test.js` 또는 current owner | butt/round/square exact line, miter limit fallback, closed cap ignore, zero length |
| concrete schema contract | four primitive allowlist, text/canvas reject, miter >0 |
| Canvas renderer unit | four drawers set all context attrs every stroke |
| SVG renderer unit | exact attrs, no attrs without stroke, rounded path |
| PDF renderer test | shared Canvas attrs and raster visibility |
| `test/contracts/shape-style-details.test.js` | R49-N01~N03, E01, L01, L02 |
| type fixture/contract | family accepted/rejected properties와 facade nested options |
| legend/highlight contract | source inheritance, R38 overlay, stable descriptor/item identity |
| facet/repeat contract | requested replay와 original input immutability |
| installed consumer | packed Node/TypeScript/browser/MCP 기존 action options |

visual evidence는 primitive와 target public action을 같은 run manifest에 연결한다. backend 간 pixel exact는 요구하지 않지만 각 backend가 같은 concrete commands/attrs를 소비하고 목표 geometry를 실제로 그렸음을 확인한다.

## 22. 금지 구현

- Canvas `roundRect`, SVG `rx`, PDF native rounded rectangle 혼용
- `cornerRadius`를 concrete rect property로만 저장
- actual clamped radius를 requested state에 덮어쓰기
- stacked Bar의 바깥 corner만 임의로 round
- owner ID를 삭제하고 새 Path mark ID 생성
- r0에서도 무조건 path로 바꿔 legacy parity 손상
- renderer에서 mark family를 다시 추론
- Canvas/PDF context default에 의존
- `includeMiter`에 hard-coded 10 유지
- line bounds를 모든 방향으로 half-width 확대해 butt endpoint oracle 위반
- legend/highlight에 공개 style API를 새로 추가
- R38 symbol override가 source cap/join/radius를 지움
- theme config에 R49 details를 복제
- unsupported Text/Point cornerRadius를 조용히 무시

## 23. 완료 조건

- [x] exact public 타입과 runtime whitelist/validator가 동기화됐다.
- [x] requested radius와 actual per-item radius를 분리했다.
- [x] 10-command common rounded path와 r0 rect parity를 검증했다.
- [x] rect/path collection transition에서 owner/item identity를 보존했다.
- [x] line cap exact bounds와 miterLimit fallback을 검증했다.
- [x] circle/rect/line/path Canvas state reset을 모두 검증했다.
- [x] SVG/PDF가 같은 concrete semantics를 소비한다.
- [x] direct marks와 applicable facade nested style을 모두 연결했다.
- [x] legend/highlight/R38/R47/facet lifecycle을 검증했다.
- [x] R49-N01~N03, E01, L01, L02에 runtime evidence를 연결했다.
- [x] Full/Basic types/current contract/catalog/cards/docs/package/MCP consumer를 갱신했다.
- [x] Phase 9 STEP 원장에 commit, 명령, pass/fail/skip, artifact를 기록했다.
