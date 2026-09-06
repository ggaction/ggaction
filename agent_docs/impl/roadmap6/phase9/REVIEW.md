# Roadmap 6 Phase 9 X — Deterministic packing and Raincloud closeout

## 고정 결과

- 검증된 W2 source ref는 `70c9fe8aff94d06b555b03f8dd14d869b9c6da5f`이며
  `origin/codex/roadmap6-hierarchical-actions`에 push했다.
- [W1](RESULTS_W1_BEESWARM.md)은 deterministic Point packing과 `createBeeswarmPlot`을, [W2](RESULTS_W2_RAINCLOUD.md)는
  shared-source/slot `createRaincloudPlot`과 atomic `editRaincloudPlot`을 구현했다.
- Packing displacement와 Raincloud slot offset은 renderer가 아니라 replayable materialization owner가 계산한다.
  Complete facade는 ordinary public Point/Area/Bar/Rule, statistics, scale와 guide hierarchy를 그대로 사용한다.

## X 통합 감사

현재 action-card 선언의 user-facing action은 222개다. Generated lifecycle은 전부 scenario root에서 직접 호출하고
9,885 option paths, 14,261 coverage requirements를 declaration-derived inventory로 잠근다. Nested role-scale 계약은
144개 strict scale path와 543개 literal을 검증한다. Realistic suite는 TidyTuesday와 zoo corpus의 243개 통합 검증과
5개 데이터셋의 24개 Raincloud profile을 통과했다.

W1과 W2의 경계는 다음과 같다.

1. `packPoints`는 한 categorical coordinate만 이동하고 quantitative/temporal 값, identity order와 glyph bounds를
   보존한다. Resize/style/data/scale edit는 같은 policy를 처음부터 replay하며 제거는 base position을 복원한다.
2. `createBeeswarmPlot`은 Strip의 ordinary Point와 guide owner 위에 packing을 추가한다. Explicit scale sharing은
   보존하고 생략된 scale IDs는 facade owner에 scope된다.
3. Raincloud는 half density, summary와 raw sample을 같은 source/category/value에 묶고 stable child IDs를 제공한다.
   Category-relative offset은 orientation과 scale 변화 뒤 다시 계산하며 parent edit는 child closure만 원자 교체한다.

## 누적 검증

| 범위 | 실제 결과 |
| --- | --- |
| unit | 2,266/2,266 pass |
| contracts | 320/320 pass |
| charts | 574/574 pass |
| docs | 47/47 pass |
| browser examples | 70/70 pass |
| realistic corpus | 243/243 pass |
| coverage | 95.46% lines, 92.25% branches, 98.92% functions; 88 critical floors pass |
| package | 486 entries, packed 580,837, unpacked 2,801,939 bytes |
| installed gzip | Full 293,332 / Basic 151,747 / SVG 6,437 bytes |

Installed artifact SHA-256은
`45883978a8060f8c1713675669683f66e52a7848e214563cf8d8b1953def6462`다. W1과 같은 host Ruby 2.6.10 제한 때문에
Ruby 3.2.6 Jekyll 구간은 실행하지 않았고 generated docs, docs contracts와 public browser examples는 통과했다.

## 종료 판정

- F09와 F12는 runtime, strict declaration, Current/card/docs, primitive/public renderer와 realistic lifecycle 증거를
  갖춘 implemented-verified 상태다.
- Phase 9에 숨은 Planned 또는 deferred 구현은 없다.
- [전체 실행 승인](../APPROVAL.md)이 A/V/X에 적용되므로 R6-P9-X를 approved로 닫고 Phase 10으로 이동한다.
