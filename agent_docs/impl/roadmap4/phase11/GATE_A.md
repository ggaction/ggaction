# P11-A — Parallel Coordinates contract와 primitive visual 검토

## 상태

- Gate: `P11-A`
- 상태: `ready-for-review`
- 승인: 대기 중
- Primitive source checkpoint: commit/push 뒤 기록
- Remote: `origin/main`
- 승인 전 차단: production Parallel coordinate grammar, action, materialization과 public declarations

현재 runtime, exact declarations, Current action catalog와 public docs에는 후보 API를 추가하지 않았다.

## 후보 public API

```typescript
type ParallelMissingPolicy = "break" | "drop-row" | "error";

type ParallelDimension = string | {
  field: string;
  fieldType?: "quantitative" | "ordinal";
  title?: string;
  scale?: ScaleOptions;
};

encodeParallelCoordinates({
  target?, coordinate?, dimensions, key?, missing?
}): ChartProgram;

createParallelCoordinates({
  id?, data?, coordinate?, dimensions, key?, missing?,
  color?, strokeDash?, line?, guides?
}): ChartProgram;
```

`createCoordinate({ type })`의 type vocabulary에는 `"parallel"`을 additive하게 추가한다.

### Defaults와 inference

- `dimensions`는 required ordered array이며 최소 2개 unique field다.
- String dimension은 data의 finite numeric values면 quantitative, consistent string values면 ordinal로 추론한다.
  Numeric ordinal은 `fieldType: "ordinal"`을 명시한다. Missing values는 inference에서 제외하지만 final missing
  policy에는 참여한다.
- Quantitative dimension은 기존 continuous position scale contract, ordinal dimension은 point scale contract를
  재사용한다. Scale options 생략은 기존 type/domain/range defaults이며 target+dimension role로 namespace한다.
- `key` 생략은 source lineage의 stable row identity다. 임의의 dataset field를 key로 추론하지 않는다. Explicit
  key는 모든 eligible rows에서 non-missing unique value여야 한다.
- `missing="break"`가 기본이다. `drop-row`는 불완전한 row 전체를 제외하고 `error`는 state 변경 전에 거부한다.
- Facade ID의 stable default는 `parallelCoordinates`다. Data는 explicit, current, unique 순서로만 추론한다.
- Coordinate는 explicit compatible ID, current compatible Parallel coordinate, unique compatible Parallel coordinate,
  새 stable ID `parallel` 순서다. Ambiguity와 conflicting existing ID는 오류다.
- `color`, `strokeDash`, `line`과 `guides`는 existing child action vocabulary를 그대로 사용한다. Omitted guides는
  dimension axes와 applicable legend를 만들고 `guides: false`는 모두 끈다.

## Target executable chain

```javascript
chart()
  .createCanvas({
    width: 860,
    height: 500,
    margin: { top: 110, right: 160, bottom: 65, left: 78 }
  })
  .createData({ values: cars })
  .filterData({
    id: "cars1970",
    field: "Year",
    oneOf: ["1970-01-01"]
  })
  .createParallelCoordinates({
    dimensions: [
      { field: "Miles_per_Gallon", title: "MPG", scale: { nice: true, zero: false } },
      { field: "Horsepower", scale: { nice: true, zero: false } },
      { field: "Weight_in_lbs", title: "Weight (lb)", scale: { nice: true, zero: false } },
      { field: "Acceleration", scale: { nice: true, zero: false } }
    ],
    key: "Name",
    color: {
      field: "Origin",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    },
    line: { strokeWidth: 1.25, opacity: 0.48 }
  })
  .createTitle({
    text: "Cars of 1970",
    subtitle: "Each path connects one car across four measurements"
  });
```

`test/gates/cars-parallel-coordinates/manifest.js`가 exact target chain과 primitive visual metadata를 소유한다.

## Action hierarchy와 ownership

```text
createParallelCoordinates
├─ createCoordinate({ id: resolvedCoordinate, type: "parallel" })
├─ createLineMark({ id: resolvedTarget, ...line })
├─ encodeParallelCoordinates({ dimensions, key, missing })
├─ encodeColor(...)                    optional
├─ encodeStrokeDash(...)               optional
└─ createGuides(...)                   unless false
```

