# R47 — 사용자 theme tokens와 composition 전파

원래 감사 번호: **47**. Primary owner: **Phase 9**. 상태: **Implemented-primary**.
제품 구현은 `ce286929`에 있다. R47의 독립 schema·state·unit·composition·renderer·package 범위는 검증됐고,
R49 style 보존까지 포함한 결합 lifecycle cell `R47-L01`만 R49 구현 완료 시 함께 닫는다.

이 문서는 R47의 canonical 구현 계약이다. 구현자는 여기서 정한 의미를 다른 방식으로 재설계하지 않는다. 파일이 이동했으면 같은 책임의 현재 owner를 찾아 수정하고, 비슷한 이름의 두 번째 theme 시스템을 만들지 않는다.

## 1. 사용자 결과

R47은 현재 unit 전용 `light`/`dark` theme action을 다음까지 확장한다.

1. 사용자가 built-in theme를 base로 삼아 18개 closed token 중 일부를 덮어쓸 수 있다.
2. unit과 composition에 같은 `applyTheme`를 호출할 수 있다.
3. composition은 root만 바꾸거나 모든 현재·미래 descendants에 theme를 전파할 수 있다.
4. 나중 호출이 이전 theme 요청보다 우선하며, 부모 theme를 제거하면 그 아래에 있던 자식 theme가 복원된다.
5. 개별 mark, guide, title, header, legend block, highlight에 사용자가 명시한 스타일은 theme보다 우선한다.
6. `fontFamily` 변경은 텍스트만 바꾸는 데서 끝나지 않고 실제 text metrics와 occupied layout을 다시 계산한다.

범위 밖:

- font 설치, 네트워크 font 다운로드, fallback font 탐색 API
- 새 palette token 또는 arbitrary token 이름
- theme 파일 import/export
- style reset 기능(R48)
- renderer마다 별도의 theme 정의

## 2. 변경 전 source owner

| 책임 | 현재 owner | R47 변경 |
| --- | --- | --- |
| built-in token | `src/theme/defaults.js` | closed token schema와 custom definition resolver 추가 |
| public action | `src/actions/theme/actions.js` | object theme, scope, composition dispatch 추가 |
| explicit provenance와 unit reconcile | `src/actions/theme/reconcile.js` | custom source/target token, font, highlight, 역할별 mapping 지원 |
| action completion hook | `src/core/action.js` | top-level transaction에서 unit/composition theme reconcile을 한 번만 실행 |
| composition snapshot | `src/materialization/composition.js` | root background의 hard-coded white 제거, themed child snapshot/layout 재생성 |
| facet/repeat retained source | `src/actions/facets/derive.js` 및 같은 owner의 replay helper | descendant policy를 새 child에 재적용 |
| 타입 | `types/program.d.ts`와 type barrel | 아래 exact public 타입 export |

`materializationConfigs.theme`를 직접 읽는 코드는 공통 accessor로 모은다. 기존 `{name, overrides}`와 새 상태를 각 consumer가 제각각 해석하면 안 된다.

## 3. exact public API

```ts
export type ThemeName = "light" | "dark";

export type ThemeTokens = {
  background: string;
  mark: string;
  text: string;
  strongText: string;
  mutedText: string;
  axis: string;
  axisTitle: string;
  grid: string;
  border: string;
  sizeSymbol: string;
  regressionBand: string;
  boxLine: string;
  boxMedian: string;
  referenceLine: string;
  referenceBand: string;
  gradientCenter: string;
  highlight: string;
  fontFamily: string;
};

export type ThemeDefinition = ThemeName | {
  base: ThemeName;
  tokens: Partial<ThemeTokens>;
};

export type ApplyThemeOptions = {
  theme: ThemeDefinition;
  scope?: "self" | "descendants";
};
```

호출 계약:

```js
program.applyTheme({ theme: "dark" });
program.applyTheme({
  theme: {
    base: "light",
    tokens: { mark: "#b91c1c", grid: "#d1fae5", fontFamily: "Inter" }
  }
});
composition.applyTheme({ theme: "dark", scope: "self" });
composition.applyTheme({
  theme: { base: "dark", tokens: { text: "#ffffff" } },
  scope: "descendants"
});
```

