# 개별 Cartesian mark의 plot clipping

## 진행 상태

- [x] 공개 이슈 #220과 현재 action/graphics/materialization/renderer 계약 확인
- [x] 단일 상태 소유권과 최소 public API 설계
- [x] 기존 graphical primitive로 독립 target 생성 및 수치 검증
- [x] 정확한 target와 설계에 사용자 standing approval 기록; 구현 전 원격 checkpoint
- [x] 구현, types/Current/docs 및 소비자 회귀 검증
- [ ] 검증된 candidate를 push하고 다음 200-family 배포에 포함

이슈: <https://github.com/ggaction/ggaction/issues/220>.

사용자의 현재 직접 지시는 **“지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”**다. 이번 작업 범위의 구체적인 설계와 target를 먼저 만들고 그 증거에 standing approval을 연결한다. 별도 승인 질문을 반복하지 않으며, source/data/수치/회귀 검증을 줄이지 않는다. 공개 버전과 dataset runtime은 현재 checkpoint를 유지하고 이 수정은 다음 정기 배포 candidate에 모은다.

## 문제와 완료 범위

원본 500행을 보존한 채 494개 관측치를 선택한 실제 scatter layer는 plot 밖 중심 10개를 포함한다. 요청은 이 layer의 보이는 부분만 자기 plot 직사각형에서 자르는 것이다. 행 삭제, 위치 clamp, 크기 축소 및 전체 Canvas 자르기는 같은 결과가 아니다. 다른 line layer와 바깥 legend는 그대로 남아야 한다.

새 동작은 일반 Cartesian point/line/area/bar/rect/rule/text/tick mark에 같은 정책을 제공한다. Arc 및 Polar/Parallel frame은 이번 직사각형 정책의 대상이 아니다. 실제 held chart에는 별도로 없는 nominal field와 명시적 legend의 조합도 있으므로, clipping 하나를 구현했다고 그 chart 전체가 번역됐다고 기록하지 않는다.

## Public API

새 action은 추가하지 않는다. 기존 mark create/edit appearance에 `clip?: boolean`을 추가하고, 해당 mark를 이미 소유하는 facade의 style object가 같은 옵션을 전달한다. 기본값은 꺼짐이다. 편집에서 생략은 보존, `false`는 해제다. 잘못된 타입은 오류다.

```javascript
chart()
  .createCanvas({ plot: { width: 160, height: 128 }, margin: { left: 40, top: 30, right: 120, bottom: 82 } })
  .createData({ values: observations })
  .createScatterPlot({ x: "x", y: "y", guides: false })
  .editPointMark({ clip: true });
```

위 코드는 설계용 public 흐름이며 구현 전에는 `clip` 호출이 지원되지 않는다. 실제 target의 domain, glyph, 외부 line 및 legend는 독립 실행 자료에 고정한다. Low-level graphics는 기준 그림과 extension 구현에만 사용한다.

## 상태와 경계

1. **요청 소유권:** `materializationConfigs.marks[id].clip` 한 곳에 boolean을 저장한다. 이것은 graphical authoring intent다. 원본/derived data, semantic mark, encoding, scale domain/range 및 실제 unclamped 좌표를 변경하지 않는다.
2. **Concrete 결과:** named non-Canvas graphic owner의 optional `clip`에 `{x, y, width, height}`를 저장한다. 좌표는 그 owner와 동일한 parent frame이다. 모든 값은 finite, width/height는 nonnegative다. Callback, coordinate reference 또는 `auto`는 저장하지 않는다. 같은 collection의 전체 items/subtree가 하나의 직사각형을 공유한다.
3. **Primitive 편집:** 기존 `editGraphics({target, property: "clip", value: rect})`가 named owner rectangle을 설정한다. `value: false`는 optional field를 제거한다. `createGraphics`의 structural signature는 유지한다. Generated item/inline item property와 Canvas의 새 clip property는 지원하지 않는다. Canvas에는 기존 nested viewport clipping이 있다.
4. **기존 출력:** 생략 시 새 graphics field, trace child 또는 SVG group을 만들지 않는다. Explicit false도 clipping을 그리지 않는다. 켰다가 끄면 원래 concrete geometry로 돌아온다.
5. **Materialization:** 현재 owning Cartesian coordinate의 effective plot bounds를 해석하고 기존 wrapped mark rematerializer가 `editGraphics`를 명시적으로 호출한다. 불완전한 mark의 intent를 보존하되 drawable 결과를 unresolved clipping 상태로 내보내지 않는다. 완전한 결과에 frame이 없거나 부적합하면 명확히 거부한다.
6. **Graph identity:** 기존 named graphic, item IDs, properties, children 및 drawing order를 유지한다. 새 Canvas로 mark를 옮겨 좌표/selection property를 바꾸는 방식은 사용하지 않는다. Representation/cardinality 변경에도 owner clip은 보존한다.
7. **Renderer:** Canvas/SVG는 concrete rectangle만 읽는다. Canvas는 balanced save/rect/clip/restore, SVG는 해당 owner에만 clip group을 쓴다. PNG/PDF는 같은 concrete 계약을 사용한다. 기존 nested clip 및 isolated glyph의 유효 clip stack에도 같은 rectangle이 들어간다. Renderer가 mark/data/coordinate 의미를 조회하지 않는다.
8. **Bounds:** 공통 visible-bounds owner가 자기/조상 clip의 교집합을 적용한다. Geometry 자체, selection property 값 및 데이터 cardinality는 그대로다. Inspection은 conservative visible candidates와 outside-clip을 구분한다.

