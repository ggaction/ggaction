# P11-Exit — Parallel Coordinates closeout

## 상태

- Gate: `P11-Exit`
- 상태: `approved`
- 승인: `2026-07-21` 사용자 명시 승인
- Functional checkpoint: `e440a2a` (`complete parallel coordinates facade`)
- Public closeout checkpoint: `755acd9` (`publish parallel coordinates contract`)
- Remote: `origin/main`
- 승인으로 해제: Roadmap 4 Phase 12 설계와 Gate 계획

Current inventory, architecture, exact declarations, package boundary, stable chart/example/docs와 누적 검증을
검토한다. Docs deploy와 package publish는 수행하지 않았다.

## 종료 대상 public surface

- `createCoordinate({ type: "parallel" })`는 세 번째 current coordinate family를 저장한다.
- `encodeParallelCoordinates({ dimensions, key?, missing? })`는 최소 두 ordered dimension과 각 dimension의
  namespaced scale을 atomic하게 author한다.
- `createParallelCoordinates({ dimensions, ... })`는 coordinate, line mark, Parallel encoding, optional color/dash와
  applicable guides를 wrapped child action으로 조립한다.
- Public runtime, exact TypeScript, root type export, Current action inventory, package consumer와 public docs가 같은
  option vocabulary를 사용한다.
- Stable chart slice는 `test/charts/cars-parallel-coordinates/`, canonical runnable example은
  `examples/cars-parallel-coordinates/`가 소유한다. Active Gate test dependency는 남지 않는다.

## Canonical executable chain

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

## State, materialization과 compatibility

- Coordinate는 family와 attachment만 소유하고 `encoding.parallel`이 ordered dimension/key/missing 의미를 한 번만
  소유한다. Dimension-local scale은 target+dimension으로 namespace된다.
- Dimension scale options에서 사용자 `id`는 허용하지 않는다. Generated scale identity는 owning target/dimension이
  결정하므로 다른 scale을 조용히 덮어쓰거나 공유하지 않는다.
- 각 source row는 stable semantic item 하나이며 final `graphicSpec`에는 ordinary open path 하나로 저장된다.
  Axis와 legend도 ordinary line/text collection이다. Renderer에는 Parallel-specific branch가 없다.
- Canvas/data/filter/scale edit는 paths, dimension axes와 legend를 deterministic plan으로 rematerialize한다.
  Selection/highlight/filter는 source-row grain을 유지한다.
- Missing 기본은 `break`; `drop-row`와 `error`를 지원한다. Ambiguous coordinate/target이나 incompatible coordinate
  family는 일부 state를 남기기 전에 명확한 validation error를 낸다.
- Existing Cartesian/Polar schema와 action behavior는 변경하지 않은 additive public surface다.

## Stable visual evidence

- Artifact: `.artifacts/test/png/charts/chart-variants/cars-parallel-coordinates/cars-1970/`
- Logical/physical size: `860×500` / `1720×1000`
- Primitive/public PNG SHA-256:
  `6118fca87e735ab8e702ed106680db93ddf5339d4a952c8a9cadf3ae480178bf`
- Primitive와 public program의 complete `graphicSpec`, draw order, mock Canvas calls와 decoded PNG pixels가 exact
  equivalent다.
- Public full-size image와 thumbnail은 `docs/assets/images/`에 generator-owned asset으로 등록했다.

## 누적 검증 증거

| 검증 | 결과 |
| --- | --- |
| Full normal suite | `1,773/1,773` pass |
| Stable chart suite | `422/422` pass |
| Contract/package-boundary suite | `124/124` pass |
| Node PNG render suite | `123/123` pass |
| Approved artifact gallery | `122` variants verified |
| Active-review gallery | `0` variants verified |
| Browser Canvas/package example suite | `35/35` pass |
| Coverage | lines `94.35%`, branches `89.59%`, functions `98.50%`; critical floors `56/56` pass |
| Documentation source/generator suite | `32/32` pass |
| Built docs | `103` pages; links/assets/search/LLM targets pass |
| Docs browser | built-site desktop/mobile and search checks pass |
| Package artifact | `364` entries; `337,697` packed / `1,588,761` unpacked bytes |
| Installed-package consumer | Node/extension/PNG/Parallel runtime/TypeScript/tutorial/browser/private-export checks pass |
| Packed tarball SHA-256 | `a39bc678b2da101acd8211e82b30adb035a5f3417fadca583a5c19faa662f7e3` |

Chromium/localhost 검증은 macOS sandbox 권한 밖에서 동일 repository command로 통과했다. Documentation build는
repository가 고정한 `mise ruby@3.2.6`과 locked bundle로 실행했다.

## 승인 요청 범위

1. NCP-004 Parallel coordinate/encoding/facade의 final ownership과 lifecycle
2. Exact runtime/type/package/Current contract와 stable example/chart-test surface
3. Cars 1970 primitive/public exact visual parity와 approved artifact graduation
4. Current architecture와 public/generated docs 동기화
5. 위 누적 검증을 Phase 11 종료 증거로 채택하는 것

P11-Exit 승인으로 Phase 11을 `completed`로 닫고 Phase 12 설계와 Gate 계획을 열었다.
