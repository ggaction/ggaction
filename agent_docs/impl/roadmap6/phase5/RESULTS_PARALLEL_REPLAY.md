# Phase 5 W1 A3 선행 수정 — Parallel dimension 재계산

기준 `816ec99c`에서 [#84](https://github.com/ggaction/ggaction/issues/84)를 재현했다. Dimension을 a/b/c에서 c/b/a로 바꾸면 semantic assignment와 선은 바뀌지만 axis title은 a/b/c였다. Dimension 추가·삭제도 기존 축 개수와 scale dependency 목록을 갱신하지 않았다.

`encodeParallelCoordinates`가 기존 `applyLayerDataRematerialization`을 사용하게 하여 scales→marks→guides를 같은 최종 assignment에서 갱신한다. Parallel axis rematerializer는 달라진 semantic axis.scales와 runtime dependency config를 함께 갱신한다. 새 API·schema·renderer 분기는 없다. 이는 field 기반 축 편집을 구현하기 전에 필요한 기존 오류 수정이며 A3 전체 완료가 아니다.

## 증거

검증 source는 `test/unit/actions/guides/parallel-axis-reencoding.test.js`, 로그 prefix는 `.artifacts/roadmap6-authoring/phase5-parallel-reencode-`다.

| 검사 | 결과 |
| --- | --- |
| Focused + 기존 Parallel encoding | 8/8; title/order/domain/좌표/축 개수·binding, guide 한 번 재계산, 생략 축·다른 owner 보존 |
| 일반 검사 | 2,789/2,789, 실패·skip 0 |
| Coverage | lines 95.30%, branches 91.91%, functions 98.89%; critical floors 74개 통과 |
| 기존 Cars Parallel primitive/public PNG | 1/1 |
| Realistic targeted | guide-scale suite의 parallel 이름 검사 2/2; 전체 realistic suite 완료를 주장하지 않음 |
| 실제 설치 패키지 | Node/types/MCP/tutorial/bundle PASS; [package-parallel-reencode-results.json](package-parallel-reencode-results.json) |
| 같은 tarball Chromium | 1/1; 재정렬한 Parallel Canvas·title·label 확인 |
| 문서 | generation·일반 docs 검사 통과, built link/asset 125 pages PASS |

2개 focused literal: 첫 재정렬 축 domain [100,200], 첫 label text "100"·y=330. 600×400/margin70의 axis x는 [70,300,530]이다. 세 축의 최저 측정값에 해당하는 첫 선의 y는 모두 330이다. Dimension을 4개로 늘렸다 2개로 줄이고 Canvas width700으로 바꾸면 title x는 [70,630]이며 stale axis item이 없다.

최초 테스트 초안은 reencoding에 다른 explicit scale domain을 함께 지정하여 기존 scale-definition conflict에 걸렸다. 최종 검사는 API의 유효한 automatic domain을 사용하고 실제 [100,200]/[10,20]/[0,2] domain을 명시적으로 단언한다. 다른 domain으로 scale을 편집하는 동작과 dimension 순서 교체를 혼합하지 않았다.

Package SHA-256 `8026b90b83c3cfd47a592ec982409479884c3538df5e9ad4fb529d3393c251d1`, 444 entries, packed 498,040 / unpacked 2,385,339 bytes. Full/Basic/SVG gzip 247,342 / 137,356 / 6,437 bytes로 기존 한도 안이다. 0.0.12 개발 artifact이며 0.0.13 릴리즈는 전체 로드맵 완료 뒤 남아 있다.

## 후속

Parallel field별 style/format/tick 정책의 persistent owner와 public 생성·편집·제거·복원을 구현한다. 이번 수정은 그 경로가 의존하는 reencoding 재계산을 바로잡았다. W1/D07/F17 전체를 닫지 않는다.
