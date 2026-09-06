# Roadmap 6 Phase 9 W1 — Deterministic point packing and Beeswarm

## 검증 ref

- Source/remote ref: `c818f8f407288c18c288e31492f66b261444c6b6`
- Branch: `origin/codex/roadmap6-hierarchical-actions`

## Point packing owner

- `packPoints`는 Cartesian Point의 nominal/ordinal channel만 이동하고 반대편 quantitative/temporal coordinate는
  그대로 유지한다. Category slot, plot bounds, `maxOffset`, final shape/area/rotation/stroke bounds와 padding을 함께
  적용하며 renderer가 아닌 materialization 단계에서 concrete coordinates를 만든다.
- `point-pack-greedy-v1`은 fixed measure coordinate와 canonical identity 순으로 배치하고 실제 glyph rectangle의
  교차를 독립적으로 검사한다. 명시적 `key`는 materialized row마다 unique여야 하며 같은 keyed rows를 재정렬해도
  같은 identity별 결과를 만든다.
- 기본 overflow는 immutable error다. `overflow: "overlap"`은 충돌 수, unresolved item/count를 resolution에 남기고
  가장 적은 충돌 후보를 선택한다. Packing과 jitter는 한 Point에서 배타적이며 `removePointPacking`은 현재 semantic
  scale positions에서 다시 materialize해 displacement 누적 없이 base 위치를 복원한다.
- Source/filter/scale/Canvas와 radius/shape/rotation/stroke 편집은 저장한 policy를 처음부터 replay한다. Mark 제거는
  해당 packing config도 함께 제거한다.

## Beeswarm aggregate와 hierarchy

- `createBeeswarmPlot`은 `createStripPlot`으로 ordinary Point·position·appearance·guide owners를 만든 뒤 정확히 하나의
  categorical channel을 찾아 `packPoints`를 호출한다. Caller가 scale id를 생략하면 `${id}X`와 `${id}Y`를 소유해
  기존 global channel scale과 충돌하지 않으며, 명시적 scale id는 보존한다.
- `packing: false`는 base Strip을 그대로 만들고 나머지 packing options는 lower owner에 전달한다. `x`/`y` 중 하나는
  category, 다른 하나는 measure여야 하며 malformed scale/options와 unsupported coordinate는 이전 program과 trace를
  바꾸지 않고 거부한다.
- Full entry에만 세 action을 공개하고 Basic entry에서는 제외했다. Public types, action cards, intent resolver, reference,
  package consumer와 MCP-visible metadata가 같은 경계를 사용한다.
- `examples/beeswarm-plot`과 `test/charts/beeswarm-plot`은 동일한 values/dimensions에서 primitive Strip+packing chain과
  facade의 semantic/graphic hierarchy, Canvas call과 decoded PNG 결과를 비교한다. 공개 브라우저 registry에도 같은
  executable example을 등록했다.

## 검증 결과

| 범위 | 결과 |
| --- | --- |
| focused packing/Beeswarm runtime and types | pass |
| unit | 2,258/2,258 pass |
| contracts | 319/319 pass |
| charts | 572/572 pass |
| docs | 47/47 pass |
| public browser examples | 70/70 pass |
| realistic corpus | 243/243 pass |
| coverage | 95.46% lines, 92.25% branches, 98.94% functions; 88 critical floors pass |
| generated artifacts | catalog/card/capabilities/action/signature/metadata/search/machine/example checks pass |
| package | 484 entries, 575,239 packed bytes, 2,774,552 unpacked bytes |
| installed browser gzip | Full 290,478 / Basic 151,515 / SVG 6,437 bytes |

Package에 packing grammar/action, Beeswarm facade, types/cards/docs와 예제 assets가 추가되어 승인 범위에서 ceiling을
484 entries, 580,000/2,780,000 bytes로 조정했다. 실제 browser 증가에 맞춰 gzip ceiling은 Full 292,000,
Basic 153,000, SVG 25,000 bytes다. Installed package SHA-256은
`41ce90a88b4ee71add798e13ae91855a3865889fd804e9537992f869b7dbe844`다.

`docs:generate`, generated checks와 docs tests는 통과했다. 전체 `docs:verify`의 Jekyll 구간은 repository가 요구하는
Ruby 3.2.6 대신 host `/usr/bin/ruby` 2.6.10만 있어 preflight에서 실행되지 않았다. Source/generated/browser
검증과 분리한 환경 제한이다.

## 판정

F09는 implemented-verified다. Packing은 Point의 semantic channel이나 renderer를 새로 만들지 않고 별도 layout
owner가 concrete displacement와 replay policy를 소유한다. Beeswarm은 이 lower owner와 기존 Strip hierarchy를
조합하므로 style·guide·selection lifecycle도 기존 공개 편집기를 그대로 따른다.
