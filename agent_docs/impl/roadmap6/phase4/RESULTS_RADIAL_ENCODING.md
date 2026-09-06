# Phase 4 W3 — Measured radial encoding 기반

[로드맵 전체 승인](../APPROVAL.md)에 따라 하위 계산에 이어 공개 encodeR와 scale lifecycle을 구현했다. **W3 전체는 미완료**이며 createRosePlot/createRadialBarPlot, V2 public/primitive 시각 쌍과 chart discovery가 다음 작업이다.

## 구현된 계층과 의미

- `encodeR({field,aggregate:"sum",mapping:"area"|"radius-length"})`와 field 없는 count를 지원한다. Reassignment는 생략된 mapping/aggregate를 보존하고 count/sum 전환 때 stale field를 제거한다. 기존 ordinary encodeR의 row grain과 scale default는 유지한다.
- Radius encoding은 category grain의 aggregate, scale.radialMapping은 면적/길이 policy를 각각 한 곳에 저장한다. Map/axis/grid는 공통 계산을 사용한다. Count를 위한 가상 field나 dataset을 만들지 않는다.
- 하위 scale 계층을 완성하기 위해 createScale/editScale에 canonical radialMapping 옵션을 노출했다. 범위·type validation은 기존 shared normalization owner를 사용하며, 같은 의미를 encodeR나 facade에 중복 저장하지 않는다.
- Standalone scale은 auto domain/range를 저장할 수 있고 연결 시 consumer policy를 검증한다. Shared measured Arc는 하나의 mapping을 사용한다. Generic Point/Arc 혼합은 오류다.
- Radius-first assignment는 theta가 없으면 pending이다. Aggregate domain·mark를 미리 만들어 추정하지 않는다. Pending explicit range와 innerRadius도 검증하며 Canvas 변경은 아직 resolved되지 않은 measured scale을 검사한다.
- 새 Arc의 위치 상속은 category aggregate를 함께 보존한다. Ordinary Point에는 measured radius를 전파하지 않는다. Scale 이름과 객체는 임의로 복제하지 않는다.
- Theta removal 전 measured radius removal을 요구한다. 집계 기준만 없어진 뒤 radial guide가 남는 상태를 예방한다. 기존 scale을 ordinary radius에 재사용하려면 radius encoding 제거 후 orphan scale의 radialMapping을 explicit undefined로 해제한다. 새로운 scale id를 쓰는 경로도 가능하다. 제거만으로 다른 named resource의 의미를 추측해 변경하지 않는다.

## 이번 검증에서 발견·수정한 오류

1. Arc 상속 정책이 aggregate를 제거한 fallback radius를 사용하면 category sum을 row radius로 바꾸거나 materialization을 실패시켰다. Measured scale에는 aggregate를 보존하는 Arc만 상속한다.
2. Count의 field-less 타입으로 바뀐 뒤 자동 action-card snippet이 fieldType만 출력했다. Canonical sample override를 ordinary field 호출로 지정하고 모든 compact snippet/resolver TypeScript 검사를 통과했다.
3. Pending measured scale은 resolved cache가 없어 Canvas resize 검사에서 빠졌다. Canvas dependency 판정에 연결된 measured scale을 포함하고 known range를 즉시 검사한다.
4. Theta만 제거하면 aggregate 기준 없이 radial guide와 이전 resolved radius가 남았다. Category-dependent radius를 먼저 제거하도록 명시적 오류를 추가했다.

## 검증

- 최종 `npm test`: **2,684/2,684**, fail/skip/cancel 0. 새 measured encoding 12 tests, grammar 6, primitive action 4, strict declaration 1을 포함한다.
- Count/sum transition, mapping reassignment, independent literal radii, shared scale, order-independent completion, inheritance, pending resize, removal, immutable rejection, actual guide/mark updates를 확인했다.
- `test:browser`: 기존 공개 예제 60개 회귀 검사. 새 Rose/Radial chart의 browser/PNG/SVG/PDF 증거는 V2에서 추가한다.
- Docs/reference/card/signature/capability/search/machine/LLM artifacts 생성 후 normal freshness 검사 통과. Measured radial mapping capability를 Planned에서 제거했다. 두 chart facade는 Planned로 유지한다.
- Installed package의 새 measured radius sum/count/reassignment 호출, strict positive/negative types, Node renderers, tutorial consumers, MCP와 minimal browser bundles가 모두 통과했다. [기계 결과](package-radial-results.json).

Artifact: `.artifacts/roadmap6-authoring/measured-radius-package-verified/ggaction-0.0.12.tgz`.
SHA-256: `86331ef6d0da912d6c758c1ee745f3fb802f2febdb564b8b70d73a1571c3c12c`.
440 entries / packed 492,399 bytes / unpacked 2,348,177 bytes.

## 승인된 용량 조정

하위 계산·validation·normalization이 공통 source graph에 연결되어 Full과 Basic bundle에 증가가 있다. 최초 측정 243,860/131,469 bytes에서 기존 242,000/130,000 상한을 초과했다. 사용자 전체 승인에 따라 Full **245,000**, Basic **132,000**으로 조정했다. 최종 측정은 각각 **243,932**, **131,566** bytes이고 SVG는 **6,437** bytes로 기존 25,000 상한을 유지했다. Package entry/packed/unpacked 상한은 변경하지 않았다.

로그는 `.artifacts/roadmap6-authoring/measured-radius-*`다. 최초 normal 3 failures와 package 상대 output 경로 오류는 보존했고, 수정 후 normal/package 최종 검증을 통과했다. Coverage·realistic 전체 및 built docs를 이번 checkpoint에서 실행했다고 주장하지 않는다.
