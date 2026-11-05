# Live API 제안 — 2026-11-05

## 진행 상태

- [x] 사용자 기능 결정(2026-11-05): "addCanvas 해놓고 addTooltip 하면 바로 적용", 목록 중 `addCrosshair`만 제외하고 전부 진행.
- [x] 아래 구체 공개 계약 확인: 사용자 "승인한다"(2026-11-05). [승인 기록](PUBLIC_APPROVAL_20261105.json)
- [ ] 구현·시험·선언·문서·패키지 검증.

## 목표

현재 공개 API는 결정적 재현과 검증을 위해 모든 단계를 드러낸다. 그래서 일반 사용자가 쓰기에 무겁다. 애니메이션은 `planTransition`→`sampleTransition`→player에 clock·render 주입을 거친다. 상호작용은 selection 생성→session binding 배열→subscribe/render→mount, 툴팁은 직접 DOM을 그려야 한다.

Live API는 그 위의 얇은 층이다. 화면 요소를 한 번 붙이면 이후 모든 호출이 즉시 화면에 반영된다.

## 원칙

1. **사용자 층은 상태를 가진다.** Live chart 객체는 현재 프로그램과 붙은 화면을 들고, 메서드를 부를 때마다 자기 상태를 바꾸고 다시 그린다. 체인은 같은 객체를 돌려준다.
2. **엔진은 그대로 불변이다.** 내부 상태는 매번 새 불변 `ChartProgram`으로 바꿔 끼운다. Undo, 애니메이션 보간, 저장/복원, 검증은 그 구조에 의존한다. `chart.program`으로 언제든 현재 불변 프로그램을 꺼낼 수 있다.
3. **기존 API는 바뀌지 않는다.** `import { chart } from "ggaction"`의 동작·저장 형식·시험은 그대로다.
4. **별도 진입점.** `ggaction/live`로 둔다. Full/Basic 번들이 interaction·animation·DOM 코드를 끌어오지 않게 한다.
5. **실패는 원자적이다.** Action이 실패하면 예외를 던지고 live 객체의 상태와 화면은 이전 그대로다.
6. **필드 값은 HTML로 넣지 않는다.** 툴팁·컨트롤은 `textContent`만 쓴다.

## 공개 계약 (안)

```js
import { chart, playAnimation } from "ggaction/live";

const c = chart()
  .addCanvas(document.querySelector("#chart"))   // <canvas>, <svg>, 또는 컨테이너 요소
  .createCanvas({ width: 420, height: 300, margin: 40 })
  .createData({ id: "rows", keyField: "name", values })
  .createPointMark({ id: "points" })
  .encodeX({ field: "x" }).encodeY({ field: "y" })
  .addTooltip({ fields: ["name", "x", "y"] })
  .addHover()
  .addBrush({ target: "points" });
```

### 화면

| 메서드 | 동작 |
| --- | --- |
| `addCanvas(element, options?)` | 화면 요소를 붙이고 즉시 그린다. `<canvas>`면 Canvas, `<svg>`면 SVG, 그 외 요소면 안에 `<canvas>`를 만든다. 이후 모든 호출이 즉시 다시 그린다. |
| `autoResize(options?)` | 컨테이너 크기를 따라 canvas 크기를 맞춘다(ResizeObserver + 기존 `editCanvas`). `stop()` 가능. |
| `setTheme(name)` | 기존 테마 action을 적용하고 다시 그린다. |
| `download(format, filename?)` | `"png"`, `"svg"`, `"pdf"`. 기존 렌더러로 파일을 만들어 내려받는다. |
| `dispose()` | 모든 이벤트·observer·DOM 보조 요소를 제거한다. |

### 상호작용

