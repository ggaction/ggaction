# Roadmap 6 Phase 9 W2 — Raincloud composite

## 검증 ref

- Source/remote ref: `70c9fe8aff94d06b555b03f8dd14d869b9c6da5f`
- Branch: `origin/codex/roadmap6-hierarchical-actions`

## Public facade와 owner

- `createRaincloudPlot`은 같은 canonical source/category/value에서 half Violin cloud, box 또는 interval summary,
  Strip 또는 Beeswarm raw points를 만든다. 기본값은 vertical, `before`, density, box, Beeswarm이며 세 component 중
  하나 이상을 명시적으로 유지해야 한다.
- Stable child IDs는 `${id}Cloud`, `${id}Summary`, `${id}Points`다. Parent config는 실제 존재하는 child closure와
  source/statistical role recipe만 소유하고 각 child의 appearance·statistics·packing은 기존 lower action owner에 남긴다.
- `editRaincloudPlot`은 source/category/value/orientation/side/component mode/color를 immutable하게 검증한 뒤 기존
  child closure를 제거하고 같은 IDs로 원자 재작성한다. Role scale edit는 이전 consumer를 제거한 뒤 같은 scale
  resource에 적용해 scale type/options 변경도 authoring order와 무관하게 수렴한다.
- Public runtime/declaration/card/docs/MCP/package surface는 Full entry에만 두 action을 공개한다. Basic entry는 runtime과
  strict TypeScript에서 모두 거부한다.

## Slot, half density와 replay

- Violin density placement에 explicit `side`를 추가했다. Vertical의 `before/after`는 left/right, horizontal은 top/bottom으로
  투영되며 `createViolinPlot`과 `editViolinPlot`이 같은 placement recipe를 저장하고 재생한다.
- Summary와 points에는 category band의 0.22에 해당하는 반대편 offset을 저장한다. Bar/Rule/Point materializer가
  resolved band width에서 pixel displacement를 다시 계산하므로 Canvas resize, source/scale edit와 rematerialization 뒤에도
  slot이 누적 이동하지 않는다.
- Raw point 내부 spread는 category band 0.12로 제한한다. Strip은 jitter, Beeswarm은 deterministic packing owner를
  재사용하며 서로의 옵션을 섞는 호출은 이전 program과 trace를 바꾸지 않고 거부한다.
- Interval summary의 point owner가 interval/error-bar child를 기록하지 않아 제거 시 rule/cap이 남던 기존 결함을
  `intervalPlot.intervalId` ownership으로 교정했다. Violin materialized density data도 owner 제거 시 함께 정리한다.

## Primitive와 시각 동등성

- `examples/raincloud-plot`은 세 category의 shared-source vertical box+Beeswarm Raincloud를 실행 가능한 public 예제로
  제공한다. 생성된 문서 이미지와 thumbnail은 half cloud를 category slot 한쪽에, summary/raw points를 반대쪽에 둔다.
- `test/charts/raincloud-plot`의 primitive chain은 기존 Violin/Box/Beeswarm과 category slot owner를 직접 조합한다.
  Public facade와 semantic state, concrete graphic tree/order, Canvas calls와 decoded PNG pixels가 정확히 같다.
- Realistic hierarchy matrix는 5개 데이터셋에서 vertical/horizontal, before/after, box/interval, strip/beeswarm,
  component disable, density/summary/point options와 create/edit를 포함한 24개 Raincloud profile을 실행한다.

## 검증 결과

| 범위 | 결과 |
| --- | --- |
| focused Raincloud/Violin runtime and types | pass |
| unit | 2,266/2,266 pass |
| contracts | 320/320 pass |
| charts | 574/574 pass |
| docs | 47/47 pass |
| public browser examples | 70/70 pass |
| realistic corpus | 243/243 pass |
| coverage | 95.46% lines, 92.25% branches, 98.92% functions; 88 critical floors pass |
| generated artifacts | catalog/card/capabilities/action/signature/metadata/search/machine/example checks pass |
| package | 486 entries, 580,837 packed bytes, 2,801,939 unpacked bytes |
| installed browser gzip | Full 293,332 / Basic 151,747 / SVG 6,437 bytes |

Package에 Raincloud facade, slot materialization, types/cards/docs와 example assets가 추가되어 승인 범위에서 ceiling을
486 entries, 581,000/2,802,000 bytes로 조정했다. Browser gzip ceiling은 Full 294,000, Basic 153,000,
SVG 25,000 bytes다. Installed package SHA-256은
`45883978a8060f8c1713675669683f66e52a7848e214563cf8d8b1953def6462`다.

`docs:generate`, generated checks와 docs tests는 통과했다. 전체 `docs:verify`의 Jekyll 구간은 repository가 요구하는
Ruby 3.2.6 대신 host `/usr/bin/ruby` 2.6.10만 있어 실행하지 않았고, source/generated/browser 검증과 분리한
환경 제한은 W1 기록과 같다.

## 판정

F12는 implemented-verified다. Raincloud는 새 renderer나 숨은 chart compiler 없이 기존 Density/Violin,
Box/Interval, Strip/Beeswarm과 scale/guide action을 조합한다. Parent는 shared source와 role/slot recipe 및 child
closure만 소유하므로 high-level 생성·편집과 low-level child style 편집이 같은 public hierarchy에서 이어진다.
