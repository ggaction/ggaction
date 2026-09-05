# R6-P4-B — Area/layout browser bundle budget

상태: **planned**. 구현은 V1에서 승인되었지만 bundle 상한 증가는 승인되지 않았다.
[구현과 검증 결과](RESULTS_V1.md)를 갖춘 뒤 commit/push하고 ready-for-review로 전환한다.

## 요청할 결정

Full gzip 상한 **237,000 → 242,000 bytes**, Basic **125,000 → 130,000 bytes** 조정을 제안한다.
각각 5,000 bytes(2.11%, 4.00%) 증가다. SVG 25,000 bytes, package 파일/전체 크기 상한,
minifier·압축·측정 fixture·검증 방식은 유지한다.

두 새 API와 stricter endpoint/layout 검증을 유지하면서 용량을 명시적으로 수용하는 안이다.
새 액션군·시각 목표·Phase X·배포 승인을 포함하지 않는다.

## 설치와 측정

[기계 판독 결과](package-results.json)는 고정한 tarball을 Node·MCP·strict TypeScript·튜토리얼 consumer에
설치한 뒤, 같은 tarball을 다시 설치해 Full/Basic/SVG Vite production bundle을 측정한 결과다.
[재현 runner](verify-package.mjs)는 기존 상한 검사를 그대로 실행하고 초과 시 exit 1을 반환한다.
최종 gzip·tarball SHA와 검증 결과는 아래 고정 기록에 있다.

## 증가 원인과 정리한 중복

`createAreaPlot`의 closed option/role 검사, datum endpoints·missing segments·aligned raw Area layout,
독립적인 Bar series identity와 color, atomic transition/scale cleanup을 추가했다.
Basic에도 Bar용 `layoutSeries`와 series/group/scale consumer가 필요하다. Full 전용 facade는 Basic에 노출하지 않는다.
Browser 측정은 Node MCP/knowledge가 browser bundle에 들어가지 않는지도 검사한다.

기존 aggregate/grouped Bar geometry와 selection에 중복되던 layout 계산을 같은 grammar owner로 통합했다.
작은 새 파일은 기존 책임 owner에 합쳤고 삭제된 grouped renderer를 남기지 않았다.
검증·오류·trace를 줄이거나 승인된 기능을 삭제해서 용량을 맞추지는 않았다.

| 선택 | 결과 |
| --- | --- |
| Full 242,000 / Basic 130,000 (권장) | 승인된 동작과 엄격한 검증을 유지하면서 현재 초과분을 수용하고 guard를 계속 사용한다. |
| 현재 상한 유지 | 추가적인 bundle 절감 작업과 회귀 검증이 필요하다. 그동안 package는 실패 상태다. |
| 기능/엔트리 범위 축소 | 이미 승인한 Area/Bar 계약을 변경해야 한다. 이번 제안에는 포함하지 않는다. |

## 승인 후의 정확한 변경

```diff
--- scripts/browser-bundle-size.js
+++ scripts/browser-bundle-size.js
@@
-  ggaction: 237_000,
-  "ggaction/basic": 125_000,
+  ggaction: 242_000,
+  "ggaction/basic": 130_000,
```

`agent_docs/SECOND_ARCHITECTURE.md`의 같은 표를 맞추고, 고정한 같은 tarball로 installed consumer 전체를
재검증한다. Package 성공 뒤에도 V2/V3/X는 각 Gate의 승인 절차를 유지한다.

승인 필요 근거: [구현 기록 지침](../../AGENTS.md)의 “Treat Gates as hard execution boundaries”와
[Phase 4 A 승인 조건](GATES.md)의 “Full/Basic/SVG 상한 237000/125000/25000 유지. 초과 시 별도 B가 필요”다.
이번 승인된 V1 범위를 구현·검증한 사실을 상한 증가 승인으로 재사용하지 않는다.

## 최종 고정 측정

| 엔트리 | gzip bytes | 현재 상한 | 초과 | 제안 상한 | 제안 후 여유 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Full | 240,319 | 237,000 | 3,319 | 242,000 | 1,681 |
| Basic | 128,538 | 125,000 | 3,538 | 130,000 | 1,462 |
| SVG | 6,418 | 25,000 | 0 | 25,000 | 18,582 |

Tarball `ggaction-0.0.12.tgz` — SHA-256 `9707de4005b534c56b1f07bc0e9ed6283df905c03e2416050b1dd27542170ee6`.
Packed 486,775 bytes / unpacked 2,327,235 bytes / 439 entries.
Node runtime/renderers, MCP, strict TypeScript, installed tutorial consumer는 통과했다.
Package 전체는 gzip guard에서 **실패(exit 1)**다. 이 실패를 숨기거나 상한을 바꾸지 않았다.
현재 source/types/knowledge를 같은 packaging 규칙으로 다시 pack한 SHA도 위 tarball과 정확히 일치한다.