`removeTheme()` 시그니처는 바꾸지 않는다. 새로운 `removeTheme({scope})`, `createTheme`, `editTheme`, generic token action은 만들지 않는다.

### 3.1 scope 기본값

| receiver | 생략한 scope | `self` | `descendants` |
| --- | --- | --- | --- |
| unit | `self` | unit 전체 | `self`와 같은 결과; 저장 시 `self`로 정규화 |
| composition | `descendants` | composition root Canvas background만 | root와 모든 current/future descendant unit 및 parent-owned guide/header resource |

unit에서 사용자가 `scope:"descendants"`를 전달한 사실은 trace args에 남지만 requested theme state에는 `self`로 저장한다. unit에 descendants가 생긴 것처럼 별도 정책을 만들지 않는다.

### 3.2 closed input

- `applyTheme` root key는 `theme`, `scope`만 허용한다.
- string theme는 `light`, `dark`만 허용한다.
- object theme root key는 `base`, `tokens` 정확히 둘이며 둘 다 필수다.
- `tokens`는 plain object여야 하고 위 18개 key만 허용한다.
- 앞 17개 color token은 현재 renderer-neutral color validator를 사용한다.
- `fontFamily`는 길이가 1 이상인 string이다. 공백-only string도 현재 nonempty-string 규칙과 동일하게 허용한다. 별도 trim 의미를 추가하지 않는다.
- 입력 object/array를 보관하지 않고 owned clone을 freeze한다.

### 3.3 validation과 오류 우선순위

아래 순서를 고정한다. 앞 단계가 실패하면 뒤 단계의 target/layout을 조사하지 않는다.

1. options가 plain object인지 검사한다.
2. root closed key를 검사한다.
3. `theme` 존재를 검사한다.
4. theme string 또는 object shape를 검사한다.
5. object의 `base`, `tokens`, token closed key와 각 값을 검사한다.
6. `scope` enum을 검사한다.
7. receiver가 valid unit/composition인지 확인한다.
8. 전체 candidate tree와 font/layout을 immutable하게 materialize한다.

오류 class와 필수 substring:

| 조건 | class | message에 포함 |
| --- | --- | --- |
| non-object options, non-object theme/tokens, 잘못된 token value type | `TypeError` | `applyTheme`와 문제 key |
| unknown root/token key, unknown base/theme/scope | `Error` | unsupported key/value |
| empty `fontFamily` | `TypeError` | `fontFamily` |
| renderer-neutral color validator 실패 | 기존 validator class | token key |
| font change 후 layout이 유효 bounds를 만들지 못함 | 기존 layout error | 실패 resource 또는 composition child |

어떤 오류에서도 receiver의 semantic/config/graphic/children/trace는 호출 전과 동일하다.

## 4. token resolution

`src/theme/defaults.js`가 다음을 export한다.

```js
export const THEME_TOKEN_KEYS = Object.freeze([
  "background", "mark", "text", "strongText", "mutedText", "axis",
  "axisTitle", "grid", "border", "sizeSymbol", "regressionBand",
  "boxLine", "boxMedian", "referenceLine", "referenceBand",
  "gradientCenter", "highlight", "fontFamily"
]);

export function normalizeThemeDefinition(input) { /* owned frozen request */ }
export function resolveThemeTokens(definition) { /* frozen 18-key result */ }
```

`normalizeThemeDefinition("dark")`의 canonical request는 `{name:"dark", tokens:{}}`다. object 입력은 `{name:base, tokens:ownedPartial}`로 정규화한다. persisted state에서는 `base`와 `name`을 함께 저장하지 않는다.

`resolveThemeTokens`는 다음 한 번의 overlay만 수행한다.

```text
resolved = THEME_TOKENS[request.name] + request.tokens
```

이전 custom request의 partial tokens는 새 request에 merge하지 않는다. 따라서:

```text
A = light + {mark:red, grid:green}
B = light + {mark:blue}
A → B 결과: mark=blue, grid=THEME_TOKENS.light.grid
```

resolver는 항상 18개 key를 반환하고 입력과 결과를 freeze한다. renderer 또는 mark materializer가 partial tokens를 직접 읽지 않는다.

## 5. canonical persisted state

Theme 요청은 값 하나가 아니라 provenance가 있는 frame이다. 이 구조는 부모 theme 제거 후 child theme를 복원하기 위해 필수다.

