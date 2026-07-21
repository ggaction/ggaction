# P12-B — Public label-layout action과 lifecycle 검토

## 상태

- Gate: `P12-B`
- 상태: `ready-for-review`
- Production action checkpoint: `b3198a3` (`implement collision-aware label layout`)
- Public visual checkpoint: `d62061b` (`add label layout public visual`)
- Remote: `origin/main`
- 승인으로 해제: stable capability migration, architecture/current coverage closeout와 P12-Exit

## 검토할 public flow

```javascript
chart()
  .createCanvas({
    width: 760,
    height: 520,
    margin: { top: 88, right: 38, bottom: 72, left: 76 }
  })
  .createData({ id: "countries2005", values: rows })
  .createPointMark({
    id: "countries",
    data: "countries2005",
    fill: "#2563eb",
    stroke: "#ffffff",
    strokeWidth: 0.8
  })
  .encodeX({
    target: "countries",
    field: "fertility",
    fieldType: "quantitative",
    scale: { domain: [1.2, 2.15], zero: false }
  })
  .encodeY({
    target: "countries",
    field: "life_expect",
    fieldType: "quantitative",
    scale: { domain: [77.2, 83], zero: false }
  })
  .createTextMark({
    id: "countryLabels",
    fill: "#0f172a",
    fontSize: 11,
    align: "left",
    baseline: "middle",
    dx: 7
  })
  .encodeText({ target: "countryLabels", field: "country" })
  .layoutLabels({
    target: "countryLabels",
    axis: "both",
    padding: 3,
    maxDisplacement: 64,
    bounds: "plot",
    leader: { stroke: "#94a3b8", strokeWidth: 0.8, opacity: 0.9 }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Fertility" } },
      y: { title: { text: "Life expectancy" } }
    },
    grid: { horizontal: true, vertical: true },
    legend: false
  })
  .createTitle({
    text: "Fertility and Life Expectancy",
    subtitle: "Selected countries in 2005"
  });
```

Executable owner는 `test/gates/gapminder-country-labels/public.program.js`, displayed owner는 같은 디렉터리의
`manifest.js`다. P12-A primitive와 색을 정확히 맞추기 위해 text fill을 call chain에 명시했으며 화면과 배치 목표는
P12-A와 동일하다.

## 구현된 hierarchy와 ownership

```text
layoutLabels
└─ materializeLabelLayout
   ├─ rematerializeTextMark(replayLayout = false)
   ├─ editGraphics(countryLabels x/y)
   ├─ create/editGraphics(countryLabels-label-leaders)  enabled and non-empty only
   └─ store latest resolution summary

removeLabelLayout
├─ remove materializationConfigs.labelLayouts[countryLabels]
├─ editGraphics(countryLabels-label-leaders, remove = true)  when present
└─ rematerializeTextMark
```

- Semantic text, encodings와 source relation은 layout 전후 동일하다.
- `materializationConfigs.labelLayouts[target]`가 requested policy, generated leader ID와 latest resolution summary를
  소유한다.
- Final positions와 ordinary line leaders만 `graphicSpec`에 저장된다. Renderer branch는 추가하지 않았다.
- Text typography/content, source filtering, scale와 Canvas edits는 semantic base text를 갱신한 뒤 layout을 정확히
  한 번 replay한다.
- Repeated assignment는 complete policy를 교체한다. Removal과 owner mark removal은 policy/leader를 함께 정리한다.

## Parameter와 failure evidence

- `axis`: x, y, both action behavior와 deterministic candidate order
- `bounds`: plot과 Canvas concrete bounds
- `leader`: false와 appearance object; non-empty displaced leaders만 materialize
- `padding`, `maxDisplacement`: non-negative finite validation과 Euclidean bound
- Target: current complete, unique complete, explicit complete; incomplete/ambiguous/unknown reject atomically
- Impossible layout: stable minimum-penalty result와 `overlap`/`bounds` warning; Canvas/margin/font를 자동 변경하지 않음
- Equivalent final font/Canvas/scale/layout options authored in different orders converge to the same graphic/config state

## Primitive/public parity와 visual

- Primitive/public `semanticSpec`, `graphicSpec`, recursive graphic tree, draw order와 mock Canvas calls exact equality
- Primitive/public PNG SHA-256:
  `c0741e4e44cf3ea95c29e568b01e08d04e78c185ff09969d410ad847ca77d1e5`
- Artifact:
  `.artifacts/test/png/review/gapminder-country-labels/collision-aware/user-facing.png`
- Logical/physical: `760×520` / `1520×1040`
- 18 labels, initial overlap 4쌍 → final 0쌍, 4 displaced labels, 3 leaders, maximum displacement 약
  `15.2971px`
- Draw order: grid → leaders → points → labels → axes → title

## 검증 증거

| 검증 | 결과 |
| --- | --- |
| Focused grammar/action/Gate | `17/17` pass |
| Full normal suite | `1,825/1,825` pass |
| Full Node PNG suite | `124/124` pass |
| Approved artifact gallery | `122` variants verified |
| Active-review gallery | `1` primitive/public variant verified, desktop/mobile |
| Package/source/type/docs contracts | pass |

Full gallery browser verification은 macOS Mach IPC sandbox 제약으로 권한 확장 환경에서 동일 생성물에 대해 통과했다.

## 호환성과 남은 작업

- API는 additive이며 기존 text call chain은 layout을 명시하지 않으면 이전 concrete positions를 그대로 유지한다.
- Public declarations, Current action contract, readable docs와 generated reference는 runtime과 동기화했다.
- 새 source를 포함한 package bounded-size ceiling은 `1,600,000`에서 `1,625,000` bytes로만 조정했고 actual artifact는
  새 ceiling을 통과한다.
- P12-B 승인 후 active Gate slice를 stable label-layout capability로 이동하고 Current coverage를 complete로 바꾸며,
  architecture/roadmap closeout과 P12-Exit를 준비한다.

## 승인 요청 범위

1. `layoutLabels()` / `removeLabelLayout()` public lifecycle와 trace hierarchy
2. base-first, exactly-once replay와 state/graphic ownership
3. parameter/failure/ambiguity 정책과 order convergence
4. primitive/public exact parity와 Gapminder rendered visual

