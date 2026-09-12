# R47 — 사용자 theme tokens와 composition 전파

원래 감사 번호: **47**. Primary owner: **Phase 9**. 상태: **Proposed / 구현 전**.
아래 세부 API·수치 정책의 Gate는 승인됐다. 상태의 `Proposed`는 제품 구현·검증이 아직 완료되지 않았다는 뜻이다.

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

## 구현 고정 명세 — custom theme과 nested propagation

### 요청/저장 schema

ThemeDefinition=ThemeName|{base:ThemeName,tokens:Partial<ThemeTokens>}.
ApplyThemeOptions={theme:ThemeDefinition,scope?:"self"|"descendants"}.
custom object의 base/tokens는 필수이며 tokens:{}는 base와 같은 결과다. tokens는 기존 THEME_TOKENS의18개 key만 받는다(background+16color+fontFamily). theme 이름 문자열의 기존 호출을 보존한다.

현재 config의 name/overrides를 유지하고 custom 요청만 tokens를 추가하는 것을 제안한다.
{ name:"light", tokens:{mark:"#ff0000"}, overrides:[…기존 explicit…] }
name이 base의 단일 저장 위치이며 {base:…}를 config에 중복 저장하지 않는다. resolved token 전체를 requested tokens로 저장하지 않는다. composition에는 요청 scope와 descendant replay policy를 같은 theme owner에 저장한다. descendant 적용 origin은 {ownerCompositionId}로 기록해 removeTheme가 독립 child explicit theme을 지우지 않게 한다.

### transition

1. 요청을 validate,clone/freeze.
2. previous explicit override registry를 보존.
3. themeTokens(base) 위에 이번 tokens만 overlay. previous custom token은 merge하지 않는다.
4. unit은 현재 theme reconciler를 실행하고 text metrics/layout/labels/legends 갱신.
5. composition descendants는 root+모든 child snapshots+retained facet/repeat source에 동일 requested definition을 immutable하게 적용하고 postorder로 ancestor placement 재계산.
6. composition self는 root canvas appearance만 변경하고 child inherited policy는 유지한다. unit self/descendants는 같은 unit 결과다.
7. child를 이후 explicit theme으로 편집한 경우 그 실제 요청을 보존하되, 부모에서 다시 descendants 호출하면 새 요청으로 덮는다. replay는 저장된 현재 descendant policy와 explicit child edit 순서를 따라야 한다.

새 explicit style이 theme default와 우연히 같은 값이어도 explicit provenance를 보존한다. 값 비교만으로 override 여부를 추론하지 않는다. categorical palette는 사용자 scale 의미이며 theme mark token으로 대체하지 않는다.

removeTheme 기존 API는 custom tokens도 제거하고 기존 explicit styles를 유지한다. composition descendants로 저장된 policy가 있으면 같은 scope의 inherited theme도 제거하도록 확장하고, 독립 child explicit theme과의 관계는 저장된 provenance로 판별한다. style reset을 수행하지 않는다.

### 고정 인수 사례

- R47-N01: light+mark red,grid green,fontFamily sans-serif → default mark/grid만 변경;explicit blue mark 유지.
- R47-N02: customA{mark:red,grid:green}→customB{mark:blue} → grid는 base default 복귀.
- R47-N03: nested concat/facet/repeat descendants → 모든 child font/background 갱신,원래 input programs 불변.
- R47-N04: composition self → root background만,children 그대로.
- R47-E01: unknown token,invalid color,fontFamily:"",missing base → 오류.
- R47-L01: facet source replay로 생성된 새 children도 current theme;labelMap/block overrides/line style는 보존.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
