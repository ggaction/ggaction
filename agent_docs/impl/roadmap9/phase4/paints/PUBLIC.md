# Paint 공개 연결의 구체안

## 진행 상태와 승인 범위

- [x] Pattern `4cd8917e`, radial `57f70fbc`, shadow `10f04609`, blend `90f5f67e`, outline/halo `ca064947`의 rendered target 사용자 승인 기록
- [x] Main `72855612` 통합, 기존 private/renderer 검증 재실행
- [ ] 아래 새 공개 모양과 저장 형식의 사용자 확인
- [ ] 기존 action·materializer·renderer·consumer·declaration·Current 문서 연결

이 제안은 **ready-for-review**이며 실행 계약이 아니다. Root AGENTS의 새 public API/persisted schema 보호 규칙 때문에
미정 선택을 구체화했다. 이미 승인된 모양·alpha 처리·7 styles·공통 shadow blur를 다시 묻지 않는다.
새 paint resource CRUD, registry, package entry 또는 generic style transaction을 추가하지 않는다.

## 제안 P1: 기존 fill 옵션에 구조화된 paint 추가

현재 `FillPaint = string | LinearGradientPaint`와 기존 create/edit mark의 `fill`을 확장한다.
원계약이 정한 7 styles와 private 기본값을 그대로 사용한다.

```ts
type PatternPaint = {
  type: "pattern";
  style?: "solid" | "diagonal" | "antidiagonal" | "horizontal" | "vertical" | "cross" | "dots";
  pitch?: number;                  // >0, default8 logical px
  strokeWidth?: number;            // >=0, default1 logical px; dots radius=width/2
  phase?: readonly [number, number]; // finite, default[0,0], modulo pitch
  foreground?: string;            // default#000000
  background?: string;            // default transparent
  coordinateSpace?: "plot" | "object"; // default plot
};
type RadialGradientPaint = {
  type: "radial-gradient";
  center: {x:number; y:number};
  focal?: {x:number; y:number};     // omitted = center
  radius: number;                 // >0
  stops: readonly [GradientStop, GradientStop, ...GradientStop[]];
};
```

예시의 명시 target은 현재 layer id다. 새 action 이름은 없다.

```js
program.editBarMark({target:"bars",fill:{type:"pattern",style:"diagonal",foreground:"#2563eb"}});
program.editBarMark({target:"bars",fill:{type:"radial-gradient",center:{x:.5,y:.5},radius:.5,
  stops:[{offset:0,color:"#fff"},{offset:1,color:"#2563eb"}]}});
```

생략한 전체 fill은 기존 create/edit 의미를 유지하며, 전달한 paint object는 하나의 완전한 paint 교체다.
`null` reset이나 partial nested merge를 만들지 않는다. Pattern default 정규화는 action에서 한 번 저장하며,
constant fill과 field-driven color의 기존 충돌 규칙을 유지한다. Point/arc처럼 기존 fill이 string만 받던
filled mark도 동일 FillPaint를 받도록 확장한다. Line/rule/tick의 stroke에 structured fill을 몰래 대입하지 않는다.

### Radial 단위의 미정 선택 — 제안은 기존 linear와 같은 object-bounds 좌표

기존 linear의 from/to는 object bounds의 [0,1] 좌표다. Radial도 center/focal을 [0,1]로 두고 radius를 같은
unit square의 길이로 정의하는 안을 권한다. 이때 정사각 bounds에서는 원이며 비정사각 bounds에서는 타원이 된다.
focal containment는 unit square에서 `distance(focal,center)<=radius`로 검사한다. Bounding box transform을 적용한
뒤에도 같은 cone geometry다. Center/focal/radius는 authored 값으로 한 번 저장하고 renderers는 concrete bounds만 읽는다.

다른 가능한 선택은 absolute logical-pixel circle 또는 짧은 변 기준 원형 radius다. 두 선택 모두 위 예시와
resize 결과가 달라지는 중요한 계약이므로 구현자가 조용히 선택하지 않는다. 현재 제안은 **object-bounds ellipse**다.

### 공통 색 문법