| 메서드 | 동작 (엔진 대응) |
| --- | --- |
| `addTooltip({ fields?, format?, target? })` | 호버·키보드 포커스·터치 시 텍스트 툴팁. `format(item)`이 문자열을 돌려준다. (inspect + keyboard + 접근성 목록) |
| `addHover({ target?, color? })` | 마우스를 올린 항목을 강조한다. (inspect + highlight) |
| `addClickSelect({ target?, mode? })` | 클릭 선택. `mode: "replace" \| "toggle"`. selection은 자동 생성된다. (select binding) |
| `addBrush({ target?, axis?, mode? })` | 드래그 사각 선택. `axis: "x" \| "y" \| "xy"`. (brush binding) |
| `addLasso({ target?, mode? })` | 자유형 선택. (lasso binding) |
| `addZoom(options?)` / `addPan(options?)` | 휠 확대와 드래그 이동. 지도·partition은 기존 navigation, 일반 축 차트는 scale 편집으로 구현한다. |
| `addLegendToggle({ effect? })` | 범례 클릭으로 계열을 숨기거나(`"visibility"`, 기본) 선택한다(`"selection"`). |
| `addDragNodes({ target? })` | graph 노드를 끌어 옮긴다. (moveNode binding) |
| `on(event, handler)` | `"select"`, `"hover"`, `"change"`, `"error"`. 해제 함수를 돌려준다. |

`target`을 생략하면 그 종류의 상호작용을 받을 수 있는 mark가 하나일 때 그것을 쓴다. 여럿이면 명시를 요구하는 오류를 낸다.

### 데이터와 변화

| 메서드 | 동작 |
| --- | --- |
| `setData(rows, { source?, animate? })` | 원 데이터를 바꾼다(`reviseData`). `animate`(기본 true)면 전환 애니메이션으로 갱신한다. |
| `animateTo(nextOrUpdate, { duration?, easing? })` | 다음 상태로 전환한다. 인자는 live chart, 불변 프로그램, 또는 `c => c.editScale(...)` 같은 갱신 함수다. Promise를 돌려준다. |
| `playOver(field, { duration?, loop? })` | 필드 값(예: 연도) 순서대로 프레임을 이어 자동 재생한다. pause/stop을 가진 핸들을 돌려준다. |
| `addSlider(parameter, { container?, min?, max?, step? })` | parameter에 range 입력을 연결한다. |
| `addDropdown(parameter, { container?, options })` | parameter에 select 입력을 연결한다. |
| `linkTo(other, { by })` | 다른 live chart와 선택을 연결한다. `by`는 공유 필드 이름이다. 한쪽 선택이 바뀌면 다른 쪽의 같은 값 항목을 선택·강조한다. |
| `undo()` / `redo()` / `reset()` | 사용자 조작 이력. 기존 session history를 쓴다. |
| `save()` / `chart.load(text, element?)` | 기존 `serializeProgram`/`deserializeProgram`. 상호작용 설정도 함께 저장한다. |

독립 함수로 `playAnimation(from, to, element, { duration?, easing? })`를 둔다. 두 불변 프로그램 사이를 그 요소에 한 번 재생하고 Promise를 돌려준다.

### 기존 action

`createData`, `encodeX`, `editScale` 등 기존 `ChartProgram` action은 live chart에서 같은 이름·인자로 호출한다. 각 호출은 내부 프로그램을 바꾸고 즉시 다시 그린 뒤 같은 객체를 돌려준다.

## 구현 범위

- `src/live/*`, 진입점 `src/live.js`, `types/live.d.ts`, package `exports["./live"]`, 번들 크기 측정 대상 추가.
- Node 시험은 기존 interaction 시험의 가짜 표면 방식을 쓴다. 실제 Chromium 시험은 `test:browser`에 추가한다.
- 문서 `docs/api/live.md`, README 첫 예제, CHANGELOG.

## 확인이 필요한 결정

1. 진입점 `ggaction/live`와 `chart()` 이름 재사용(별도 진입점에서만).
2. 위 메서드 이름과 기본 동작.
3. `save()`에 상호작용 설정을 포함하는 것. 저장 형식에 "live 설정" 필드가 추가된다.
