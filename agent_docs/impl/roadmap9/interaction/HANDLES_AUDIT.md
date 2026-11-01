# STEP058/060 handle 및 후속 TODO 출처 감사

2026-11-01. 정적 감사 기준은 root source `317de21f84e17162c8b422af0bbdf2e01f420f1c`다.
후속 `09cf70a0c5bf24847050bec50e6531fd19784225`의 관련 구현도 읽었다. 이 기록은 새 실행 성공,
AT 전체 통과, STEP074/077 완료 또는 native manifest applicability 변경이 아니다.
Source/type/Current/test/manifest는 이 감사 checkpoint에서 수정하지 않았다. 아래 계약은
2026-11-01 root가 기존 remainingApproval 범위로 채택한 후속 구현안이며 아직 구현된 API가 아니다.

## 원문과 현재 구현 판정

| 항목 | 원문 및 후속 출처 | 현재 사실 | 판정 |
|---|---|---|---|
| Resize/reorder handle | 원 `interaction.ko.md` Gesture arbitration의 최상위 우선순위, STEP058 AT35/36 | `gestures.js`의 private `PRIORITY.resize/reorder=60`만 있고 `session.js::bindings`와 공개 binding union에는 두 adapter가 없다. `reorder` 직접 명령은 있다. | 실제 adapter 잔여 |
| Legend selection/visibility click | 원 `interaction.ko.md` 필수 직접 조작, STEP060, AT35/38, GGA-04/05 | categorical 두 binding과 native selection/visibility lifecycle가 구현되어 있다. | 해당 현재 계약 구현의 시험 소유자가 존재함 |
| Continuous/interval 전용 legend 조작 | 원문에는 별도 range/snap/interval gesture의 구체 계약이 없다. `5b69d264c`의 STEP060 diff가 `continuous/interval legend 조작의 원 카드 후행 범위` TODO를 처음 추가했다. | Current는 categorical만 허용하며 unit이 continuous 거부를 명시 검증한다. | 후발 자체 TODO를 원 사용자 요구로 승격하지 않음. 별도 전용 조작을 새로 구현하지 않음 |
| 일반 keyboard/focus 및 Geo pointer navigation | STEP058/060의 오래된 unchecked 행; 후속 STEP066 E, STEP068 B/C, STEP070 D | native 카메라 drag/pinch/wheel/keyboard와 현재 frame focus/activation이 실제 공개 owner 및 unit/browser/installed fixture에 연결되어 있다. | 오래된 상태 행은 아래 근거로 정합할 수 있음. 전체 AT matrix가 새로 통과했다는 뜻은 아님 |
| ResizeObserver / Geo camera resize | STEP066 C/D, Current resize observation 및 camera operation | CSS 크기 통지와 host의 prepared native update 또는 명시 projection 연산이다. | Pointer resize handle의 대체 구현으로 세지 않음 |

원문은 `study/coverage-expansion-2026-10-27/roadmap/contracts/interaction.ko.md`의
Selection resource / Gesture arbitration / 필수 직접 조작, 같은 roadmap의
`tasks/STEP-058-gesture-controller.ko.md`, `tasks/STEP-060-linked-direct-controls.ko.md`,
`acceptance-cases.json` AT35/36/38, `requirement-map.json` GGA-04/05를 함께 읽었다.
GGA-04는 Selection and direct inspection, GGA-05는 Coordinated interactive views라는 요구와
연결 AT/STEP를 제공하며 continuous legend range 제스처를 추가하지 않는다.

Root와 P의 독립 원문 감사 및 2026-11-01 root 결정에 따라 categorical click의 현재 경계를
유지한다. 후발 TODO 출처 정합은 사용자 요구 삭제, native manifest N/A 또는 성공 receipt 생성과
다르다. 이 기록 자체는 그 TODO 행이나 manifest를 바꾸지 않는다.

## 실제 구현 및 시험 소유자

