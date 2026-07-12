# STEP 7 — Color & Radius Encoding

## 목표

Point에 남아 있는 수동 `fill`, `radius` graphical edit를 `encodeColor`,
`encodeRadius` domain action으로 교체한다.

```javascript
const program = chart()
  .createCanvas({ ... })
  .createData({ id: "cars", values: cars })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 });
```

## 진행 상태

- [ ] Nominal field와 ordinal scale validation
- [ ] `tableau10` palette
- [ ] Ordinal domain과 range resolution
- [ ] Color scale materialization
- [ ] `encodeColor`
- [ ] `encodeRadius`
- [ ] Shared color scale rematerialization
- [ ] `carsScatterplotActions`의 수동 fill/radius 제거
- [ ] Unit, trace, immutability test
- [ ] Acceptance 및 PNG render test
- [ ] 영어 사용자 문서
- [ ] 브라우저와 고해상도 PNG 확인

## API

```javascript
encodeColor({
  field,
  target?,
  fieldType?,
  scale?: {
    id?,
    type?,
    domain?,
    range?
  }
});
```

기본값은 current mark, `nominal` field, 그리고 다음 scale이다.

```javascript
{
  id: "color",
  type: "ordinal",
  domain: "auto",
  range: "auto"
}
```

Color range는 `"auto"`, `{ palette: "tableau10" }`, 또는 명시적인 색상
문자열 배열을 받는다.

```javascript
encodeRadius({ value, target? });
```

## Action 분해

```text
encodeColor
├─ editSemantic(layer[points].encoding.color.field)
├─ editSemantic(layer[points].encoding.color.fieldType = nominal)
├─ editSemantic(layer[points].encoding.color.scale = color)
├─ createScale(type = ordinal, domain = auto, range = auto)
└─ rematerializeScale
   ├─ collect shared nominal consumers
   ├─ resolve unique domain in first-seen order
   ├─ resolve palette or explicit color range
   ├─ _withResolvedScale
   └─ editGraphics(points.fill = resolved colors)
```

```text
encodeRadius
└─ editGraphics(points.radius = value)
```

Radius는 constant graphical appearance이므로 semantic이나 scale state를
변경하지 않는다.

## Ordinal color 규칙

- Nominal 값은 문자열, finite number, boolean을 허용한다.
- `null`, object, array와 missing value는 거절한다.
- Auto domain은 모든 shared consumer의 category를 처음 등장한 순서로 합친다.
- `range: "auto"`는 `tableau10`을 사용한다.
- STEP7의 유일한 named palette는 `tableau10`이다.
- Category 수가 range 길이를 넘으면 색상을 순환한다.
- Position scale은 계속 quantitative/linear만 지원한다.
- Color scale은 STEP7에서 nominal/ordinal만 지원한다.

## Scale materialization 확장

```text
linear + x/y    → numeric coordinates
ordinal + color → concrete fill colors
```

`rematerializeScale`은 consumer channel과 scale type의 유효한 조합을 확인한
뒤 해당 materializer를 명시적으로 실행한다. Renderer는 여전히 semantic이나
scale state를 읽지 않는다.

## 구현 순서

1. Nominal, ordinal domain과 color range validation을 구현한다.
2. `tableau10`과 ordinal mapping을 구현한다.
3. `createScale`과 `rematerializeScale`을 color consumer까지 확장한다.
4. `encodeColor`를 구현한다.
5. `encodeRadius`를 구현한다.
6. Shared color scale 전체 consumer 갱신을 검증한다.
7. `carsScatterplotActions`의 수동 fill/radius를 교체한다.
8. 영어 사용자 문서, 전체 테스트, PNG와 브라우저 검증을 완료한다.

## 제외 범위

- Quantitative continuous color scale
- `tableau10` 이외의 named palette
- Field-driven radius와 size encoding
- Shape와 opacity encoding
- Axis와 legend 생성
- `editScale`
- Missing category 자동 처리

## 완료 조건

- Point의 x, y, fill, radius가 모두 domain action으로 생성된다.
- Semantic color encoding과 ordinal scale 의도가 저장된다.
- Resolved domain과 실제 palette가 별도 derived state에 저장된다.
- Shared color consumer가 함께 rematerialize된다.
- `carsScatterplotActions`에 point property raw edit가 남지 않는다.
- 기존과 동일한 고해상도 PNG가 생성된다.
