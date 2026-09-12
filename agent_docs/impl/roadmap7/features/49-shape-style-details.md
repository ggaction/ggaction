# R49 — 둥근 모서리와 stroke cap·join

원래 감사 번호: **49**. Primary owner: **Phase 9**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

저작 마지막 단계에서 필요한 모양·선끝 세부 스타일을 semantic action으로 표현한다. 임의 renderer 속성 주입 없이 모든 출력 경로에 동일하게 적용한다.

현재 파일(저장소 root 상대 경로):
- `src/actions/marks/bar/index.js`
- `src/actions/marks/rect/index.js`
- `src/actions/marks/line/index.js`
- `src/renderers/canvas/index.js`
- `src/renderers/svg.js`
- `src/renderers/pdf.js`

관련 항목: 공통 계약 C01–C12만 선행. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
// 기존 applicable mark style/create options 확장
cornerRadius?: number // Rect/Bar: 모든 corner 동일 px; 기본0
lineCap?: "butt"|"round"|"square" // 기본butt
lineJoin?: "miter"|"round"|"bevel" // 기본miter
miterLimit?: number // >0, 기본10
// editBarMark/editRectMark에 cornerRadius 추가.
// editLineMark/editRuleMark/editAreaMark/editPointMark/editArcMark/editTickMark에
// 적용 가능한 cap/join/miterLimit을 추가. 새 generic editMarkStyle은 만들지 않음.
```

## 값·기본값·오류 계약

- cornerRadius finite>=0, actual radius=min(requested, width/2, height/2). zero-width/height는 기존 empty shape behavior. negative bar는 normalized rectangle geometry에 적용한다.
- stacked Bar는 각 segment의 네 corner에 동일 적용하는 v1. total-stack 바깥 corner만 자동 판단하거나 인접면 rounding을 숨겨 바꾸지 않는다. per-corner radii/arc corner padding은 범위 밖.
- lineCap은 open stroked path endpoints에, lineJoin은 vertex join에만. closed path의 cap은 표시 효과 없어도 유효한 property, marker symbol shape 자체를 바꾸지 않는다. Point circle cornerRadius 같은 미적용 property는 오류.
- miterLimit은 miter join에서만 효과, 다른 join과 함께 저장 가능하나 양수 검증. stroke width0은0. dash와 cap 합성은 renderer default에 맡기지 않고 같은 semantics로 전달한다.
- Canvas/SVG/PDF에 동일 geometry/path를 사용. rounded rect가 renderer별 primitive 차이를 낳으면 공통 concrete path conversion을 사용한다. renderer-only effect/filter는 추가하지 않는다.
- hit/occupied/bounds 계산에 square/round cap extension과 miter join limits를 반영. selection highlight/legend symbol이 같은 style vocabulary를 보존한다.

## 저장 결과와 생명주기

mark semantic style/requested override가 source of truth. normalized graphic shape에 renderer-neutral radius/cap/join/miterLimit을 저장하거나 concrete commands로 표현한다. 어떤 방식인지 Phase 9 A에서 현재 graphic schema와 대조해 단일 방식을 동결한다. 권장: rounded rect는 common path conversion, cap/join은 graphic stroke attrs. helper path가 mark ownership을 잃지 않는다.

## 구현 순서와 action 계층

1. applicable family×property matrix와 defaults 고정. primitive graphic schema/renderer tests를 먼저 작성.
2. rounded rect concrete path와 stroke bounds resolver 구현.
3. high-level mark create/edit/materializer/facade pass-through 및 legend/highlight symbol 경로 연결.
4. reencode/resize/theme/composition 후 스타일 override 유지 검증.

## 독립 oracle와 인수 테스트

- rect100×20, requested radius50 → actual10; radius0은 기존 rect와 동일. negative vertical bar도 같은 normalized rounding.
- line(0,0) → (10,0), strokeWidth4: butt x range[0,10], round/square painted x[-2,12]. dash+round sample 렌더 비교.
- acute polyline miterLimit 작게/크게의 join bounds, bevel/round endpoint sample.
- Point cornerRadius/negative radius/unknown cap/0 miterLimit 오류.
- Canvas PNG, SVG raster, PDF raster의 geometry/bounds/visibility 비교 및 source-owned highlights/legends와 일치.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 구현 고정 명세 — concrete path와 stroke bounds

### property matrix

| family | cornerRadius | lineCap/lineJoin/miterLimit |
| --- | --- | --- |
| Bar,Rect | 지원 | 기존 stroked outline에 지원 |
| Line,Area,Rule,Tick,Arc | 오류 | 지원 |
| Point | 오류 | 지원;circle에서 cap/join 시각효과 없음 |
| Text | 오류 | 이번 범위에서 오류 |

기본 cornerRadius0,lineCap butt,lineJoin miter,miterLimit10. optional key 생략은 기존 output/trace/schema를 가능한 한 유지한다. edit의 omission은 유지,cornerRadius0은 rounding 해제다. enum unknown/negative radius/nonpositive miterLimit는 오류. 모든 facade가 적용 가능한 mark 옵션을 하위에 전달해야 한다.

### concrete 표현

requested radius는 mark style owner에 보존, resolved rounded rect는 기존 ConcretePathCommand(M/L/C/Z)로 materialize한다. 새 backend별 rounded rectangle primitive를 만들지 않는다. cornerRadius0은 기존 rect path를 유지하고 0보다 크면 같은 graphic ID/parent ownership의 path로 전환한다.

normalized rectangle x,y,w,h,r=min(requested,w/2,h/2). cubic quarter-circle coefficient k=4*(sqrt(2)-1)/3. top-left에서(x+r,y)로 시작해 직선과4개 cubic으로 clockwise closed path를 만든다. control point는 각 tangent 방향으로 k*r. 동일한 concrete commands를 Canvas/SVG/PDF가 소비하므로 backend native roundRect와 혼용하지 않는다.

lineCap/lineJoin/miterLimit는 shared concrete stroke attrs로 저장한다. renderer draw마다 명시 default 또는 node 값을 설정해 이전 node의 cap/join이 다음 node에 새지 않게 한다. SVG는 stroke-linecap/stroke-linejoin/stroke-miterlimit,Canvas/PDF context는 같은 숫자/enum semantics.

### geometry bounds

butt endpoint는 tangent 방향 추가0,round는 radius=strokeWidth/2 반원,square는 tangent 방향strokeWidth/2 사각 확장. closed path는 cap 영향 없음.
miter length는 halfWidth/sin(turnInteriorAngle/2). miterLimit와 비교하는 ratio는 miterLength/halfWidth다. limit 초과는 bevel fallback. zero-length segments는 기존 drawable 정책대로 처리하고 divide-by-zero를 만들지 않는다.
occupied/hit/highlight bounds는 이 paint extension을 반영한다. 보수적인 bbox를 쓰면 실제 stroke를 반드시 포함해야 하며 margin을 무한 크게 잡는 회피는 금지한다.

### 고정 인수 사례

- R49-N01: rect100×20,r50 → resolved r10; r0은 기존 graphic과 동등.
- R49-N02: line(0,0)→(10,0),width4 → butt x[0,10],round/square[-2,12],y[-2,2].
- R49-N03: normalized negative Bar에도 같은 radius clamp;stacked 각 segment4corner rounding.
- R49-E01: Point cornerRadius,negative r,cap:"flat",miterLimit0 → 오류.
- R49-L01: round node 다음 omitted-cap node → 둘째는butt;Canvas state leak 검출.
- R49-L02: mark→legend→highlight에 동일 stroke style,resize/theme/reencode 후 유지.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