- Binding 입구: `src/interaction/session.js::bindings`, `types/interaction.d.ts`의
  `CreateInteractionSessionOptions.bindings`. Resize/reorder는 현재 union에 없다.
- Arbitration/capture: `src/interaction/gestures.js::normalizeGestureBindings/reduceGesture`,
  `pointerBindings.js::pointerBindingChooser/prepareEditingCapture`, `pointerCapture.js`.
  후보 domain 판정은 adapter 책임이며 기존 reducer는 후보가 없을 때 행동을 추측하지 않는다.
- Reorder command: `src/interaction/selection.js::prepareInteractionEdit` →
  `src/actions/categoryOrder/index.js::orderCategories/removeCategoryOrder`.
  `test/unit/interaction-direct-controls.test.js`의 axis/legend/selection/source-order 검사,
  `test/browser/interaction-session.browser.js`의 host direct controls,
  `scripts/consumers/fixtures/node/interaction.mjs`의 공개 reorder/clear 소비자가 있다.
  버튼으로 dispatch한 기존 시험을 pointer handle 시험이라고 바꾸지 않는다.
- Categorical legend: `legendSelection.js`, `legendVisibility.js`, `legendCategory.js`,
  `src/actions/data/visibility.js`; `interaction-legend-selection.test.js`와
  `interaction-legend-visibility.test.js`의 typed 범주, filter 합성, scale policy, 원자 실패 및
  noncategorical 거부. [Current INTERACTION](../../../contract/current/INTERACTION.md)의
  categorical legend selection/visibility 절이 정확한 지원 범위다.
- Keyboard/focus: `keyboardFocus.js::prepareKeyboardFrame/reconcileKeyboardFocus/keyboardActivation`,
  `test/unit/interaction-keyboard.test.js`, `test/browser/interaction-keyboard.browser.js`,
  `scripts/consumers/fixtures/node/keyboard-focus.mjs`. Actual frame clip/opacity, stable key,
  nested scope, codec, native selection 및 partition focus를 다룬다.
- Geo navigation: `cameraNavigation.js::prepareCameraNavigation/cameraNavigationDraft/
  cameraWheelCommand/cameraKeyboardCommand`, `test/unit/interaction-navigation.test.js`,
  `test/browser/interaction-session.browser.js` navigation 입력, installed `interaction.mjs`.
  Native camera owner를 호출하며 pinch·cancel·history·CSS/root transform과 prepared assets를 다룬다.
- Current animation bridge: `test/unit/interaction-animation.test.js`,
  `test/browser/interaction-animation.browser.js`, installed `interaction-animation.mjs` 및
  `test/unit/animation/partition-session.test.js` / `partition-transition.test.js` /
  `test/browser/animation-partition.browser.js`. 각 파일의 좁은 검사를 전체 cross-family matrix로
  확대하지 않는다.
- Resize observation: `test/unit/interaction-resize.test.js`가 통지만 발생하는 기본 경로와
  host가 prepared native update를 선택하는 경로를 구분한다.

현재 `test/native-capabilities.json`의 AT35/36/38/40/41/53/55/65 owner assignment는
시험 위치 매핑이며 candidate pass가 아니다. 이 감사는 required/분모/결과를 바꾸지 않는다.

## Resize 최소 제안: 저장된 brush region의 경계 편집

원 resize 대상은 카드에 Canvas 등으로 한정되어 있지 않다. 기존 brush-region 편집을 최소
구체화로 채택한다. 기존 [remainingApproval](../AUTHORIZATION.json)과 2026-11-01 root의
`persisted region predicate forward → select/replace` 방향 및 아래 binding/idle 조회의 명시 채택을
재사용한다. 별도 사용자 질문을 반복하지 않는다.

```js
{ type: 'resize', target, selection, axis: 'x' | 'y' | 'xy' | 'theta',
  channels?, slop?, priority?, modifiers? }
```