```js
// resolved full tokens를 여기에 저장하지 않는다.
ThemeFrame = {
  owner: "local" | `composition:${compositionId}` | `composition:${compositionId}:self`,
  scope: "self" | "descendants",
  name: "light" | "dark",
  tokens: frozenPartialTokens
};

materializationConfigs.theme = {
  // 이 program의 root resource에 적용되는 요청. oldest → newest.
  frames: [ThemeFrame, ...],

  // composition에만 존재. future descendants에도 replay할 요청.
  // unit에는 이 key를 만들지 않는다.
  descendantFrames: [ThemeFrame, ...],

  // 이 receiver에서 직접 만든 self/descendants owner의 최근 순서.
  // removeTheme가 제거할 local request를 결정한다.
  localOrder: ["self" | "descendants", ...],

  // 현재 trace에서 계산한 explicit style provenance key의 정렬 배열.
  overrides: [string, ...]
};
```

상태 규칙:

1. 한 unit의 `owner:"local"` frame은 최대 하나다.
2. 한 composition owner의 frame은 각 target list에 최대 하나다.
3. 같은 owner를 다시 적용하면 기존 frame을 list 어디에서든 제거한 뒤 newest 위치에 한 번 추가한다.
4. 다른 owner frame은 유지한다. 따라서 호출 순서가 곧 theme-vs-theme precedence다.
5. `frames.at(-1)`가 해당 root의 effective theme다. frame이 없으면 built-in light다.
6. composition의 `descendantFrames`는 future child에 적용할 policy 순서다.
7. `localOrder`도 같은 scope를 제거한 뒤 끝에 한 번 추가한다.
8. explicit style는 frame 안에 복제하지 않는다.
9. full resolved 18-token object, 계산된 font bounds, palette를 persisted request state에 저장하지 않는다.

기존 `{name, overrides}` state는 accessor에서 다음과 같이 한 번 lazy-normalize한다.

```js
{
  frames: [{owner:"local", scope:"self", name:legacy.name, tokens:{}}],
  localOrder: ["self"],
  overrides: legacy.overrides ?? []
}
```

새 코드가 legacy shape를 다시 쓰지는 않는다. migration을 위해 trace를 변경하거나 새 action을 추가하지 않는다.

## 6. precedence

최종 property의 우선순위는 다음 두 단계로 계산한다.

1. applicable theme frames 중 list에서 가장 나중 frame의 resolved token을 고른다.
2. 해당 property에 explicit provenance가 있으면 theme 결과 대신 explicit requested value를 쓴다.

따라서 고정 precedence는 다음이다.

```text
explicit user style
> latest applicable theme request
> earlier applicable theme request
> built-in light fallback
```

`unit custom > inherited custom` 같은 고정 순위는 사용하지 않는다. 다음 호출이 앞 호출보다 우선한다.

```text
child local A
→ parent descendants B       effective B
→ child local C              effective C
→ parent descendants D       effective D
→ parent removeTheme()       effective C
```

부모 D 적용은 child local C를 삭제하지 않고 아래 frame으로 보존한다. 부모 제거는 자기 owner frame만 제거한다.

## 7. explicit provenance registry

값이 token과 우연히 같다는 이유로 explicit 여부를 판단하지 않는다. `collectOverrides`는 top-level trace를 순서대로 읽어 현재 살아 있는 resource의 요청 provenance를 재구성한다. create/recreate/remove/reset은 기존 clear 규칙을 유지한다.

### 7.1 추적 property

| resource | config key | graphic key |
| --- | --- | --- |
| Canvas | 해당 config가 있으면 background | `g:canvas.background` |
| Point/Bar/Rect/Area/Arc/Text | `c:marks.<id>.fill`, `.stroke`, `.fontFamily` | `g:<id>.fill`, `.stroke`, `.fontFamily` |
| Line/Rule/Tick | `.stroke` | `g:<id>.stroke` |
| axis line/ticks/labels/title | 기존 guide path의 `.color`/`.fontFamily` | 생성 graphic의 stroke/fill/fontFamily |
| Parallel axis labels/title | dimension index가 포함된 guide path | 해당 parallel text graphic/item |
| grid | guide color | grid stroke |
| legend root labels/title/border | guide path | label/title/background graphic |
| R38 legend block text/symbol | block override path | 해당 block graphic/item |
| title/subtitle | title style color/fontFamily | title/subtitle graphic |
| R39 facet header common/role | facet header color/fontFamily | header strip text graphic/item |
| reference/regression/error/box/gradient components | 현재 owner-specific config path | 실제 component graphic |
| highlight | explicit highlight color/fill/stroke | generated highlight item |

