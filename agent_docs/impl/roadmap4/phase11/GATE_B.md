# P11-B — Parallel Coordinates public runtime와 lifecycle 검토

## 상태

- Gate: `P11-B`
- 상태: `approved`
- 승인: 2026-07-21 사용자 명시 승인
- 검토 대상 source checkpoint: `e440a2a` (`complete parallel coordinates facade`)
- Remote: `origin/main`
- 승인 전 차단: exact TypeScript, Current contracts/catalog, public docs/example와 artifact graduation

P11-A에서 승인한 projection과 primitive visual을 production action hierarchy로 구현했다. 이번 Gate는 runtime
surface, canonical state, consumer lifecycle와 primitive/public exact parity를 승인받는다. Public closeout은 아직
수행하지 않았다.

## Exact executable chain

Source: `test/gates/cars-parallel-coordinates/user-facing.program.js`

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
    line: { strokeWidth: 1.25, opacity: 0.48 },
    guides: {
      legend: {
        offset: 42,
        symbol: { length: 24, lineWidth: 3 },
        titleStyle: { color: "#1e293b" }
      }
    }
  })
  .createTitle({
    text: "Cars of 1970",
    subtitle: "Each path connects one car across four measurements",
    align: "center",
    offset: 1,
    gap: 9.5,
    titleStyle: { fontWeight: 700 },
    subtitleStyle: { fontSize: 13 }
  });
```

P11-A의 간단한 target chain에는 universal title/legend defaults를 바꾸지 않고도 primitive target을 재현하는
세부 visual option이 생략되어 있었다. Production facade에 Parallel 전용 title/legend default를 만들지 않고,
현재 공통 action vocabulary로 해당 값을 명시해 approved primitive와 exact pixel parity를 유지했다.

## Wrapped hierarchy

```text
createParallelCoordinates
├─ createCoordinate({ type: "parallel" })
├─ createLineMark(...)
├─ encodeParallelCoordinates(...)
├─ encodeColor(...)                    optional
├─ encodeStrokeDash(...)               optional
└─ createGuides(...)
   ├─ createAxes(...)
   │  └─ createParallelAxes(...)       internal
   └─ createLegend(...)                when applicable
```

Facade는 projection, scale 또는 axis 계산을 복제하지 않는다. 모든 child는 wrapped action이고 top-level trace에서
실행 순서와 인수를 감사할 수 있다.

## Canonical state와 materialization

- Coordinate resource는 `{ id: "parallel", type: "parallel" }`만 소유한다.
- Line layer의 `encoding.parallel`이 ordered dimensions, optional key와 missing policy를 한 번만 소유한다.
- Dimension별 scale ID는 `<target>-parallel-<index>`이고 existing scale definition/resolution contract를 재사용한다.
- Explicit `key`는 resource ID가 아니라 dataset field다. 공백이 있는 field 이름도 허용하며 값은 모든 row에서
  non-missing/unique여야 한다.
- Renderer는 Parallel semantics를 읽지 않는다. 35개 row는 35개 ordinary open path item으로 materialize되고,
  네 축은 ordinary line/text collections다.
- P11-A Cars fixture의 resolved domains는 `[5, 30]`, `[0, 250]`, `[1000, 5000]`, `[6, 21]`이다.

## Consumer/lifecycle matrix

| Consumer | 결과 |
| --- | --- |
| Canvas edit | path x positions와 axis positions를 새 plot bounds에서 함께 재물질화 |
| Dimension scale edit | 해당 path vertices, ticks와 labels를 같은 resolved scale에서 재물질화 |
| Data/filter | retained rows, domains, paths, axes와 legend를 stale resource 없이 재물질화 |
| Color | existing categorical color scale/palette와 categorical legend 재사용 |
| Stroke dash | existing line stroke-dash encoding을 row path item에 적용 |
| Line appearance | stroke width/opacity 등 existing line mark vocabulary 적용 |
| Selection/highlight | source row 하나가 item 하나이며 stable `/row/` identity로 선택/강조 |
| `filterMarks` | selected row를 immutable derived data로 보존하고 axes/legend까지 재계산 |
| Text attachment | 한 path에 단일 anchor를 암묵 선택하지 않으므로 이번 범위에서 해당 없음 |

`missing="break"`는 동일 row identity 아래 drawable fragments를 보존하고, `drop-row`는 불완전한 row를 제외하며,
`error`는 state 변경 전에 거부한다.

## Validation과 compatibility

- 최소 2개 unique dimensions, supported field types, valid scale options와 unique explicit key를 preflight한다.
- Existing Cartesian/Polar position encoding과 Parallel encoding을 한 layer에 섞지 않는다.
- Coordinate가 ambiguous하거나 같은 ID의 incompatible coordinate가 있으면 explicit resolution을 요구한다.
- Rejected facade/encoding call은 이전 program, trace, semantic/graphic state를 바꾸지 않는다.
- 변경은 additive runtime surface다. Existing action 이름이나 stored Cartesian/Polar schema는 변경하지 않았다.
- Package size budget은 실제 새 source 책임 4개를 반영해 `364` entries / `1,600,000` unpacked bytes로 조정했고
  현재 artifact는 `364` entries / `1,586,855` unpacked bytes다.

## Visual과 parity evidence

- Primitive: `.artifacts/test/png/review/cars-parallel-coordinates/cars-1970/primitive.png`
- User-facing: `.artifacts/test/png/review/cars-parallel-coordinates/cars-1970/user-facing.png`
- Logical/physical: `860×500` / `1720×1000`
- 두 PNG SHA-256: `6118fca87e735ab8e702ed106680db93ddf5339d4a952c8a9cadf3ae480178bf`
- Decoded pixels와 mock Canvas renderer call sequence가 exact match다.

## 검증 증거

| 검증 | 결과 |
| --- | --- |
| Focused Parallel oracle/primitive/public/unit | `15/15` pass |
| Full normal suite | `1,770/1,770` pass |
| Coverage | `94.32%` lines, `89.57%` branches, `98.50%` functions; `56` critical floors pass |
| Full Node PNG suite | `123/123` pass |
| Approved artifact gallery | `121` variants verified |
| Active-review browser gallery | `1` variant verified |
| Package dry-run | `364` entries, `337,325` packed bytes, `1,586,855` unpacked bytes |

Browser gallery의 Chromium 검사는 macOS Mach IPC sandbox 제한 때문에 권한 확장 환경에서 동일 생성물에 대해
실행했다.

## 승인 요청 범위

1. `createParallelCoordinates`의 exact wrapped hierarchy와 minimal required `dimensions`
2. `encodeParallelCoordinates`의 ordered dimension/key/missing canonical ownership
3. dimension-local scales와 ordinary path/axis graphics materialization
4. Canvas/data/filter/scale, appearance, guides와 selection/highlight consumer lifecycle
5. P11-A primitive와 public program의 exact Canvas-call/pixel parity

P11-B 승인으로 Step 6의 declarations, Current contracts/catalog, public docs/examples, approved artifact graduation과
P11-Exit 누적 검증이 열렸다.
