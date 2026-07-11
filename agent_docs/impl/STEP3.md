# STEP 3 — Canvas Actions

## 목표

Canvas primitive chain을 `createCanvas`와 `editCanvas`라는 high-level action으로
감싼다. 사용자는 canvas graphic ID, primitive 조합, context 계산을 직접
다루지 않는다.

```javascript
const program = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: 40,
    background: "white"
  })
  .editCanvas({
    width: 800,
    margin: { left: 80 }
  });
```

## 기본값

```javascript
const DEFAULT_CANVAS = {
  width: 640,
  height: 400,
  background: "white",
  margin: {
    top: 30,
    right: 30,
    bottom: 60,
    left: 70
  }
};
```

## `createCanvas`

한 프로그램에 하나의 canvas를 생성한다.

```text
createCanvas
├─ createGraphics(canvas)
└─ editCanvas(resolved defaults and options)
   ├─ editGraphics(width)
   ├─ editGraphics(height)
   ├─ editGraphics(background)
   └─ _withContext(margin and bounds)
```

- canvas ID는 항상 `"canvas"`이다.
- 전달되지 않은 값에는 기본값을 적용한다.
- 기존 canvas가 있으면 duplicate error를 발생시킨다.
- validation과 context 계산은 `editCanvas`에 위임한다.

## `editCanvas`

기존 canvas를 부분 수정한다.

```javascript
editCanvas({
  width?,
  height?,
  background?,
  margin?
});
```

전달하지 않은 값은 기존 concrete canvas 값과 context 값을 유지한다.

```text
editCanvas({ width: 800, margin: { left: 80 } })
├─ editGraphics(canvas.width = 800)
└─ _withContext(updated margin and bounds)
```

`margin`만 변경하면 `graphicSpec`은 바뀌지 않고 context만 immutable하게
갱신된다.

## Margin 정규화

숫자는 네 방향에 동일하게 적용한다.

```javascript
margin: 40
// { top: 40, right: 40, bottom: 40, left: 40 }
```

객체는 기존 margin에 부분 적용한다.

```javascript
editCanvas({ margin: { left: 80 } });
// { top: 30, right: 30, bottom: 60, left: 80 }
```

정규화된 값으로 authoring bounds를 계산한다.

```javascript
context.currentGraphicBounds = {
  x: margin.left,
  y: margin.top,
  width: width - margin.left - margin.right,
  height: height - margin.top - margin.bottom
};
```

## Private `_withContext`

Context 갱신은 primitive나 wrapped action이 아니다.

```javascript
program._withContext({
  currentMargin: margin,
  currentGraphicBounds: bounds
});
```

`_withContext`는:

- 기존 context를 mutation하지 않고 새 `ChartProgram`을 반환한다.
- trace node를 만들지 않는다.
- public API와 `ggaction/extension`에 노출하지 않는다.
- library action 구현에서만 사용한다.

예상 trace는 context 구현 세부사항을 포함하지 않는다.

```text
program
└─ createCanvas
   ├─ createGraphics
   └─ editCanvas
      ├─ editGraphics(width)
      ├─ editGraphics(height)
      └─ editGraphics(background)
```

## Validation

- `width`, `height`: 양의 정수
- `background`: 비어 있지 않은 문자열
- margin: 숫자 또는 plain object
- margin 각 값: 0 이상의 유한한 숫자
- margin key: `top`, `right`, `bottom`, `left`만 허용
- `left + right < width`
- `top + bottom < height`
- 알 수 없는 canvas option 거절
- `editCanvas({})` 거절
- canvas 없이 `editCanvas()` 호출 시 error
- 기존 canvas가 있는데 `createCanvas()` 호출 시 error

## 구현 순서

1. `_withContext` private immutable helper를 구현한다.
2. Margin 기본값과 정규화 함수를 구현한다.
3. 기존 canvas property 조회와 resolved state 계산을 구현한다.
4. `editCanvas` partial update와 context 갱신을 구현한다.
5. `createCanvas`와 nested action 구성을 구현한다.
6. Validation, immutability, trace를 unit test한다.
7. `carsScatterplotActions.js`를 추가한다.
8. 새 프로그램의 canvas primitive 구간만 `createCanvas()`로 교체한다.
9. Acceptance test와 고해상도 PNG render test를 추가한다.
10. 영어 사용자 문서를 갱신한다.
11. 브라우저와 PNG 결과를 직접 확인한다.

각 구현 단위는 관련 테스트와 문서를 함께 갱신하고 작은 conceptual
commit으로 push한 뒤 다음 단계로 진행한다.

## Test program 전략

기존 primitive 프로그램은 보존한다.

```text
carsScatterplot.js
carsScatterplotAxes.js
carsScatterplotActions.js
```

`carsScatterplotActions.js`는 syntactic sugar 없이 하나의 explicit chain으로
작성한다.

```javascript
return chart()
  .createCanvas({ ... })
  .editSemantic(...)
  .createGraphics(...)
  .editGraphics(...);
```

이후 STEP에서 primitive 구간을 high-level action으로 차례대로 교체한다.

## 진행 상태

- [ ] `_withContext` private immutable helper
- [ ] Margin 기본값과 정규화
- [ ] `editCanvas`
- [ ] Canvas context와 bounds 갱신
- [ ] `createCanvas`
- [ ] Nested trace, validation, immutability test
- [ ] `carsScatterplotActions` 프로그램
- [ ] Acceptance 및 PNG render test
- [ ] 영어 사용자 문서
- [ ] 브라우저와 고해상도 PNG 확인

## 후속 rematerialization 의무

Canvas width, height, margin이 변경되면 기존 scale 기반 graphical consumer의
concrete 좌표가 오래된 상태가 될 수 있다. Scale과 encoding이 구현되는
단계에서 `editCanvas`는 반드시 영향을 받는 consumer를 명시적으로 다시
구체화해야 한다.

```text
editCanvas
├─ editGraphics(canvas properties)
├─ _withContext(updated bounds)
└─ rematerialize affected scales
   ├─ editGraphics(mark positions)
   ├─ rebuild guide graphics
   └─ update every shared-scale consumer
```

이 동작은 자동 semantic compiler가 아니다. `editCanvas`가 wrapped
`rematerializeScale` action을 직접 호출해야 한다. 이 의무는 구현 시점까지
이 문서와 `AGENTS.md`에서 계속 추적한다.

## 제외 범위

- Scale과 encoding 구현
- 실제 scale consumer rematerialization
- Axis와 guide action
- Data와 mark action
- SVG renderer

## 완료 조건

- 사용자가 primitive 없이 canvas를 생성하고 수정할 수 있다.
- `createCanvas`가 내부적으로 `editCanvas`를 호출한다.
- margin과 graphical bounds가 context에 정확히 저장된다.
- `_withContext`는 trace와 public API에 노출되지 않는다.
- trace가 실제 nested action 구조를 반영한다.
- 기존 primitive 프로그램은 보존된다.
- 새 high-level 진행용 프로그램과 PNG가 생성된다.
- 모든 일반 테스트와 PNG render test가 통과한다.