새 pattern/radial/effect 색은 pure 공통 parser가 유효성 및 RGBA alpha를 확인한다. 제안 집합은
`#RGB/#RGBA/#RRGGBB/#RRGGBBAA`, comma형 `rgb/rgba/hsl/hsla`, 표준 named color와 transparent다.
CSS variable/currentColor, host 환경에 의존하는 color, 미지원 함수는 명시 오류다. Gradient stop에는 `none`을 색으로 쓰지 않는다.
기존 solid string과 linear gradient의 accepted syntax 및 저장 모양은 유지한다. 새 paint 색에만 공통 canonical RGBA가
필요하며 invalid string을 backend가 직전 색으로 대신하는 경로는 허용하지 않는다. 이 문법의 사용자 확인 뒤 pure parser를
한 owner로 두며 scale interpolation의 기존 계산을 복사하지 않는다.

## 제안 P2: outline/halo와 shadow는 기존 mark action의 명시 옵션

기존 `stroke`의 fill 이후 centered stroke 의미를 바꾸지 않는다. 승인된 검토 target은 outline을 먼저 그리고 fill로
안쪽 절반을 덮으므로, 기존 stroke를 이름만 바꿔 재사용하면 결과가 달라진다. 제안은 하나의 `outline`이다.
White outline이 halo이며 별도의 halo alias를 저장하지 않는다.

```ts
type MarkOutline = {color:string; width:number}; // width>=0, logical px
type MarkShadow = {color:string; offsetX?:number; offsetY?:number; blurRadius?:number};
// offsetX/offsetY default0; blurRadius default0 and >=0
// mark create/edit additions:
// outline?: MarkOutline | false;
// shadow?: MarkShadow | false;
```

```js
program.editTextMark({target:"labels",outline:{color:"white",width:16}});
program.editBarMark({target:"bars",shadow:{color:"rgba(30,60,90,.5)",offsetX:14,offsetY:10,blurRadius:8}});
program.editBarMark({target:"bars",shadow:false});
```

Create의 omission은 효과 없음, edit의 omission은 유지, false는 효과 제거다. Width0은 명시 값으로 보존하고
stroke 호출을 생략한다. Color와 width가 필요한 outline object는 닫힌 완전 교체다. 기존 stroke 옵션과 outline을
동시에 주는 조합은 처음에는 명시 오류로 제안한다. 같은 contour에 두 authored edge style을 겹치는 의미를 새로 만들지 않는다.
LineCap/LineJoin/MiterLimit는 기존 shared stroke owner를 재사용한다.

효과 순서는 **outline→fill/source glyph→shadow 뒤에 source-over 합성→전체 glyph opacity1회→clip→blend**다.
Shadow의 source mask에는 authored fill/outline alpha를 포함하고 blur input에 mark opacity를 미리 곱하지 않는다.
BlurRadius/2 sigma, ceil(3sigma) support, 2pass Gaussian 및 기존 private dimension/pixels/work/bytes 한도를 그대로 사용한다.
Outline와 shadow bounds는 occupied bounds에 포함하고, shadow 자체는 별도의 semantic item이나 selected node가 되지 않는다.
Hit의 source geometry와 효과의 시각 bounds는 분리해서 기존 mark owner가 유지한다.

## 기존 blend 옵션 확장

공개 `normal`은 유지하고 `multiply`/`screen`을 추가한다. 기존 `difference`도 유지한다.
Canvas의 source-over는 공개 normal의 실행 값이며 API 이름을 바꾸지 않는다. Filled mark·text/line 계열의 적용 가능성을
shared capability policy에 명시하며 unsupported 조합은 action/export preflight에서 실패한다.
원계약과 승인된 premultiplied quantization 정책은 그대로다. 새 arbitrary blend enum이나 group transaction을 만들지 않는다.

## 저장과 renderer 경계

Authoring paint/effect intent는 기존 mark appearance config owner에 저장하고 기존 semantic blend owner는 유지한다.
별도 named paint resource는 요구되지 않으므로 추가하지 않는다. Mark/facet/repeat/canvas/coordinate/appearance replay가
동일 wrapped materializer를 호출한다. Object pattern origin은 실제 item bounds, plot origin은 해당 명시 frame에서 결정한다.
이 결정은 action/materializer에서 concrete origin `{x,y}`로 저장한다. Renderer는 plot/semantic를 조회하지 않는다.

