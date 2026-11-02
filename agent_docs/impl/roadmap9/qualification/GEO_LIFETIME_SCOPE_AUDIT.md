# Geo 수명 기준과 다음 병목의 읽기 전용 감사

## 진행 상태

- [x] 원 qualification/AT/Geo/animation 계약과 현재 canonical 도구 대조
- [x] 원 100cycle 재현 경로와 Geo 소형 반복·큰 기능 검증 구분
- [x] 현재 source의 1k 한 프레임 호출/등록 계수와 다음 조사 위치 기록
- [ ] 최종 합산 archive의 canonical memory 및 exclusive Geo P95 실행

Root는 2026-11-02에 원 canonical 100cycle과 새 Geo100k 스트레스를 분리하고 새 대형 반복을 필수 원 조건으로 추가하지 않도록 지시했다. 이 감사는 제품·입력·SLO·기존 요구를 변경하지 않는다.

## 정확한 원 요구 매핑

| 원 기준 | 필요한 행동 | 현재 실행 owner / 범위 |
| --- | --- | --- |
| [qualification-delivery](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/qualification-delivery.ko.md) lifecycle scenario, AT41 | mount→gesture→worker/asset start→resize→destroy 100회; late callback/listener/worker 누수 0 | `scripts/benchmark-native.js --workload=memory`, `scripts/benchmarks/lifecycle.js`, `routes.browser.js`의 복합 lifecycle |
| 같은 qualification retained heap, AT56 | GC 가능 환경, retained heap 기울기 ≤10KB/cycle·증가 ≤2MB, listeners/workers/timers/capture 정확 0 | canonical driver가 DPR1/2마다 warmup5 이후 100cycle 및 101 heap samples를 수행; sample마다 CDP GC, 50완료/50취소 |
| 같은 qualification Geo size class, AT56 | 원 1k/10k/100k vertices, 5+30, camera ≤16.7/33/50ms, hit ≤20ms | `--workload=geo`; 각 크기별 새 page에서 camera-preview와 css-hit를 수행. 이 분기에 100cycle은 없음 |
| AT43·44, [animation](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/animation.ko.md) | 현재 frame interrupt/rebase, virtual clock settlement, dispose 후 RAF/render callback 0, typed Geo clip/kernel | `test/unit/animation/geo-lifecycle.test.js`의 20회 current rebase, 공통 `retention.test.js`의 작은 keyed point 100/1000 interruptions, player/native-player 및 공개 Geo consumer |
| AT34·45·55, [geo](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/geo.ko.md) | 현재 visible geometry hit·native 권한, offline same-time replay·복원, 원 feature/clip/source identity | Geo lifecycle/public-selection, installed animation-geo, browser animation-geo/offline. 이번 source에는 원100k native/current/rebase/offline 전수 기능 증거 추가 |

원 [acceptance cases](../../../../study/coverage-expansion-2026-10-27/roadmap/acceptance-cases.json)의 AT56은 sizeclass SLO와 반복 mount/dispose 안정성을 요구한다. AT82는 bundling stage SLO/worker/cache/export에 관한 기준이다. 별도의 **Geo100k × 100cycle** 수치 요구는 위 원안·Geo/animation 계약에서 확인되지 않았다. STEP070의 100/1000 interruptions는 이전 plan 연쇄를 끊는 공통 player/session 기능 회귀이며 큰 Geo 수명 벤치마크가 아니다.

Canonical memory fixture는 `resetLifecycle()`의 20-node/20-edge graph + 실제 2×2 PNG다. 실제 pointer capture, native ResizeObserver, Blob route worker, ImageBitmap decode/close, asset lease와 늦은 응답·취소를 포함한다. 이는 원 구현된 복합 수명 시나리오이며 입력을 Geo로 교체하지 않는다. 지금까지 Geo 증거의 작은 20vertex × 100cycle WeakRef 회수는 추가 owner smoke다. 이것도 canonical 복합 heap/counter 검증을 대체하지 않는다. 앞선 기록의 모호한 “원100k100cycle” 표현은 별도 필수 수치 요구를 만드는 근거로 쓰지 않는다.

## 실행 준비

[재현 wrapper](geo-lifetime-audit/reproduce-memory.sh)는 정확한 최종 합산 archive와 출력 경로를 필수 인자로 받아 canonical driver를 그대로 호출한다. `--diagnostic`이나 횟수·size·SLO override는 없다. `sh -n`으로 문법만 확인했으며 이 감사에서 실행하지 않았다. Root는 최종 합산 archive에서 실행할 예정이다. Native Geo P95는 별도 `--workload=geo`로 CPU 경쟁 작업을 멈춘 구간에서 수행한다.

## 다음 병목 조사 위치

제품 source `e38fa24c7`의 [읽기 전용 계수](geo-lifetime-audit/hotspot-counts.json)는 원 1k fixture의 한 중간 sample만 관찰했다. 재현은 helper를 `.artifacts/geo-hit-a3/lifetime-audit/hotspot-counts.mjs`로 복사해 root에서 node로 실행한다. 원 1999 commands를 모두 검산했고 최대오차 2.70e-13이었다. P95나 exclusive 성능 측정이 아니다.

- 한 sample에서 presentation normalization 2회, group normalization 3회, native stream 1회, JSON snapshot 6회다. 검사·budget work는 여전히 전수 수행한다.
- 이미 owned인 group 3회·presentation 1회·LineString 1회 snapshot은 원 input identity를 재사용하고 owned 등록 0이다. 새 최적화가 실제 호출 경로에서 작동함을 확인했다.
- 처음 `sampleGeoTracks`가 `{...group.to, geometry, styles, plotOrigin, frame}`으로 조립한 presentation root는 unowned다. 현재 snapshot 규칙에 따라 전수 복사하여 1021 containers를 등록했다. 전체 한 sample은 3141 containers를 등록했다.
- 다음 좁은 조사 후보는 **이 내부 새 presentation 조립 경계**다. 이미 검증된 geometry leaf를 보존하며 새 styles/frame/plotOrigin 경로만 완성할 수 있는지 검산한다. 임의 caller input에 조기 owned 표시를 하거나 검증·과금·오류 순서를 생략하지 않는다. mutable/timeline/alias/restore 경계에서 원 결과·오류가 같다는 구체 proof 없이 제품에 적용하지 않는다.
- `normalizeGeoAnimationPresentation → normalizeAnimationGeoGroup`, `resolveGeoAnimationPresentation → normalizeGeoAnimationPresentation → resolveAnimationGeoGeometry → normalizeAnimationGeoGroup → projectGeometry`의 반복 검증/정규화·canonicalJSON, 최종 concrete validation과 불변 출력 생성도 후속 프로파일 대상이다. 이 호출 횟수만으로 각 비용의 크기나 제거 안전성을 단정하지 않는다. 전역 registry 변경·retained cache·수학 변경은 제안하지 않는다.

현재 542a3b931의 100k 기능 완주와 이전 rebase 정체 로그는 모두 보존한다. 원 canonical memory·최종 Geo P95·전체 STEP077 완료 판정은 계속 열려 있다.
