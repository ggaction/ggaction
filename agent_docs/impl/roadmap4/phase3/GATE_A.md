# P3-A — Weighted theta

## 진행 상태

- [x] exact `encodeTheta` option과 semantic storage
- [x] strict non-negative finite weight validation과 atomic failure
- [x] count compatibility와 sum→count stale weight cleanup
- [x] independent grouped-sum oracle와 no-row-expansion invariant
- [x] selection/highlight compatible sector member grain
- [x] primitive/public exact parity
- [x] Browser Canvas와 2x Node PNG
- [x] public type, Current contract, docs와 generated references
- [x] full tests, coverage와 packed-package consumer
- [x] 사용자 승인

Gate 상태: `approved` (2026-07-20)

구현 checkpoint: `c4f0fd4` (`origin/main`)

## 승인할 public call chain

```javascript
const populationRows = gapminder.filter(row => row.year === 2005);

const program = chart()
  .createCanvas({
    width: 680,
    height: 520,
    margin: { top: 65, right: 200, bottom: 55, left: 55 }
  })
  .createData({ values: populationRows })
  .createArcMark({ innerRadius: 0.5, padAngle: 1.25, opacity: 0.96 })
  .encodeTheta({
    field: "cluster",
    fieldType: "nominal",
    aggregate: "sum",
    weight: "pop",
    scale: { domain: [0, 1, 2, 3, 4, 5] }
  })
  .encodeColor({
    field: "cluster",
    fieldType: "nominal",
    scale: {
      domain: [0, 1, 2, 3, 4, 5],
      range: ["#4c78a8", "#f58518", "#e45756", "#72b7b2", "#54a24b", "#eeca3b"]
    }
  })
  .createGuides({
    axes: false,
    grid: false,
    legend: { position: "right", title: "Cluster" }
  });
```

Stored theta semantic은 다음과 같다.

```javascript
{
  field: "cluster",
  fieldType: "nominal",
  aggregate: "sum",
  weight: "pop",
  scale: "theta"
}
```

Category order는 scale domain을 따르고, 각 sweep은 해당 category의 `pop` 합 / 전체 `pop` 합이다.
마지막 nonzero sector는 floating seam 없이 exact range end에서 닫힌다. Source dataset은 62개 2005 row를
그대로 보존하며 6개 final sector가 각 source member set을 소유한다.

## 검증 증거

- Focused weighted theta / Polar arc / artifact / docs: 63/63 pass
- Full suite: 1608/1608 pass
- Coverage: 94.93% lines, 90.33% branches, 98.59% functions; critical floors 55/55
- Browser Canvas: 30/30 pass, weighted donut 680×520 logical Canvas와 6 paths
- Node render/gallery: 114/114 pass, Roadmap 4 primitive/public pair exact pixel equality
- Node PNG: 1360×1040 physical pixels at 2x
- Package artifact: 327 entries, 284,234 packed bytes, 1,321,600 unpacked bytes
- Installed tarball consumer SHA-256: `7dbe0246d0a929060db1f2065c9f8d40bcf0a54d126ceaea83003c296969a52e`
- Docs source/generation: 27/27 pass; local built-doc verification은 installed Jekyll executable 부재로
  실행하지 못했으며 source link, image, signature, capability와 LLM generation checks는 통과했다.

## 호환성과 다음 경계

- `aggregate: "sum"`과 `weight`는 additive option이다. 기존 count/radial arc와 renderer primitive는 유지된다.
- Weight는 arc theta에서만 허용되며 point/line/radius에 전달하면 명시 오류다.
- Invalid weight는 state와 trace 생성 전에 실패한다.
- P3-B field-driven stroke width는 이 Gate 승인 전까지 구현하지 않는다.

2026-07-20 사용자 승인으로 P3-B field-driven stroke width 구현이 열렸다.
