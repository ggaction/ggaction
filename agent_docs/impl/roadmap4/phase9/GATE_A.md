# P9-A — Horizon contract와 primitive visual 검토

## 상태

- Gate: `P9-A`
- 상태: `ready-for-review`
- 승인: 대기 중
- Primitive source checkpoint: `5481ed6` (`smooth horizon primitive curves`)
- Remote: `origin/main`
- 승인 전 차단: production Horizon grammar, transform, action과 public declarations

현재 runtime, exact declarations, Current action catalog와 public docs에는 후보 API를 추가하지 않았다.

## 후보 public API

```typescript
type HorizonFieldEncoding = string | {
  field: string;
  fieldType?: "temporal" | "quantitative";
  scale?: ScaleOptions;
};

type HorizonPalette = {
  positive?: Palette;
  negative?: Palette;
};

encodeHorizon({
  target?, source?, x?, y?, groupBy?, bands?, baseline?, extent?, resolve?,
  missing?, overflow?, palette?
}): ChartProgram;

editHorizon({
  target?, source?, x?, y?, groupBy?, bands?, baseline?, extent?, resolve?,
  missing?, overflow?, palette?
}): ChartProgram;
```

### Defaults와 inference

- `bands=3`, `baseline=0`, `extent="auto"`, `resolve="shared"`, `missing="break"`,
  `overflow="clip"`다.
- Default positive/negative palette는 `blues`/`reds`다. 기존 Palette name/object vocabulary를 재사용한다.
- Target은 current area, unique area 순서다. Source는 target data, current data, unique data 순서다.
- x/y는 explicit option, target의 stored encoding, unique compatible source layer 순서다. Explicit 값이 우선하고
  ambiguity는 오류다.
- x는 temporal 또는 quantitative, y는 quantitative다. Transform-internal `time`/`field` public alias는 없다.
- `groupBy`는 explicit option, stored group encoding 순서이며 둘 다 없으면 single series다. Horizon이 color를
  sign/band에 사용하므로 color field를 grouping으로 추정하지 않는다.
- `editHorizon`은 existing resource의 partial edit다. Omitted option은 보존하고 `groupBy: false`는 grouping을
  제거하며 empty edit은 오류다.

## Target executable chain

```javascript
chart()
  .createCanvas({
    width: 760,
    height: 300,
    margin: { top: 78, right: 30, bottom: 58, left: 50 }
  })
  .createData({ values: gapminder })
  .filterData({ id: "kenya", field: "country", oneOf: ["Kenya"] })
  .createAreaMark({ curve: "monotone" })
  .encodeHorizon({
    x: "year",
    y: "life_expect",
    bands: 3,
    baseline: 55,
    palette: { positive: "blues", negative: "reds" }
  })
  .createGuides()
  .createTitle({
    text: "Kenya Life Expectancy",
    subtitle: "Blue above, red below · three folded bands around 55 years"
  });
```

`test/gates/gapminder-horizon/manifest.js`가 이 exact target chain과 primitive visual metadata를 소유한다.

## State와 materialization ownership

- One immutable derived dataset transform이 source, x/y input binding, group, requested/resolved extent, bands,
  baseline, missing/overflow, palette와 generated output names를 소유한다.
- Target area는 generated ordinary x/y/y2/group/color encoding만 저장한다. 같은 Horizon 계약을 별도 encoding
  branch에 중복하지 않는다.
- Target area의 existing `curve` appearance를 그대로 사용한다. Horizon은 별도 curve option을 만들거나 source
  data를 smoothing하지 않는다.
- Edit은 original source에서 deterministic derived revision을 만들고 consumer를 rebind한다. Earlier program과
  caller rows는 그대로다.
- Concrete sampled colors와 closed path commands는 `graphicSpec`에만 저장한다. Renderer에는 Horizon primitive나
  semantic inference를 추가하지 않는다.
- `createGuides()`는 raw x axis만 만들며 folded-amplitude y axis/grid와 automatic legend는 만들지 않는다.

## Independent oracle 결과

- Production source를 import하지 않는 `test/oracles/horizon.js`가 stable sort, exact zero crossing, missing break,
  shared/independent extent, clip/error와 sign×band×segment order를 계산한다.
- Literal `(-5 at x=0) → (+5 at x=10)`, baseline `0`, extent `6`, bands `2` fixture는 x=`5`에 fraction=`0.5`
  crossing을 삽입한다.
- 같은 literal fixture의 band amplitudes는 negative/positive 각각 `[3, 2]`이며 합이 원 magnitude `5`다.
- 모든 finite source row에서 `Σ band amplitude = min(abs(y-baseline), resolvedExtent)`를 검증한다.
- Duplicate group+x, missing error, overflow error와 invalid bands는 silent output 대신 명확한 오류다.
- All-baseline automatic extent는 resolved extent `0`과 empty series를 정상 반환한다.

Kenya fixture는 11개 row, baseline `55`, resolved extent `8.39`, band height `8.39/3`, closed path `7`개다.
Order는 negative band `0→1`, positive band `0→1→2`이며 같은 band의 disjoint segment는 stable segment order를
유지한다.

## Primitive visual

- Source: `test/gates/gapminder-horizon/primitive.program.js`
- Artifact: `.artifacts/test/png/review/gapminder-horizon/kenya-life-expectancy/primitive.png`
- Logical/physical: `760×300` / `1520×600`
- SHA-256: `09115548bb665608eacec8b3c0ef9320b74a5b780d2dee65dd0bd547ebb3b4f1`
- Seven ordinary monotone-cubic closed path items, vertical grid behind paths, x axis/title above paths
- No y axis, y grid, legend, `encodeHorizon` trace node 또는 production Horizon state
- Semantic getter가 오류인 renderer probe에서도 final `graphicSpec`만으로 동일하게 그린다.

## 검증 증거

| 검증 | 결과 |
| --- | --- |
| Focused Gate suite | `5/5` pass |
| Full normal suite | `1,738/1,738` pass |
| Full Node PNG suite | `122/122` pass |
| Approved artifact gallery | `120` variants verified |
| Active-review gallery | `1` variant verified |
| Boundary | production source/types/Current catalog/public docs unchanged |

기본 normal suite의 package dry-run은 사용자 홈의 root-owned npm cache에서 한 번 실패했으며, 저장소 밖 권한을
변경하지 않고 `npm_config_cache=/tmp/ggaction-npm-cache`로 동일 전체 suite를 재실행해 `1,738/1,738`을 확인했다.
Artifact gallery Chromium 검사는 macOS Mach IPC sandbox 제한 때문에 권한 확장 환경에서 동일 생성물에 대해
통과했다.

## 승인 요청 범위

1. x/y 중심 `encodeHorizon`과 partial `editHorizon` 계약
2. defaults/inference/error와 transform/area state ownership
3. independent crossing/folding/gap/extent oracle
4. Kenya primitive source와 위 rendered visual
5. P9-A 승인 후 production transform/action 구현을 여는 것

P9-A 승인 전에는 production Horizon 구현을 시작하지 않는다.