- `target`은 기존 exact child scope + mark, `selection`은 그 mark의 기존 named selection이다.
  `axis/channels`는 기존 brush의 x/x2, y/y2, theta 매칭 규칙을 재사용한다. 새 category 추론 API,
  Canvas 크기 변경 command, raw callback 또는 별도 저장 selection schema는 만들지 않는다.
- 시작 의미는 `storedSelectionSelector`/현재 resolved selector의 실제 `region`이다.
  연속 numeric/time/log 범위, native domain에서 연속인 categorical values, 단일 angular arc만
  handle로 표현한다. Empty는 후보가 없고 item keys/AST/lasso 또는 비연속 범주는 사각형으로
  추론하지 않는다. `add/toggle/...` 결과가 keys로 정규화되면 handles는 비활성이다.
- Native scale forward mapping으로 원 region 경계를 만든다. x/y 양끝은 domain min/max의
  의미를 유지하고 reverse는 resolved range에 이미 적용된 방향을 한 번만 사용한다.
  Numeric endpoint inclusive flags는 반대편 경계에서 보존하며 움직인 경계는 기존 brush의
  inclusive 규칙을 사용한다. Categorical 경계는 native band/point extent를 사용한다.
  Theta는 원 directed arc를 유지하고 native angular owner로 wrap을 처리한다. 임의 두 분리
  범위를 하나의 arc로 합치지 않는다. 단일 arc임을 forward 검산할 수 없는 선택은 비활성이다.
- Cartesian xy는 네 edge의 중점과 네 corner, x/y는 해당 두 edge의 중점, theta는 두 radial
  endpoint를 후보로 만든다. Actual child/root transform을 통해 CSS 거리로 hit하며 clip 밖은 제외한다.
  Default slop은 기존 pointer/touch 3/6 CSS px를 재사용한다. 유일한 최단거리 후보만 고르며 서로
  다른 의미의 handle이 같은 점/거리로 겹치면 명시 ambiguity 오류다. 배열 첫 항목이나 corner 우선으로
  의미를 버리지 않는다. 같은 rank60 binding ambiguity 검사도 유지한다.
- Down에서 반대편 endpoint와 immutable native baseline을 고정한다. Move는 원 region을
  매번 재계산하고 crossing은 두 수치 bound를 정렬하되 반대편 anchor는 이동하지 않는다.
  Angular crossing은 기존 directed wrap 의미를 적용한다. Pointer 좌표→domain은
  `invertPositionInterval`/`invertAngularInterval` 정본을 호출한다. Range 밖 clipping, zero extent,
  log/time, reverse/band 경계를 별도 복제하지 않는다.
- 결과는 기존 `{type:'select', target, payload:{id:selection,select:{region,grain,...},mode:'replace'}}`다.
  Persistent region 의미와 source revision/codec/selection/highlight closure는 기존 domain owner가
  소유한다. Arbitrary sampled frame에서 저장 scale을 역산하지 않으며 기존 brush처럼 committed
  owner concrete frame 일치를 요구한다. 실제 typed current-scale resize는 별도 증거 없이 주장하지 않는다.

**Idle 표시와 좁은 조회 제안:** Root는 idle 표시를 host UI 책임으로 채택했다. 현재
`materializeSelectionPreview`는 drag 중 transient `previewProgram`에만 overlay를 만들고 commit 후
제거한다. `getState`의 program/scene이나 최종 item 목록만으로는 빈 region, log/time, band padding,
theta의 원 boundary를 수학 복제 없이 복원할 수 없다. 현재 공개 scale forward query도 없다.
따라서 새 persisted action 대신 다음 session readonly method 하나를 root가 채택했다.

```js
session.getSelectionHandles()
// frozen { frameVersion, handles: [
//   { target, selection, axis, handle, point: {x, y} }
// ] }
```

