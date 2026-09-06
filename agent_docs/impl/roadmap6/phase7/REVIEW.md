# Roadmap 6 Phase 7 X — Polar and one-dimensional chart closeout

## 고정 결과

- 검증 source commit과 원격 ref는 `573ec54fe8cf3e538cc173931f1f88d187c88504`다.
  `origin/codex/roadmap6-hierarchical-actions`에 push하고 같은 ref임을 확인했다.
- W1의 `createPolarScatterPlot`·`createPolarLinePlot`, W2의 `createRadarPlot`, W3의
  `createRugPlot`·`createStripPlot`을 기존 Point/Line/Tick, theta/radius, Fold, jitter와 guide owner 위에
  구현했다. Facade 전용 renderer나 materializer를 추가하지 않았다.
- Polar/Radar와 Rug/Strip의 승인된 primitive/public visual equality, lower edit와 rematerialization,
  Full-only package 경계를 각 W 결과에서 검증했다.

## X 통합 감사

`realistic-hierarchical-facade-matrix`는 다섯 현실 데이터셋에서 24개 프로필과 11개 계층형 chart
facade를 직접 호출한다. Phase 7의 다섯 facade뿐 아니라 이들이 공유하는 Area, Density, Horizon,
Pie, Rose, Radial Bar 계약까지 같은 corpus에서 교차 검증한다. 총 1,320개 direct facade 호출에서
필수 option path, boolean/string literal, 최소 두 값의 literal diversity를 모두 충족했다.

이 감사에서 다음 설계 오류를 추가로 찾아 수정했다.

1. Rug/Strip이 explicit coordinate를 받지 않아 여러 Cartesian coordinate에서 모호해지던 문제와
   Horizon의 inferred tick values가 explicit count를 가로막던 문제를 앞선 W3 후속 커밋에서 고쳤다.
2. 방향을 모두 `false`로 끈 facade guide가 빈 `createGrid`를 호출해 실패하던 [#117](https://github.com/ggaction/ggaction/issues/117)을
   수정했다. Coordinate-only Parallel axis inference는 별도로 보존했다.
3. Polar/Radar 선언이 런타임에서 도달할 수 없는 legend symbol/order, categorical theta count/format과
   curve를 약속하던 [#118](https://github.com/ggaction/ggaction/issues/118)을 facade별 타입으로 좁혔다.
   Strict positive/negative TypeScript 계약과 생성 action card가 같은 범위를 갖는다.
4. 현실 조합이 드러낸 axis/grid values, 시간 단위, categorical/continuous legend, scale family와
   interpolation 분포를 fixed fixture가 아닌 서로 다른 다섯 dataset에서 실행하도록 영구 회귀로 남겼다.

두 이슈는 수정 commit을 링크한 검증 설명과 함께 닫았다.

## 누적 검증

| 범위 | 실제 결과 |
| --- | --- |
| hierarchical realistic matrix | 5 datasets × 24 profiles × 11 facades, 모든 option/literal/diversity pass |
| normal/unit suite | `npm run test:unit` — 2,193/2,193 pass |
| contract suite | `npm run test:contracts` — 315/315 pass |
| focused type contracts | Polar, Radar, measured radial positive/negative declarations pass |
| generated contracts | action catalog/card와 docs action/type machine artifacts current |
| package | 476 entries, packed 559,150 bytes, unpacked 2,683,887 bytes |

추가 타입과 현실 matrix로 packed/unpacked가 기존 ceiling을 150/1,887 bytes 넘었다. 전체 사용자 승인에
포함된 한도 조정에 따라 ceiling을 560,000/2,685,000으로 실제 증가량에 가깝게 올렸고 동일 artifact의
package shape와 installed boundary 검사가 통과했다.

## 종료 판정

- F02, F03, F08은 public runtime, declaration, Current metadata, card, docs, renderer consumer와 현실
  lifecycle 증거를 갖춘 implemented-verified 상태다.
- Phase 7에 숨은 Planned 또는 deferred 구현은 없다.
- [전체 실행 승인](../APPROVAL.md)이 A/V/X에 적용되므로 R6-P7-X를 approved로 닫고 Phase 8로 이동한다.