`fontFamily`는 Text mark, mark labels, annotation, Cartesian/Polar/Parallel axis labels·titles, legend root와 block text, chart title/subtitle, R39 facet headers에 모두 추적한다. 계산된 text, position, bounds, line break는 override key가 아니다.

### 7.2 theme가 바꾸지 않는 값

- field-driven `color`/`stroke` scale range와 categorical palette
- explicit constant color/stroke/font
- R38 block override
- R49 corner/cap/join/miter style
- labelMap의 typed identity와 표시 text
- selection predicate, selected membership, mark geometry
- transparent를 명시한 background

data-driven legend symbol의 categorical paint는 source scale의 값이다. `mark` token으로 바꾸지 않는다.

## 8. role mapping

Theme reconciler는 알려진 resource에 명시적 role을 부여한다. raw color equality는 마지막 호환 fallback이다.

| token | 적용 resource |
| --- | --- |
| `background` | unit Canvas, composition root Canvas |
| `mark` | non-field-driven ordinary mark fill/stroke, ordinary categorical default symbol |
| `text` | Text mark default, axis/legend label, mark label, annotation |
| `strongText` | chart title, legend title |
| `mutedText` | chart subtitle, axis ticks, gradient ticks, facet secondary header role이 있으면 그 default |
| `axis` | axis lines, Parallel axis lines/labels의 현재 role |
| `axisTitle` | Cartesian/Polar/Parallel axis title |
| `grid` | Cartesian/Polar grid |
| `border` | legend/background/header border 중 built-in default를 사용한 것 |
| `sizeSymbol` | size legend default symbol |
| `regressionBand` | regression band default fill |
| `boxLine` | box/whisker/outlier default outline |
| `boxMedian` | box median default stroke |
| `referenceLine` | reference line default stroke |
| `referenceBand` | reference band default fill |
| `gradientCenter` | gradient plot center rule |
| `highlight` | color/fill/stroke를 생략한 highlight의 generated paint |
| `fontFamily` | 위 typography resource의 default font |

같은 source color가 여러 token role과 일치할 수 있다. explicit role이 없는 raw fallback은 모든 일치 role이 같은 target value로 가는 경우에만 바꾼다. target values가 다르면 보존한다. 새로 지원한 known resource는 raw fallback에 기대지 말고 role을 추가한다.

source tokens는 action 전 effective frame에서, target tokens는 action 후 effective frame에서 resolve한다. custom A의 색을 custom B로 옮기려면 built-in 이름만 비교해서는 안 된다. action 후 새로 생성된 resource가 legacy light default를 가질 수 있으므로 role mapping의 eligible source 값은 다음이다.

```text
before effective role token
+ built-in light role token
+ 해당 role의 이미 지원하던 legacy literal
```

explicit provenance가 있거나 field-driven이면 eligible set과 일치해도 보존한다.

## 9. highlight token

`highlight`는 기존 `DEFAULT_COLORS.highlight`의 theme-aware replacement다.

1. highlight action에서 color/fill/stroke를 생략한 요청은 config에 resolved red literal만 저장하지 않는다. `paintSource:"theme"` 같은 provenance와 style의 나머지 요청을 저장한다.
2. 명시 color/fill/stroke는 `paintSource:"explicit"`와 값을 저장한다.
3. highlight materialization은 `paintSource:"theme"`일 때 현재 effective `highlight` token을 읽는다.
4. theme 변경은 source selection membership을 다시 계산하지 않고 최신 source geometry로 highlight item만 rematerialize한다.
5. legacy highlight config는 해당 action trace에서 paint key 생략 여부를 읽어 lazy-adopt한다. 단순히 값이 `#dc2626`인지 비교하지 않는다.

이 변경으로 explicit `#dc2626`과 default red를 구분한다.

## 10. unit transaction