Concrete pattern 후보는 `{type:"pattern",style,pitch,strokeWidth,phase,foreground,background,origin:{x,y}}`다.
Authored `coordinateSpace`는 concrete 결과에 남기지 않는다. Bounds·origin·tile parameters만으로 canonical vector geometry를
만들며 action/export preflight가 finite repetition/work/command budget을 검사한다. Geometry owner는 private patterns 한 곳이다.
Canvas/SVG/PDF는 같은 compound nonzero foreground를 한 번 채운다. Background와 foreground의 겹침 후 glyph opacity도 한 번이다.
SVG defs는 content hash와 scope로 namespaced된다. Renderer object는 저장되지 않는다.

Radial의 immutable normalized paint와 concrete bounds로 ephemeral gradient를 생성한다. PDF의 globalAlpha 무시를 피하도록
승인한 stop alpha 결합/vector radial shading 경로를 사용하고 focal-on-edge cone 밖은 clip한다. Invalid colors/unsupported native
capability는 fallback 대신 preflight error다.

공통 bounded raster glyph가 필요한 효과는 root의 [Image 공개 연결 I3/I4](https://github.com/ggaction/ggaction/blob/603beed0/agent_docs/impl/roadmap9/phase4/images/PUBLIC_DESIGN.md)를 재사용한다.
Concrete image의 정확한 필드와 prepare API는 그 문서가 단독 소유한다. 이 문서에서 별도 schema를 정의하지 않는다.

원본 pixel dimensions는 image 내부, resolved draw rect는 properties에 있다. Shadow/isolated alpha lowering은 content-addressed
PNG를 만들고 source identity/selection role은 mark owner가 유지한다. URI/license resource와 별개이며 새 assets top-level table이나
paint 전용 image codec을 만들지 않는다. Browser Canvas의 `prepareImageRendering`은 root의 image 제안과 동일한 경계를 사용한다.
SVG는 embedded payload, async PNG/PDF는 bytes decode preflight다. Renderer가 네트워크로 glyph를 준비하지 않는다.

Text outline/halo의 vector stroke는 승인된 fixed font probe와 연결한다. **Text shadow는 font glyph mask provider가 아직 미정**이다.
이를 미지원으로 영구 제외하거나 STEP017을 완료 처리하지 않는다. Root font preparation과 연결할 dependency로 남긴다.
Glyph geometry를 단순 text bounds rectangle로 대신하지 않는다. Paint sublayer에 chart 전체 raster를 넣지 않는다.

## 소유 파일과 순서

| 소유 | 변경 책임 |
|---|---|
| parameter_core paints branch | paint/color/pattern/radial/shadow pure owners, effect materialization, Canvas/SVG/PDF lowering, 기존 mark style 연결과 focused tests |
| root image branch | image concrete schema/payload/prepare boundary·decoder·codec·exports의 정본 |
| root font work | prepared font identity/provider boundary; text shadow와 deterministic text effect mask 연결 협의 |
| 통합 시 조정 | 공통 schemas/bounds/scene/persistence/types/program.d.ts/entry/Current/metadata는 마지막 공통 입력에서 합침 |

먼저 위 두 공개 옵션 묶음 및 radial/색 의미를 확인한다. 승인과 독립적인 공통 pure calculations·preflight·기존 blend 확장 검증은
계속한다. 구현 checkpoint는 pattern+radial→outline/halo+blend→shadow 순으로 쌓되 모든 승인 범위를 완료할 때까지 전체 STEP017은 열어 둔다.

필수 consumer 증거는 marks/legend/highlight/selection, geometry 변화 후 origin/bounds 재계산, facet/repeat/concat,
scene/transition/hit, editable+graphic codec/offline restore, Full/Basic, browser Canvas/SVG/PNG/PDF, installed package,
types/current contracts/generated docs 및 정확한 primitive/public same-run pixels다. 적용 불가 cell은 이유를 남기고
시각 승인된 Gate slice는 public equivalence까지 닫은 후 stable capability 위치로 이동한다.
