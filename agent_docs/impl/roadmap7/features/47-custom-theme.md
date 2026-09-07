# R47 — 사용자 theme tokens와 composition 전파

원래 감사 번호: **47**. Primary owner: **Phase 9**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

팀의 색·서체 기준을 재사용하고 다중 패널 전체에 일관되게 적용한다. 디자인 토큰과 사용자가 명시한 개별 스타일의 우선순위를 보존한다.

현재 파일(저장소 root 상대 경로):
- `src/theme/defaults.js`
- `src/actions/theme/actions.js`
- `src/actions/theme/reconcile.js`
- `src/materialization/composition.js`

관련 항목: 공통 계약 C01–C12만 선행. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
applyTheme({theme:"light"|"dark"}) // 호환
applyTheme({theme:{base:"light"|"dark",tokens:Partial<ThemeTokens>},
  scope?:"self"|"descendants"})
// built-in theme 호출에도 scope 확장. unit의 기본self, composition 기본descendants.
// ThemeTokens keys는 아래 closed list.
```

## 값·기본값·오류 계약

- 허용 color tokens: background, mark, text, strongText, mutedText, axis, axisTitle, grid, border, sizeSymbol, regressionBand, boxLine, boxMedian, referenceLine, referenceBand, gradientCenter, highlight. fontFamily는 nonempty string. unknown keys 거부. color validity는 기존 renderer-neutral color validator 사용.
- base 필수, tokens는 partial이며 base 위에 한 번 overlay. 새 applyTheme는 이전 custom token과 merge하지 않고 새 theme definition을 대체한다. object는 clone/freeze한다.
- data-driven palette와 explicit mark/guide text/stroke styles는 기존 explicit override precedence를 보존한다. custom theme를 적용했다는 이유로 범주 palette나 개별 사용자 color를 덮어쓰지 않는다. style reset(#48)은 제외.
- composition descendants는 root background와 모든 unit descendants, retained facet/repeat source recipe에 적용. 기존 child custom theme보다 이번 명시 호출이 새 inherited theme를 적용하되 child explicit style overrides는 유지한다. self는 root canvas만, unit에서는 그 unit 전체.
- composition 적용 후 새로 재생성되는 children은 저장된 descendant theme policy를 따라간다. composition 밖에 있는 원래 input programs는 불변. nested compositions도 재귀 순서가 결정적이다.
- fonts의 설치/네트워크 다운로드는 theme가 수행하지 않는다. 기존 text metrics/provider 경로를 사용하고 font change 후 labels/legend/header bounds와 layout을 갱신한다.

## 저장 결과와 생명주기

theme requested definition(base+tokens)과 explicit style override registry를 분리해 저장한다. composition에는 propagation scope/recipe를 보존하고 child snapshot/replay가 같은 theme resolution helper를 사용한다. 토큰이 추가될 때 renderer별 별도 theme 시스템을 만들지 않는다.

## 구현 순서와 action 계층

1. THEME_TOKENS schema와 resolveTheme definition helper.
2. 현재 explicit override reconciler의 각 property 경로를 감사하고 색상/font만 반영.
3. unit theme transition과 composition recursive transform을 immutable하게 적용.
4. retained source + new child propagation, text metrics → layout 재실행.
5. R22 stroke/R38 blocks/R39 headers/R49 style coexistence 검증.

## 독립 oracle와 인수 테스트

- base light + mark red, grid green, fontFamily testfont: default mark/grid/font 변경, explicit blue mark는 blue 유지, categorical palette는 동일.
- nested concat+facet+repeat에 theme 적용 후 모든 generated child font/background 확인. facet source replay 뒤 유지.
- scope:self composition에서 child theme 유지, descendants는 변경. 원래 concat input programs는 동일.
- customA → customB에서는 A에만 있던 token이 base로 복귀. unknown key/invalid color/empty font 오류.
- light/dark 기존 unit pixel parity, large-font legend/header/label layout 검증.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
