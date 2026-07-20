# P7-A — Explicit path order와 Gapminder trajectory 검토

## 상태

- Gate: `P7-A`
- 상태: `approved`
- 승인: 2026-07-20 사용자 명시 승인
- Review source checkpoint: `62d73b7` (`add ordered path primitive gate`)
- Remote: `origin/main`
- 승인 전 차단: public `encodePathOrder`/`removePathOrder`, declarations, public docs와 action inventory

이 Gate는 path topology를 정하는 exact semantic contract와 primitive 결과를 승인했다. 아직 runtime method,
TypeScript declaration과 Current action inventory에는 public action이 없다.

## 승인 대상

### 1. Exact public API 후보

```typescript
interface PathOrderEncodingOptions {
  target?: string;
  field: string;
  fieldType?: "quantitative";
  order?: "ascending" | "descending";
}

encodePathOrder(options: PathOrderEncodingOptions): ChartProgram;
removePathOrder(options?: { target?: string }): ChartProgram;
```

- `field`만 필수다. `target`은 current compatible path, 그다음 unique compatible path에서만 추론한다.
- `fieldType` 기본은 `"quantitative"`, `order` 기본은 `"ascending"`이다.
- 같은 order 값은 각 series 안의 source row order로 안정화한다.
- `removePathOrder`는 explicit branch를 제거하고 기존 automatic independent-position sort로 복귀한다.

### 2. Semantic owner와 topology

```javascript
layer.encoding.pathOrder = {
  field: "year",
  fieldType: "quantitative",
  order: "ascending"
};
```

- x/y는 위치를 소유하고 `pathOrder`는 vertex 연결 순서만 소유한다.
- Scale이나 guide를 만들지 않는다. Renderer는 final path commands만 읽는다.
- Color/group/strokeDash가 만든 각 series를 독립적으로 정렬한다.
- Repeated x/y와 order tie를 합치지 않고 eligible source row를 모두 보존한다.
- Missing, non-number 또는 non-finite order 값은 부분 materialization 없이 action 전체를 거부한다.
- Reassignment와 ascending/descending 변경은 같은 branch를 교체하고 path를 다시 materialize한다.

### 3. 첫 compatibility boundary

- 지원: raw-row Cartesian direct quantitative/temporal line, ordinary ranged area
- 거부: aggregate line, density/error/regression 같은 generated path, Polar line
- Explicit order가 없으면 기존 automatic independent-position sort를 바꾸지 않는다.
- Non-monotonic trajectory의 대표 계약은 `curve: "linear"`다.

## 목표 public chain

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

## Primitive와 oracle evidence

- Primitive: [`test/gates/gapminder-development-trajectories/primitive.program.js`](../../../../test/gates/gapminder-development-trajectories/primitive.program.js)
- Independent oracle: [`test/oracles/path-order.js`](../../../../test/oracles/path-order.js)
- Fixture와 target chain: [`test/gates/gapminder-development-trajectories/manifest.js`](../../../../test/gates/gapminder-development-trajectories/manifest.js)
- Source row는 의도적으로 섞여 있으며 oracle은 production source를 import하지 않는다.
- China, South Africa와 United States 각 11개 관측, 총 33개 row를 보존한다.
- Primitive는 미래 action을 흉내 내지 않는다. Existing scale/guide authoring 뒤 independent oracle이 만든 concrete
  commands를 low-level `editGraphics`로 적용한다.
- Public action이 runtime/types/action index와 semantic state에 아직 없다는 부재도 회귀 테스트로 고정했다.

## Rendered evidence

- Node PNG: `.artifacts/test/png/review/gapminder-development-trajectories/year-ordered/primitive.png`
- PNG SHA-256: `1d1603387becd3bea819166222a45c451588811aab2bd7eea67b9e61d85242a9`
- Browser page: `test/gates/gapminder-development-trajectories/browser.html`
- Browser state: HTTP 200, logical `760 × 500`, physical Canvas `1520 × 1000`, path 3개,
  console/page error 없음

## 검증 증거

| 검증 | 결과 |
| --- | --- |
| `npm run test:gates` | 7/7 pass |
| `npm test` | 1,697/1,697 pass |
| render suite | 119/119 pass |
| artifact galleries | approved 117 variants, review 1 variant; browser verification pass |
| `npm run test:coverage` | lines 94.63%, branches 89.92%, functions 98.61%; critical floors 56/56 pass |
| Gate Browser page | headless Chromium pass, console/page error 0 |

## 승인 질문

다음을 하나의 P7-A 계약으로 승인하는가?

1. `encodePathOrder`/`removePathOrder`의 exact API와 semantic storage
2. Per-series stable order, repeated-row 보존과 invalid-value atomic rejection
3. 첫 compatibility boundary와 explicit order가 없을 때의 기존 behavior 보존
4. Gapminder trajectory primitive의 데이터 선택, 배치와 시각 결과