unit `applyTheme`은 다음 순서를 한 top-level transaction에서 실행한다.

1. public input 전체를 normalize/validate하고 owned request를 만든다.
2. 기존 canonical theme state를 읽거나 legacy state를 normalize한다.
3. unit의 `local` frame을 제거한다.
4. 새 frame을 `frames` 끝에 추가한다. input descendants도 frame scope는 self다.
5. trace 기반 explicit overrides를 final live resource 기준으로 다시 계산한다.
6. before/after effective tokens로 materialization config의 default color/font property를 reconcile한다.
7. mark/guide/title/header/highlight를 semantic requested state에서 rematerialize한다.
8. text metrics, collision, occupied bounds, Canvas/layout을 아래 12절 순서로 갱신한다.
9. 완성 candidate를 검증한 뒤 새 frozen ChartProgram을 반환한다.

중첩된 내부 `editGraphics`/rematerialize action이 theme completion hook을 다시 호출하지 않게 현재 action stack 규칙을 보존한다. 재귀 hook이나 “변화가 없을 때까지” loop를 만들지 않는다.

## 11. composition transaction

### 11.1 `scope:"self"`

1. receiver composition ID를 stable owner로 사용해 `composition:<id>:self` frame을 만든다.
2. root `frames`의 같은 owner를 제거하고 끝에 추가한다.
3. `localOrder`의 self를 제거하고 끝에 추가한다.
4. root Canvas background만 새 effective `background`로 reconcile한다.
5. `descendantFrames`, children, retained templates, parent-owned guides/headers는 그대로 둔다.

### 11.2 `scope:"descendants"`

1. owner `composition:<id>`의 새 descendant frame을 만든다.
2. receiver root의 `frames`와 `descendantFrames`에서 같은 owner를 모두 제거한 뒤 끝에 추가한다.
3. `localOrder`의 descendants를 끝으로 옮긴다.
4. parent-owned facet/shared guide/header resource에 새 effective policy를 적용한다.
5. 각 nested composition에 postorder walker로 들어가 그 composition의 root `frames`와 `descendantFrames`에 같은 owner frame을 newest로 추가한다.
6. 각 leaf unit의 `frames`에 같은 owner frame을 newest로 추가하고 unit transaction의 reconcile을 실행한다.
7. retained facet/repeat unit template 자체에는 caller object를 수정하지 않고 같은 descendant frame policy를 기록한다.
8. leaf가 끝난 뒤 inner composition snapshot/layout, 마지막으로 outer snapshot/layout을 재계산한다.

원래 concat/facet/repeat 호출에 전달된 input ChartProgram은 deep-equal이어야 한다. receiver의 새 child snapshots만 바뀐다.

### 11.3 nested ordering

walker는 child key의 현재 stable order를 사용한다. 순서는 다음이다.

```text
validate all requests
→ leaf units left-to-right
→ nested composition parent-owned resources
→ nested composition layout/snapshot
→ outer parent-owned resources
→ outer layout/snapshot
```

child 하나가 실패하면 성공한 siblings만 담긴 composition을 반환하지 않는다. 모든 작업은 immutable candidate에 수행하고 전체 실패로 끝낸다.

### 11.4 future child replay

facet/repeat source edit, scale edit, Canvas edit 등으로 child를 새로 만들 때:

1. retained source unit의 local frames와 explicit styles를 읽는다.
2. ancestor composition의 `descendantFrames`를 oldest→newest로 적용한다.
3. child mark/guide/header requested state를 replay한다.
4. effective theme와 explicit provenance로 reconcile한다.
5. child layout을 계산하고 parent snapshot에 배치한다.

이 순서를 건너뛰고 기존 child graphic을 recolor/crop/clone하지 않는다.

## 12. font와 layout 순서

`fontFamily`가 before/after에서 다르면 다음 dependency 순서를 고정한다.

1. ordinary Text mark, annotation, mark-label text metrics
2. source-owned label placement와 collision/leader geometry
3. Cartesian/Polar/Parallel axis label·title metrics와 tick group bounds
4. legend root label/title와 R38 block text metrics, symbol/text row bounds
5. chart title/subtitle metrics
6. R39 facet header text/strip bounds
7. unit plot occupied bounds와 local guide placement
8. facet/repeat child local Canvas fit
9. inner composition snapshot placement
10. outer composition layout와 root Canvas fit