## 재계산 및 소비자 행렬

- Canvas 크기/margin, Cartesian coordinate bounds/aspect와 inset 변경 후 rectangle을 갱신한다.
- Scale/domain/range, data revision/rebind, shape/size/curve/style 및 selection/highlight 뒤 geometry와 clip을 일관되게 유지한다.
- Source-owned labels, 다른 mark, axes 및 legend는 요청을 자동 상속하지 않는다.
- Facet/repeat/concat은 각 child의 frame에서 같은 정책을 재생한다. Named graphics의 namespace/translation 소유권은 바꾸지 않는다.
- Full/Basic 생성 흐름, 지원되는 Full edit, export/import 및 import 후 편집을 검증한다.
- Native geometry/bitmap/PDF, point50,000 및 path20,000 한도는 그대로 유지한다. 새로운 tolerance나 row sampling은 없다.

## 구현 전 target

320×240 Canvas와 `(40,30,160,128)` plot을 사용한다. X domain은 `[0,10]`, Y domain은 `[0,8]`이며 8개 관측치의 독립적인 실제 중심은 `(36,94), (44,26), (120,158), (204,94), (120,94), (232,-2), (200,30), (24,174)`다. Y fixture는 endpoint interpolation이 binary-exact가 되도록 선택했다. Radius8의 원은 모서리/경계를 일부 가로지르며 두 원은 완전히 보이지 않는다. 별도의 orange line은 plot 위의 `y=14`를 계속 지나가고 legend는 plot 바깥에 남는다.

현재 지원되는 nested Canvas primitive로만 target를 만든다. 이는 제안한 새 node clip materializer를 import하지 않는다. Public control의 원래 좌표/row/그림 속성을 독립 literal과 대조하고, 실제 SVG/PNG/PDF와 자동 기하 증거를 보존한다. 차트 이미지는 assistant가 열어 보지 않는다. 구현 뒤 같은 backend의 primitive/public decoded RGBA가 정확히 같아야 한다.

## 필수 검증과 배포

- 독립 target와 실제 filtered observation 재현, 부분 glyph/stroke, opacity 및 clip disable
- 생성/편집 순서, 잘못된 bool/rectangle, frame incompatibility 및 immutable failure
- 원본 행/좌표/scale/item IDs, selection/highlight, 전체 mark shape와 supported Cartesian family
- Composition/inset/source replay/persistence, 기존 생략 출력의 정확한 parity
- SVG/Canvas/PNG/PDF, nested clip 및 isolated normal/difference paint의 대표 교차 사례
- 관련 unit/contract/docs/chart suite, 실제 설치 package consumer와 documentation generation

변경량과 같은 입력의 package/search/browser 실측을 기록한다. 기존 한도 실패는 보존하며 기능/옵션/coverage를 삭제하지 않는다. 필요한 size budget 증가는 기존 최소 단위 정책의 실제 측정에만 근거한다. Node24 protected-release 측정은 정기 배포 때 별도로 확인한다. 검증된 conceptual checkpoint는 현재 candidate branch에 commit/push하며, 구현 완료와 실제 공개 배포를 구분한다.

## 승인된 구현 전 checkpoint

Gate 상태: **approved**. 현재 사용자의 모든 과거·향후 질문에 대한 명시적 standing approval을 이 구체적인 설계 및 실행 target에 적용한다. 추가 질문은 하지 않는다. `target.mjs`와 `TARGET_EVIDENCE.json`은 구현 전 HEAD `86e6f46e2581115253a86fedd45fdc8a2150a8e1`에서 실행한 독립 primitive와 수치/출력 해시를 고정한다. 기존 두 API의 미지원 오류도 확인했으며 실제 차트는 열어 보지 않았다. 원격 checkpoint 뒤 이 계약대로 구현한다. 일반적인 사전 구현 승인과 실제 공개 배포는 구분하며, 다음 200-family 경계 전에는 공개 release를 만들지 않는다.

## 구현 검증 결과

정상 suite 4,677개, 세 browser 각각 6개, 실제 설치 package 및 전체 문서 browser 검증이 통과했다. 원래 primitive target와 Canvas/PNG decoded RGBA가 정확히 일치하고 PDF vector rectangle/clip 명령도 확인했다. Stack selector의 원래 property geometry는 clipping 전과 같아야 한다는 회귀를 추가했으며 visible bounds만 교집합을 적용한다. 실패 로그와 수치·해시는 `RESULTS.json`에 보존한다.

Public clipping은 위에 명시한 8종 ordinary mark와 선언된 Cartesian facade style에 제공한다. Clip을 요청하지 않은 label/다른 layer에는 자동 상속하지 않으며 ReferenceBand 및 Polar/Radar/Parallel의 기존 상속 타입에서 새 옵션이 잘못 노출되지 않도록 명시적으로 제외했다. 고정한 구현 전 target script/evidence는 역사적 자료이므로 design checkpoint `6f9c1d78`에서 재현한다.