- Coordinate는 `type`과 layer attachment만 저장한다. Ordered fields를 coordinate와 encoding 양쪽에 중복하지 않는다.
- Target line layer의 `encoding.parallel`이 normalized dimensions, key policy와 missing policy를 atomic하게 소유한다.
- Dimension scales는 existing scale resources이고 requested definition과 resolved domain/range를 기존 경계에 저장한다.
- `encodeParallelCoordinates` 재호출은 complete dimensions/key/missing assignment를 preflight한 뒤 atomic replacement한다.
  Facade-level edit action이나 `editCoordinate`는 만들지 않는다.
- `createAxes`/`createGuides`가 Parallel coordinate를 dispatch하며 dimension axis materializers는 internal wrapped
  family다. Renderer는 ordinary path, line과 text만 읽는다.
- 한 eligible source row가 한 selectable item이다. Missing break의 여러 fragments는 같은 semantic item identity와
  attachment set을 공유한다.

## Independent oracle 결과

- `test/oracles/parallel-coordinates.js`는 production source를 import하지 않고 equal axis spacing, quantitative/ordinal
  mapping, auto/explicit domains, stable keys와 missing segmentation을 계산한다.
- Literal bounds `(left=10, right=110, top=20, bottom=220)`의 세 axes는 x=`10, 60, 110`이다.
- Literal row `{ amount: 0, grade: "high", score: 50 }`는 각각 y=`220, 20, 120`으로 mapping되고 command는
  `M → L → L`이다.
- Four-dimension missing-middle fixture의 default break는 fragment lengths `[1, 2]`이며 drawable commands는
  뒤 fragment의 `M → L`만 남는다.
- Duplicate key, duplicate dimension, invalid policy/domain과 missing error는 silent empty output 대신 오류다.

1970 Cars fixture는 35개 row, explicit `Name` key 35개, missing MPG 6개다. Resolved domains는
`[5, 30]`, `[0, 250]`, `[1000, 5000]`, `[6, 21]`이고 axis x는
`78, 285.33333333333337, 492.6666666666667, 700`이다.

## Primitive visual

- Source: `test/gates/cars-parallel-coordinates/primitive.program.js`
- Artifact: `.artifacts/test/png/review/cars-parallel-coordinates/cars-1970/primitive.png`
- Logical/physical: `860×500` / `1720×1000`
- SHA-256: `6118fca87e735ab8e702ed106680db93ddf5339d4a952c8a9cadf3ae480178bf`
- 35 ordinary open path items, four dimension axes/titles, Origin line-symbol legend와 plot-centered title
- Paths draw behind axes/labels; no Parallel public action trace, production state 또는 renderer branch
- Semantic getter가 오류인 renderer probe에서도 final `graphicSpec`만으로 동일하게 그린다.

## 검증 증거

| 검증 | 결과 |
| --- | --- |
| Focused Gate suite | `4/4` pass |
| Focused Node PNG | `1/1` pass |
| Contract suite | `122/122` pass |
| Full normal suite | `1,759/1,759` pass |
| Full Node PNG suite | `123/123` pass |
| Approved artifact gallery | `121` variants verified |
| Active-review gallery | `1` variant verified |
| Boundary | production source/types/Current catalog/public docs unchanged |

기본 normal suite와 package dry-run은 저장소 밖의 root-owned npm cache를 변경하지 않고
`npm_config_cache=/tmp/ggaction-npm-cache`로 실행했다. Artifact gallery Chromium 검사는 macOS Mach IPC sandbox
제한 때문에 권한 확장 환경에서 동일 생성물에 대해 통과했다.

## 승인 요청 범위

1. `createCoordinate({ type: "parallel" })`, atomic `encodeParallelCoordinates`와 facade hierarchy
2. dimensions/key/missing/scale defaults, inference와 error boundary
3. coordinate/encoding/scale/guide canonical ownership과 row item identity
4. independent projection/segmentation oracle
5. 1970 Cars primitive source와 rendered visual
6. P11-A 승인 후 production Parallel coordinate/action 구현을 여는 것

P11-A 승인 전에는 production Parallel source와 public declarations를 변경하지 않는다.