- 기존 configured resize bindings만 조회하므로 target/selection/scale 결정을 다시 받지 않는다.
  `frameVersion`은 기존 state의 현재 accepted scene frameVersion과 같다. Schema format version이나
  새 counter가 아니다. 새 clock/animation token이 아니며 handle
  배열을 변경하는 권한도 아니다. 결과는 frozen snapshot이다.
- `handle`은 x-min/x-max/y-min/y-max, xy의 네 조합 corner 또는 theta-start/theta-end 중
  해당 binding이 실제 제공하는 값이다. Domain bound 의미를 사용하며 reverse에서 문자열을 뒤집지 않는다.
  `point`는 root/child transform을 적용한 element-local CSS 좌표다. Host가 이 점에 UI/ARIA를 그린다.
- Hit도 정확히 같은 점과 기존 slop을 쓴다. Painted edge라고 주장하며 보이지 않는 전체 edge에
  capture 영역을 만들지 않는다. Host marker 크기/모양은 host 책임이고 필요하면 명시 binding slop을 쓴다.
- Empty/non-region/noncontiguous/clip 밖에는 handle이 없다. Unknown target/selection, 부적합 scale,
  getter/oversize 등 잘못된 binding은 등록 전에 거부한다. 이후 native update로 잠시 제거된 target은
  기존 dormant 규칙을 따른다. 임의 key selection에서 region을 새로 만들지 않는다.
- Active accepted preview의 projected points는 overlay와 같은 계산결과에서 공급한다. Async 준비 중에는
  아직 채택되지 않은 좌표를 발행하지 않고, 취소는 baseline view를 복원한다. Derived geometry cache만
  유지하며 두 번째 selection 의미, program/plan 연쇄 또는 저장 callback을 만들지 않는다.
- Binding 최대 수와 기존 work limit을 적용한다. xy 최대8, x/y/theta 최대2라 handle output도 유한하다.
  Public method/type/Current/snippet/실제 browser host 소비자까지 같은 checkpoint에서 닫는다.
  `previewProgram`의 “active preview 밖 null” 의미와 renderer의 concrete-only 경계는 그대로 유지한다.

## Reorder 최소 제안: 실제 categorical axis tick/label 손잡이

```js
{ type: 'reorder', target, channel: 'x' | 'y' | 'theta',
  slop?, priority?, modifiers? }
```

- Target의 native categorical position encoding/scale을 명시한다. 지금 `orderCategories`가
  허용하는 Full target/shared-scale 규칙을 그대로 사용한다. 새 raw-index·범주 추론 API는 없다.
- 실제 그려진 해당 scale의 축 tick/label을 손잡이로 한다. `axisGuideItems`의 rawValue/config.scale,
  `guideHitToken/guideHitItemKey`, actual hit child scope/role를 대조한다. Display text 또는 opaque
  key 문자열을 parse하지 않는다. Multiline label은 같은 typed 범주로 collapse하고 tick/title 등
  다른 의미를 구분한다. `1`, `'1'`, `false`를 합치지 않는다. 이 최소안은 legend 자체 drag를
  추가하지 않지만 native reorder 후 legend/marks/axis의 동기화는 기존 action이 수행한다.
- Down에서 실제 resolved categorical domain과 source typed value를 고정한다. 현재 scale의
  native category centers/bands로 destination insertion slot을 정한다. Reverse에서도 화면 순서를
  source row 순서로 오인하지 않는다. Theta는 native degrees/origin/direction을 재사용하고
  domain cut에서의 slot을 명시적으로 고정한다. Pointer 밖은 가장 가까운 terminal slot으로 clamp한다.
- 매 preview는 baseline 배열에서 dragged value를 한 번 제거하고 destination slot에 한 번 삽입한다.
  기존 absent/filtered category order의 의미와 명시 domain 계약을 `orderCategories`의 정본에서
  검산한다. Unknown/중복/공유 scale 비호환은 후보 상태에서 거부하며 원 순서는 바뀌지 않는다.