font 파일을 찾거나 설치하지 않는다. 기존 text metrics provider에 family string을 그대로 전달한다. provider의 deterministic fallback 결과를 사용한다.

## 13. `removeTheme()` lifecycle

### 13.1 unit

- `owner:"local"` frame이 없으면 `removeTheme requires an active program theme` 오류다. inherited parent frame만 있는 unit은 parent 소유이므로 child에서 제거하지 않는다.
- local frame을 list 어디에서든 제거한다.
- 남은 newest frame을 effective theme로 사용한다. 없으면 built-in light다.
- explicit style는 보존하고 before/after tokens로 reconcile/rematerialize/layout한다.
- `frames`가 비고 override registry도 필요 없으면 theme config를 제거한다.

### 13.2 composition

- `localOrder.at(-1)` scope를 제거한다. direct local request가 없으면 오류다.
- self이면 root `frames`의 self owner만 제거한다.
- descendants이면 전체 nested tree, root frames, descendantFrames, retained source에서 자기 composition owner frame만 제거한다.
- 다른 composition owner와 child local frame은 원래 순서로 남긴다.
- 제거 뒤 드러난 newest frame 또는 light로 recolor/font/layout을 다시 계산한다.
- self와 descendants가 모두 있었다면 한 번의 `removeTheme()`은 가장 최근 direct scope 하나만 제거한다. 남은 direct request는 active다. 두 번째 호출로 제거할 수 있다.

예:

```text
parent descendants dark
→ parent self light/red-background
→ removeTheme() : self만 제거, descendants dark 유지
→ removeTheme() : parent descendants 제거, child local theme 복원
```

## 14. composition background policy

현재 composition snapshot materializer의 hard-coded `background:"white"`는 제거한다.

- root Canvas background는 root `frames`의 newest applicable token이다.
- theme frame이 없고 사용자가 Canvas background를 명시하지 않았으면 기존 light/white 결과다.
- explicit Canvas background provenance가 있으면 self/descendants theme보다 우선한다.
- descendants는 nested unit Canvas background와 root background를 모두 바꾼다.
- self는 root만 바꾼다.
- parent-owned header strip의 배경이 explicit이면 보존한다. built-in/default 역할이면 해당 role token으로 reconcile한다.

## 15. exact implementation units

### W1 — schema/resolver

1. `THEME_TOKEN_KEYS`, normalizer, resolver를 `src/theme/defaults.js` 또는 같은 theme module에 추가한다.
2. pure unit tests에서 closed key, clone/freeze, A→B reset을 먼저 고정한다.
3. `types/program.d.ts`에 ThemeTokens/ThemeDefinition을 export한다.

### W2 — state와 unit reconcile

1. legacy/canonical state accessor와 frame upsert/remove helper를 추가한다.
2. `applyTheme` metadata scope를 `any`로 바꾼다.
3. current color reconciler가 before/after resolved custom tokens를 받게 바꾼다.
4. font role, highlight provenance, explicit override paths를 추가한다.
5. built-in light/dark unit parity를 통과시킨다.

### W3 — composition propagation

1. immutable postorder walker와 root/descendant frame policy를 추가한다.
2. nested concat과 facet/repeat retained source에 적용한다.
3. composition hard-coded background를 effective token resolver로 바꾼다.
4. remove owner와 replay를 구현한다.

### W4 — layout와 consumer integration

1. font-dependent materializer 순서를 연결한다.
2. R38 block, R39 labelMap/header, R49 explicit geometry style를 한 fixture에서 검증한다.
3. package/current docs/contract/MCP consumer를 갱신한다.

한 wave에서 상태 schema와 전파를 동시에 임시 구현해 snapshot recolor로 통과시키지 않는다.

## 16. 독립 acceptance oracle

### R47-N01 — partial tokens와 explicit precedence

fixture: light default mark, default grid, default axis/legend/header text, explicit blue mark, categorical color-encoded mark, explicit legend block font.

```js
applyTheme({
  theme: {
    base: "light",
    tokens: { mark: "#ff0000", grid: "#00ff00", fontFamily: "RoadmapTest" }
  }
})
```

assert:

