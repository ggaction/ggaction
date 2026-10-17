# 최종 공개 옵션 inventory 검증

## 범위와 입력

- CI realistic shard6의 `/tmp/ggaction-217-realistic-6.log`에서 bounded inventory의 첫 assertion이
  `2381 !== 2377`로 실패했다. 첫 실패 뒤의 항목도 별도로 모두 계산했다.
- 현재 root 입력 `0b60c81f`를 사용했다. 최종 facade 선언은 `d20df1c0`이며 이 작업은
  `generated-scenario-feature-coverage.test.js`와 이 증거 문서만 수정한다.
  이전 문서 검증의 로컬 생성물은 전용 stash `1b5cf77a5a93d3ff30f932675e626376a328a76a`에 보존했다.
- 기존 assertion과 일치하던 `b6b2e65e`의 types 전체와 action cards를 `/tmp`로 복사했다.
  이전 선언과 현재 선언 모두 **현재 동일한** `buildPublicOptionInventory`로 검사했다.
  당시 inventory parser를 복구하거나 완화하지 않았다. 실제로 b6 이후 parser 변경은 없다.
- 이전 13개 inventory count가 전부 기존 assertion과 정확히 일치했다. 따라서 변경량은
  실제 public 선언 차이에서 계산되었으며 외부 임시 파일의 타입 해석 차이를 count 변경으로
  오인한 결과가 아니다. 모든 기존 경로의 required/evidence/depth/traceAlias/exclusion은 같다.

## 전체 측정

| 항목 | 기존 | 최종 | 차이 |
| --- | ---: | ---: | ---: |
| Public actions | 277 | 277 | 0 |
| Top-level option paths | 2377 | 2381 | +4 |
| Nested option paths | 14524 | 14566 | +42 |
| All option paths | 16901 | 16947 | +46 |
| Required option paths | 12248 | 12294 | +46 |
| Excluded option paths | 4653 | 4653 | 0 |
| Top-level categorical paths | 802 | 805 | +3 |
| Top-level literal values | 3158 | 3163 | +5 |
| Literal families | 177 | 180 | +3 |
| Path literal requirements | 8886 | 8868 | −18 |
| Family literal requirements | 319 | 319 | 0 |
| Path diversity requirements | 369 | 369 | 0 |
| Ledger requirements, no renderer extras | 21734 | 21762 | +28 |

**추가 경로 46개, 삭제 경로 0개**다. Required 경로도 같은 46개가 늘었다.
기존 redacted-array 4653개와 실제 부모 옵션을 요구하는 대체 정책은 바뀌지 않았다.

## 경로 추가의 의미

- #176의 `clipHeight`가 34개 입력 경로에 추가됐다. 최상위4개는 `createLegend`, `editLegend`,
  `editLegendSymbols`, `editLegendBlock`이다. `createGuides.legend`와 `editFacetGuides.legend`의
  중첩2개, 25개 chart facade와 facet/facetGrid/repeat의 `guides.legend` 중첩28개가 나머지다.
  이것이 top-level +4, nested +30을 설명한다. 편집3개의 `"auto"` reset 값도 유지한다.
  실제 point-bearing recipe의 sample window라는 승인 계약이며 일반 경로 stroke clipping으로
  확장하거나 새 runtime 동작을 넣은 것이 아니다.
- #205 color-size point symbol의 `opacity`가 직접 생성·편집·집계·부모와 유효한 point facade에
  12개 중첩 경로로 추가됐다. Scatter/Regression/Strip/Beeswarm 네 facade, createLegend/editLegend/
  editLegendSymbols 세 직접 액션, createGuides/editFacetGuides 두 집계, facet/facetGrid/repeat 세 부모다.
  기존 `editLegendBlock.symbol.opacity` 경로는 그 전부터 있던 유효 경로로 그대로 유지한다.
- 테스트는 전체 clipHeight 34개와 전체 flat symbol.opacity 13개를 정확한 현재 경로 집합으로
  확인한다. 기존 path를 감추거나 exclusion을 추가해서 숫자를 맞추지 않는다.

## 선택값 변경의 의미

총 literal 요구는 14개 추가, 32개 정정으로 순18개 줄었다.

- #205 `"color-size"` 11개를 추가했다. 위 네 point facade, createLegend/editLegend/createGuides,
  editFacetGuides와 facet/facetGrid/repeat다. 같은 quantitative field와 numeric endpoint domain을
  가진 Cartesian circle point owner를 실제 만들 수 있는 계약이다.
