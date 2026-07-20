# P9-Exit — Horizon closeout

## 상태

- Gate: `P9-Exit`
- 상태: `ready-for-review`
- 승인: 대기 중
- Functional/documentation checkpoint: `d8ad673` (`close horizon public slice`)
- Review package checkpoint: `b33da03` (`prepare phase 9 exit review`)
- Remote: `origin/main`
- 승인 전 차단: Roadmap 4 Phase 10

Current inventory, architecture, exact declarations, package, stable chart/example/docs와 cumulative verification을
검토한다. Docs deploy와 package publish는 수행하지 않았다.

## 종료 대상 public surface

- `encodeHorizon({ x, y })`는 raw source를 immutable sign×band×segment derived rows로 만들고 ordinary closed
  area path로 materialize한다.
- `editHorizon()`은 original source에서 partial revision을 다시 계산하며 stale semantic/graphic branches와
  connected consumers를 함께 갱신한다.
- `x`/`y`는 shorthand 또는 field-encoding object를 받고 compatible stored encoding에서 추론할 수 있다.
- Requested automatic policy와 resolved extent/band width는 분리된 provenance로 보존한다.
- Runtime export, exact TypeScript, Current action contract, package consumer와 public docs가 같은 option vocabulary를
  가진다.
- Stable chart slice는 `test/charts/gapminder-horizon/`, canonical runnable example은
  `examples/gapminder-horizon/`가 소유한다. Active Gate dependency는 남지 않는다.

## 최종 executable chain

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
  .createGuides({
    axes: {
      x: {
        ticksAndLabels: { labels: { offset: 14 } },
        title: { offset: 44 }
      },
      y: false
    }
  })
  .createTitle({
    text: "Kenya Life Expectancy",
    subtitle: "Blue above, red below · three folded bands around 55 years",
    align: "center",
    offset: -3,
    gap: 9.5,
    titleStyle: { fontWeight: 700 },
    subtitleStyle: { fontSize: 13 }
  });
```

## State와 compatibility 결과

- `semanticSpec`에는 source/derived dataset provenance, x/y roles, baseline, band count, palettes와 policies가 남고,
  concrete folded geometry는 `graphicSpec`에만 남는다.
- Renderer는 Horizon-specific branch를 모르며 backend-neutral closed paths만 읽는다.
- Existing area interpolation을 재사용하고 Horizon 전용 curve option이나 graphic primitive를 추가하지 않았다.
- Missing rows는 기본적으로 segment를 끊고, overflow는 기본적으로 clip한다. Unsupported or ambiguous state는
  silent empty chart 대신 validation error다.
- Edit, filter, selection/highlight, facet shared/independent resolution과 previous-program/caller-data immutability를
  회귀 검증했다.
- Default guide는 x축만 만들며 folded y축과 automatic legend는 만들지 않는다.

## Rendered evidence

Approved candidate artifact:

- `.artifacts/test/png/charts/horizon/gapminder-horizon/kenya-life-expectancy/`
- logical/physical: `760×300` / `1520×600`
- primitive/public PNG SHA-256:
  `09115548bb665608eacec8b3c0ef9320b74a5b780d2dee65dd0bd547ebb3b4f1`

Primitive와 public action 결과는 pixel-exact equivalent다. Approved gallery는 `121` variants,
active-review gallery는 `0` variants다.

## 누적 검증 증거

| 검증 | 결과 |
| --- | --- |
| Full normal suite | `1,755/1,755` pass |
| Stable chart suite | `412/412` pass |
| Contract/package-boundary suite | `122/122` pass |
| Node PNG render suite | `122/122` pass |
| Browser example/package suite | `37/37` pass |
| Coverage | `94.46%` lines, `89.76%` branches, `98.66%` functions; `56` critical floors pass |
| Package artifact | `360` entries; `330,715` packed / `1,551,199` unpacked bytes |
| Packed consumer | Node, extension, PNG, Horizon runtime, strict TypeScript, tutorial, browser와 private-export rejection pass |
| Packed tarball | SHA-256 `1594dc1681d734118d58fe89508818cb231d9f8a3648c29d5e8392bbcb77c503` |
| Docs source suite | `32/32` pass |
| Built docs | `102` pages, links/assets/search/LLM targets pass |
| Docs browser | desktop search + every page at `320px`, `390px`, `768px` pass |

Chromium 기반 검증은 macOS sandbox의 loopback/Mach IPC 제한 때문에 권한 확장 환경에서 동일 command를
재실행했다. Ruby 검증은 repository lock과 일치하는 `mise ruby@3.2.6`에서 수행했다.

## 승인 요청 범위

1. NCP-005 Horizon transform/materialization/edit lifecycle와 compatibility
2. `encodeHorizon({ x, y })` 및 `editHorizon()` runtime/type/package contract
3. Gapminder primitive/public pixel parity와 stable example/chart-test ownership
4. Current inventory, architecture와 public/generated docs 동기화
5. 위 누적 검증을 Phase 9 종료 증거로 채택하는 것

P9-Exit 승인 전에는 Phase 10을 시작하지 않는다.
