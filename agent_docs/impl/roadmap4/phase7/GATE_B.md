# P7-B — Ordered path public vertical slice 검토

## 상태

- Gate: `P7-B`
- 상태: `ready-for-review`
- Review source checkpoint: `5184ec1` (`implement ordered path encoding`)
- Remote: `origin/main`
- 승인 전 차단: Phase 7 architecture closeout, P7-Exit와 Phase 8 production source

P7-A에서 승인한 semantic owner, stable ordering과 compatibility boundary를 public
`encodePathOrder`/`removePathOrder` lifecycle로 구현했다. P7-B는 public call chain, primitive/public exact
parity와 모든 기존 graphical consumer의 deterministic replay를 검토한다.

## 검토할 public chain

실행 소스는
[`examples/gapminder-development-trajectories/program.js`](../../../../examples/gapminder-development-trajectories/program.js)다.

```javascript
chart()
  .createCanvas({
    width: 760,
    height: 500,
    margin: { top: 85, right: 170, bottom: 80, left: 85 }
  })
  .createData({ values: trajectoryRows })
  .createLineMark({ id: "trajectories", strokeWidth: 3 })
  .encodeX({
    target: "trajectories",
    field: "fertility",
    scale: { domain: [1, 7], zero: false }
  })
  .encodeY({
    target: "trajectories",
    field: "life_expect",
    scale: { domain: [25, 85], zero: false }
  })
  .encodeColor({
    target: "trajectories",
    field: "country",
    fieldType: "nominal",
    scale: {
      domain: ["China", "South Africa", "United States"],
      range: ["#e45756", "#4c78a8", "#54a24b"]
    }
  })
  .encodePathOrder({
    target: "trajectories",
    field: "year",
    order: "ascending"
  })
  .createGuides({
    axes: {
      x: { title: { text: "Fertility" } },
      y: { title: { text: "Life expectancy" } }
    },
    grid: { horizontal: true, vertical: true },
    legend: { title: "Country", position: "right" }
  })
  .createTitle({
    text: "Development Trajectories",
    subtitle: "Fertility and life expectancy, 1955–2005"
  });
```

Top-level trace는 표시된 호출과 같은
`createCanvas → createData → createLineMark → encodeX → encodeY → encodeColor → encodePathOrder → createGuides → createTitle`다.

## State와 topology

```javascript
layer.encoding.pathOrder = {
  field: "year",
  fieldType: "quantitative",
  order: "ascending"
};
```

- path order는 scale이나 guide를 만들지 않고, 각 series의 concrete vertex order만 결정한다.
- x/y가 반복되어도 raw eligible row 하나를 vertex 하나로 보존한다.
- color/group/stroke-dash로 나뉜 series마다 독립적으로 stable sort한다.
- 같은 order 값은 source row order로 안정화한다.
- Renderer는 semantic field/order를 읽지 않고 materialized path commands만 소비한다.
- `encodePathOrder`를 x/y보다 먼저 호출해도 incomplete semantic assignment만 저장하고, position이 완성되면 같은
  canonical materializer로 수렴한다.

## Lifecycle과 compatibility

- Field 또는 ascending/descending 재할당은 같은 semantic branch를 immutable하게 교체하고 path를 다시 만든다.
- `removePathOrder()`는 branch를 완전히 제거하고 기존 automatic independent-position sort로 복귀한다.
- Canvas, scale, row-preserving filter, mark filter, selection/highlight와 facet child replay 뒤에도 explicit order를
  다시 적용한다.
- ordinary Cartesian line과 ordinary ranged area가 지원된다.
- aggregate line, Polar line, density/error/regression 등 generated path와 non-row-preserving transform은 partial
  topology를 만들지 않고 명확한 validation error를 낸다.
- Missing, non-number 또는 non-finite order 값도 state 변경 전에 전체 action을 atomic하게 거부한다.

## Exact parity와 rendered evidence

승인된 primitive는 low-level semantic/graphic authoring으로 같은 concrete target을 독립적으로 만든다. Public
program과 다음 값이 모두 exact equality다.

- `semanticSpec`
- `graphicSpec`, attachment tree와 draw order
- renderer mock Canvas calls
- Node PNG decoded pixels와 file bytes

Artifact:

- `.artifacts/test/png/charts/path-order/gapminder-development-trajectories/year-ordered/primitive.png`
- `.artifacts/test/png/charts/path-order/gapminder-development-trajectories/year-ordered/user-facing.png`
- logical `760 × 500`, physical `1520 × 1000`
- 두 PNG SHA-256:
  `1d1603387becd3bea819166222a45c451588811aab2bd7eea67b9e61d85242a9`
- 3개 country path, Browser console/page error 없음

## Runtime, types, package와 docs

- Runtime registrar, `types/program.d.ts`, root type exports, Current action inventory와 generated catalog가
  `encodePathOrder`/`removePathOrder`를 같은 계약으로 노출한다.
- Installed-package Node/TypeScript consumer가 assign/remove를 직접 실행한다.
- Public encoding/series wiki, split action reference, search/LLM metadata와 runnable browser example이 같은 chain을
  사용한다.
- 기존 API와 automatic path ordering은 변경하지 않는 additive API다.
- Package budget은 책임별 source module 3개 추가를 반영해 350에서 360 entries로 명시적으로 조정했으며, 실제
  artifact는 353 entries다.
- Docs source와 assets만 갱신했으며 배포는 하지 않았다.

## 검증 증거

| 검증 | 결과 |
| --- | --- |
| `NPM_CONFIG_CACHE=/tmp/podo-npm-cache npm test` | 1,708/1,708 pass |
| `npm run test:contracts` | 122/122 pass |
| `npm run test:gates` | active Gate test 없음 |
| `npm run test:render` | 119/119 PNG pass, approved/review gallery pass |
| `npm run test:browser` | 35/35 pass |
| `npm run test:coverage` | lines 94.61%, branches 89.94%, functions 98.62%; 56 critical floors pass |
| `npm run test:docs` | 32/32 pass |
| generated contract/docs freshness checks | pass |
| `npm run package:check` | 353 entries, packed 313,058 bytes, pass |
| `npm run test:package` | Node/extension/PNG/path-order/TypeScript/tutorial/private-export checks pass |

Chromium과 localhost 검증은 macOS sandbox 밖에서 동일 repository commands를 재실행했다. 첫 sandbox 실패는
Mach port와 localhost 권한 거부였으며 implementation failure가 아니다.

## 승인 요청 범위

1. 위 public API와 semantic branch
2. stable per-series row-preserving order와 automatic-sort 복구 lifecycle
3. 명시된 compatibility/error boundary
4. Gapminder public chain, rendered PNG와 primitive/public exact parity
5. runtime/type/package/docs surface

승인 전에는 Step 5의 architecture closeout과 P7-Exit로 진행하지 않는다.