- default mark fill/stroke만 `#ff0000`
- grid만 `#00ff00`
- default typography의 fontFamily가 `RoadmapTest`
- explicit blue mark, categorical palette, explicit block font는 unchanged
- requested tokens는 세 key만 저장
- input options와 before program deep-equal/frozen

### R47-N02 — replacement, merge 금지

```text
custom A = light + {mark:red, grid:green}
custom B = light + {mark:blue}
```

assert B의 grid는 light built-in grid이고 A의 green이 남지 않는다. A state/program은 unchanged다.

### R47-N03 — nested descendants와 replay

concat 안에 facet과 repeat를 포함하고 custom font/background를 descendants에 적용한다. 모든 current leaf, nested composition root, parent root, parent-owned header가 새 policy를 사용한다. facet source edit로 새 child를 만든 뒤에도 동일하다. 원래 composition input program들은 unchanged다.

### R47-N04 — composition self

self 적용 전후 child `semanticSpec`, `graphicSpec`, `materializationConfigs`, `trace`는 deep-equal이다. root Canvas background만 바뀐다. 기존 descendant policy도 deep-equal이다.

### R47-E01 — atomic errors

각각 별도 호출로 unknown token, invalid color, `fontFamily:""`, missing base, missing tokens, extra object key, bad scope를 검사한다. class와 key substring, before state/trace equality를 검사한다.

### R47-L01 — provenance와 lifecycle

child local A → parent descendants B → child local C가 있는 nested fixture를 만든다. parent B 재적용 뒤 parent remove로 C가 복원되는 frame oracle를 검사한다. facet replay 뒤 labelMap, R38 block override, R39 header role, R49 style가 유지된다.

## 17. test 파일과 최소 assertion

| 파일 | 필수 내용 |
| --- | --- |
| `test/unit/theme/defaults.test.js` | normalize/resolve, 18 closed keys, freeze, A→B |
| `test/unit/theme/state.test.js` | owner upsert/remove, nested order, legacy adoption |
| `test/contracts/custom-theme.test.js` | R47-N01~N04, E01, L01, public trace/immutability |
| 기존 `test/contracts/theme.test.js` | light/dark unit parity와 기존 API |
| facet/repeat contract | future child replay, original input immutability |
| type contract/fixture | exact accepted/rejected TypeScript examples |
| renderer tests | custom background/color/font가 Canvas/SVG/PDF에 도달 |
| installed consumer | packed Node, strict TypeScript, browser, MCP applyTheme |

large-font visual test는 텍스트가 바뀌었다는 assertion만으로 끝내지 않는다. label/legend/header bounds가 새 metrics와 일치하고 overlap/clip이 없음을 geometry로 검사한다.

## 18. 금지 구현

- custom token 전체를 renderer마다 복사
- previous partial tokens와 새 partial tokens merge
- resolved 18-token object를 requested state로 저장
- color equality만으로 explicit style 판정
- composition child graphic만 recolor하고 retained source policy를 생략
- parent remove에서 child local theme까지 삭제
- fixed `unit > inherited` precedence
- fontFamily만 문자열 교체하고 text/layout을 갱신하지 않음
- categorical/data-driven palette를 mark token으로 덮음
- hook가 자기 내부 action을 다시 theme reconcile하는 재귀 loop
- original composition input ChartProgram mutation

## 19. 완료 조건

- [x] exact public 타입과 runtime closed validation이 동기화됐다.
- [x] frame owner/order/remove/replay state test가 통과했다.
- [ ] R47-N01~N04, E01, L01이 실제 runtime evidence와 연결됐다.
- [x] built-in light/dark unit pixel parity를 보존했다.
- [x] nested composition의 current/future child와 parent-owned header/guide를 검증했다.
- [x] font metrics부터 outer layout까지 재계산했다.
- [ ] explicit color/font, data palette, R38/R39/R49 consumer를 보존했다.
- [x] Full registry/types/current contract/catalog/cards/MCP/docs/package consumer를 갱신했다.
- [x] Canvas/SVG/PDF와 installed Node/TypeScript/browser/MCP 검증을 기록했다.
- [x] 실행하지 않은 후속 R43 cell은 owner와 pending 이유를 기록했다.
- [x] Phase 9 STEP 원장에 commit, 명령, pass/fail/skip, artifact를 기록했다.
