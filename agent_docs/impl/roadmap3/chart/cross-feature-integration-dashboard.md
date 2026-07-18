# Cross-feature Integration Dashboard

## 목적

Roadmap 3의 Polar chart, nested concat, direct-source facet과 immutable child replacement를 한 concrete
graphic tree에서 검증한다. Cars donut과 Nightingale rose로 첫 nested row를 만들고, 별도 Fashion t-SNE Polar
point program으로 두 번째 slot을 교체한 뒤 revised nested program을 outer dashboard의 같은 slot에 다시 넣는다.
Bottom row는 Cars Origin facet이며 shared scale/legend snapshot을 그대로 유지한다.

## Target user-facing composition flow

```javascript
const donut = createCarsOriginDonut(cars);
const rose = createNightingaleRoseChart(nightingale);
const fashionPolar = createFashionTsnePolarPoints(fashionRows);
const facet = createCarsOriginScatterplotFacet(cars);

const polarPair = hconcat({
  id: "polarPair",
  programs: [
    { id: "donut", program: donut },
    { id: "detail", program: rose }
  ],
  gap: 20,
  align: "center"
});

const dashboard = vconcat({
  id: "integrationDashboard",
  programs: [
    { id: "polarPair", program: polarPair },
    { id: "facet", program: facet }
  ],
  gap: 24,
  align: "center"
});

const revisedPolarPair = polarPair.replaceCompositionChild({
  target: "detail",
  program: fashionPolar
});

const revisedDashboard = dashboard.replaceCompositionChild({
  target: "polarPair",
  program: revisedPolarPair
});
```

## Immutable replacement contract

- Child edit는 이미 만들어진 parent를 몰래 mutate하지 않는다.
- Revised child는 direct parent의 stable slot에 explicit `replaceCompositionChild`로 넣는다.
- Nested parent 자체가 바뀌면 그 revised nested program을 다음 ancestor slot에 explicit하게 넣는다.
- 각 replacement는 해당 parent의 Canvas size, child placement와 complete namespaced graphic snapshot을 다시 만든다.
- Earlier leaf, inner composition과 outer composition은 identity와 graphic tree를 그대로 유지한다.

## Facet support/error boundary

- Cartesian direct-source facet의 shared/independent scales, outer axes와 shared legend는 Current behavior다.
- Polar source에 직접 `.facet(...)`을 호출하는 조합은 현재 unsupported다. Partial child나 빈 Canvas를 만들지 않고
  state transition 전에 명확한 validation error를 낸다.