- 기존 `{type:'reorder',target,payload:{channel,values}}` → `orderCategories`만 호출한다.
  Same order는 no-op이다. 새 reorder algorithm, scale writer 또는 renderer는 만들지 않는다.
  독립 sampled axis와 native domain이 맞지 않으면 geometry를 역추론하지 않고 명시 거부한다.

## 공통 수명·readonly·키보드 동등 경로

- Candidate는 readonly다. Applicable 하나를 고른 뒤 기존 capture/reducer가 rank60,
  movement3 CSS px, pointer ID, modifier ambiguity를 소유한다. 두 handle 사이 새 우선순위는 만들지 않는다.
- RAF당 preview 최대 한 번, final up 좌표는 flush, 성공 commit1/history1/settled1이다.
  Escape/cancel/lostcapture/blur/updateProgram/unmount/destroy는 baseline 복구/cancel1이고 늦은 up은
  no-op이다. Getter/own-data/limits/shared-scale/native action/asset 준비 실패 시 old program,
  trace, history, selection 및 기존 asset lease를 보존한다. Invalid candidate가 다른 owner를 바꾸지 않는다.
- 새 `resize` domain command는 만들지 않는다. Host의 focusable handle/범주 controls는 기존
  `dispatch(select region replace)` / `dispatch(reorder values)`로 같은 reducer·native action을
  실행할 수 있다. 숫자 키보드 step은 host의 명시 domain 값이며 임의 1px/1unit를 core가 추측하지 않는다.
  실제 focused control의 Arrow/Enter/Escape 시험을 추가한다. 현재 `keyboardFocus`는 mark/item
  focus owner이므로 axis handle focus까지 구현됐다고 기록하지 않는다. Native handle focus를 session에
  새로 노출할 경우 그 별도 public 상태 계약부터 구체화한다.

## 예상 변경 owner 및 독립 검사

| 범위 | 최소 owner / 재사용 |
|---|---|
| Resize adapter | 새 좁은 `src/interaction/regionResize.js`; `regionSelection.js`의 native owner/placement/scale 준비를 실제 두 소비자가 공유하도록 추출. `selectionResources`, scale forward/inverse, selection preview는 원 정본 재사용 |
| Reorder adapter | 새 좁은 `src/interaction/categoryReorder.js`; `axisGuideItems`, hit guide keys, categorical scale mapping, `prepareInteractionEdit` 및 `actions/categoryOrder` 재사용 |
| Session/capture | `session.js` binding normalizer·candidate·preview dispatch 및 좁은 readonly handle query만 추가. `pointerBindings`/`pointerCapture`/`gestures`/history/preparation 규칙 복제 금지 |
| Public 설명 | `types/interaction.d.ts`, Current INTERACTION, 해당 문서 snippet·installed fixture를 실제 지원 범위와 동기화. Authoring/renderer entry는 변경 없음 |
| 시험 | 각 adapter owning unit + 기존 region/capture/arbitration/direct controls; actual browser Canvas/SVG DPR1/2 mouse/touch/keyboard; strict types 및 동일 tar3Node public 소비자 |

필수 literal 회귀는 resize x/y/xy/theta·log/time/reverse/category·wrap/zero·inclusive endpoint,
reorder x/y/theta·typed mixed category·multiline label·filter/restore·shared scale와 axis/legend/mark 전체
동기화다. CSS root/child transform, nested scope, clipping, 100 move→one commit 또는 one cancel,
final up without RAF, no-op, reentry/dispose, late asset, domain/source revision, linked selection/filter,
codec/undo/redo와 old input/program 불변을 포함한다. 원 arithmetic/native domain과 raw typed 값으로
검산하며 구현 결과를 다시 oracle로 사용하지 않는다. AT35/36/38 관련 소유자 증거를 추가하되
그것만으로 전체 AT53/55/60/65/074/077을 닫지 않는다.