- #176 편집 액션3개의 `clipHeight: "auto"`를 추가했다.
- `"size-shape"` 19개는 같은 두 encoded point field를 만들 수 없는 facade의 잘못된 타입 광고였다.
  Area/Bar/Density/Dot/Dumbbell/ECDF/Heatmap/Histogram/Interval/Line/Lollipop/Parallel/Pie/
  PolarLine/Radar/RadialBar/Rose/Text/Violin의 해당 combine은 `"separate"`를 유지한다.
  Point를 장식으로 가지더라도 size/shape field 입력이 없는 Interval/endpoint는 같은 조건이다.
- `titlePosition: "bottom"` 13개는 categorical-only Area/Density/ECDF/Histogram/Line/Parallel/Pie/
  PolarLine/Radar/RadialBar/Raincloud/Rose/Violin의 잘못된 gradient 광고였다. `"top" | "left"`는
  유지한다. Continuous gradient를 실제 만들 수 있는 Heatmap/point facade와 unit/parent의 bottom은
  그대로 남는다. #200의 bottom title 계약을 축소하지 않는다.
- PolarScatter와 points-enabled Raincloud의 categorical size-shape는 두 값의 기존 닫힌 집합으로
  남는다. Cartesian quantitative color-size를 그 두 facade에 추가하지 않는다. 실제 point field를
  지원하는 네 facade와 unit/parent는 세 combine 값을 모두 요구한다.
- 새 closed literal family는 separate-only, left/top, 세 combine 값의 세 집합이다. 기존 family는
  하나도 삭제하지 않았다. Closed color scale 9개 전수 literal 정책, 다른 큰 family의 다양성 정책,
  배열 정책 및 occurrence/dataset 기준을 변경하지 않았다.

이 판정은 기존 승인 #171/#176/#200/#205와 최종 Current `LEGEND_AND_TITLE.md` 및 선언을 따른다.
`facade-legend-combination-types.test.js`의 모든 facade 허용·거부 타입 검사와
`facade-legend-owner-capabilities.test.js`의 대표 실제 원자적 거부/continuous gradient 허용,
기존 실제 point 조합 witness가 같은 적용 경계를 검증한다. 이 작업에서 새로운 API 선택은 없다.

## 검증과 재현

- 전체 `generated-scenario-feature-coverage.test.js`: **7/7 PASS**,13.16초.
  기존 trace-backed evidence, 배열 parent, distribution 최소치, 명시 waiver, transitive/중복/거짓
  claim 거부, 원본 lineage와 concentration 검사를 그대로 실행했다.
- Facade closed type/runtime 및 union-array 회귀: **8/8 PASS**.
- 첫 보강 assertion은 기존 editLegendBlock의 opacity 경로를 목록에서 빠뜨려6/7이었다.
  이 기존 경로를 보존하도록 현재 전체 목록을 정정한 뒤7/7을 확인했다. 실제 API나 parser를
  줄이지 않았다. CI 원본 실패와 이 중간 실패 로그는 그대로 보존한다.
- 제품 source/runtime, types, parser, ledger, engine, palette fixtures, 정책과 threshold는 수정하지 않았다.
  이 체크포인트를 최종 tag의 전체 CI 성공으로 대신하지 않는다.

로컬 원시 증거:

- `/tmp/ggaction-inventory-release-audit.mjs`: 이전/현재 선언의 정식 inventory와 정확한 diff 계산.
- `/tmp/ggaction-inventory-release-audit-baseline.json`: 이전 inventory 전체.
- `/tmp/ggaction-inventory-release-audit-current.json`: 최종 inventory 전체.
- `/tmp/ggaction-inventory-release-audit-diff.json`: 모든 추가 경로·선택값 변경과 before/after 원본.
- `/tmp/ggaction-inventory-release-final-test.log`: 첫 보강 assertion의 기존 경로 누락 실패.
- `/tmp/ggaction-inventory-release-final-test-second.log`: 최종7개 테스트 성공.
- `/tmp/ggaction-inventory-release-closed-contracts.log`: 연관8개 테스트 성공.

Diff JSON SHA256:
`25e6b1e5d4fad6e5a6266499fa31dd2a3909752c8952cfc589ac18ef0905fbdf`.
원격 영구 artifact가 아니라 로컬 원본 보존 기록이다. 동일 source에서 다음으로 검사할 수 있다.

```bash
node --max-old-space-size=512 --test test/contracts/generated-scenario-feature-coverage.test.js
node --test test/contracts/facade-legend-combination-types.test.js test/contracts/facade-legend-owner-capabilities.test.js test/contracts/option-inventory-union-arrays.test.js
```
