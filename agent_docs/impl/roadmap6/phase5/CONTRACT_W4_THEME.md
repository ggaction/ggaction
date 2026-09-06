# Phase 5 W4 — Program theme과 local override

## 공개 경계

```typescript
type ThemeName = "light" | "dark";

applyTheme({ theme: ThemeName }): ChartProgram;
removeTheme(): ChartProgram;
```

`applyTheme`은 unit program에 지속되는 시각 기본값을 설치한다. 이미 존재하는 inherited
style을 즉시 바꾸며, 이후 action이 만드는 리소스에도 같은 theme을 적용한다. 같은 theme의
반복 적용은 같은 결과로 수렴하고, 다른 theme 적용은 inherited 값만 한 immutable 결과에서
교체한다.

`removeTheme`은 active theme이 있을 때만 호출할 수 있다. Inherited 값은 library 기본값으로
복원하고 persisted theme state는 제거한다.

## Token과 ownership 경계

Program theme은 Canvas background와 mark, text, axis, axis title, muted text, grid, border,
size symbol, regression band, font token을 소유한다. Light는 기존 library 기본값이고 dark는
어두운 Canvas와 읽을 수 있는 mark·guide·text 색을 제공한다. 두 preset의 font family는
현재 동일하다.

Theme은 font size·weight, spacing, opacity, mark geometry, palette/domain output,
field-driven appearance, selection/highlight policy, statistics, grouping, ordering,
field type, scale semantics를 소유하지 않는다.

Box median·whisker, reference mark처럼 이전 구현이 shared token 밖의 기본색을 사용한
component도 concrete resource role로 판정해 dark theme에서 읽을 수 있게 만든다. 사용자가
그 기존 기본색을 명시적으로 선택한 경우에는 local override이므로 바꾸지 않는다.

## 우선순위와 지속성

정확한 우선순위는 다음과 같다.

1. explicit local style
2. active program theme
3. library default

사용자가 현재 theme이나 library default와 같은 값을 입력해도 local value로 유지한다.
Theme owner는 top-level authoring trace에서 explicit option을 다시 수집하고 active theme
metadata에 override key를 저장한다. Theme 적용 이후의 local edit, theme 교체, theme 제거,
resource remove/recreate에서도 resource identity에 맞춰 override를 유지하거나 폐기한다.

## 검증 범위

- Runtime: validation, immutability, 즉시 적용, 이후 생성 리소스, swap/remove,
  same-value local override, idempotence를 검증한다.
- Integration: Canvas, 일반 mark, Text, Cartesian·Polar·Parallel axis, grid, categorical·continuous
  legend, chart title, Box/reference/regression component를 검증한다.
- 불변성: semantic spec, statistical values, group, domain, scale, field-driven palette와 draw order가
  theme 전후 동일함을 검증한다.
- 전체 corpus: public unit chart 51개 전부에 dark theme을 적용해 semantic/scale/order drift와
  예외가 없음을 검증한다.
- 시각 증거: `dark-theme-scatterplot`에서 명시적 하위 style action primitive와 `applyTheme`
  public program의 `graphicSpec`, renderer call, decoded PNG pixel을 같은 실행에서 비교한다.
- Type, Current contract, action catalog/card, public docs, package, installed consumer,
  browser consumer gate를 W4 종료 전에 실행한다.
