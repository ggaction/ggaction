# Phase 5 W2 C2 — Color legend의 네 edge family transition

기준 `e712b644803d174b0043829bd47d958ac70653a3`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md)과 [계약](CONTRACT_W2_COLOR_TRANSITIONS.md)에 따라 [#100](https://github.com/ggaction/ggaction/issues/100)의 stale right-only 제한을 수정·검증했다. W2 전체와 실제0.0.13 릴리즈는 아직 미완료다.

## 변경과 rationale

Gradient와 interval 자체는 네 edge를 지원하지만, shared color legend transition은 right만 통과시켰다. Sequential↔quantize×4edge baseline8cases는2accept/6reject였다. 같은 destination을 직접 생성하면 여덟 경우 모두 유효했다.

이제 Full editScale과 nested encodeColor가 같은 owner에서 position과 공통 alignment/style/title/visibility를 보존한다. Side는 vertical·center·top-title, top/bottom는 left/center/right align과 default horizontal interval flow·top-title 교집합을 사용한다. 모든 baseline8cases가 통과한다. 새 family의 표현은 기존 destination owner의 geometry를 그대로 쓴다.

보존할 수 없는 family 설정을 버리지는 않는다. Custom gradient count/size, interval symbol/itemGap, horizontal interval columns 또는 vertical flow, inline title은 오류다. Side columns1은 유일한 기본 열과 동등하므로 허용한다. Side gradient의 noncenter align은 interval이 표현하지 못하므로 계속 오류다. New family의 고유 sample/strip/symbol default를 사용하며 제거된 midpoint를 돌아올 때 복원하지 않는다. Basic의 structural transition은 계속 지원하지 않는다.

## 검증

| Evidence | Result |
| --- | --- |
| Focused scale-transition와 guide collision | 28/28 PASS |
| New Full matrix | Point/aggregate Bar/Rect×3discretized types×8edge/align×2visibility=144cases PASS |
| Original baseline | 8cases;2accept/6reject→8accept |
| Real Cars | 392rows,24edge/type/visibility cases;roundtrip/encodeColor/Canvas replay PASS |
| Normal | 2886/2886 PASS |
| Source coverage | lines95.4%,branches92.23%,functions99%;85critical floors PASS |
| Primitive/public PNG | color-transitions와 Cars representative13/13 PASS |
| Packed Node/types/SVG/PNG/PDF/MCP/tutorials | PASS |
| Same final artifact Chromium | Canvas/SVG1/1 PASS;four-edge forward/backward |
| Docs generate/preflight/build/built | PASS;125pages |
| Catalog/navigation/documentation closeout | 21/21 PASS |

144cases는 최종 graphicSpec과 실제 drawing-order array, common config, source program 불변성, editScale↔encodeColor, forward/backward와 Canvas order를 비교한다. Existing structural/domain/unknown/highlight/overflow/Basic negative tests도 유지했다. Source policy의 별도 coverage floor95/85/100을 추가했다. 새로운 API/signature, destination geometry나 package entry는 없다.

[Package 원장](package-transition-edges-results.json)의 final artifact SHA-256은 `aa68d1567ed6d06f3872f2c39c952e235fb7f0d55ade5bb5753fbed3c8a121a3`이다. Entries452, packed509371, unpacked2435426. Gzip Full253698/Basic139979/SVG6437. 모든 기존 ceiling을 유지한다. 현재0.0.12는 개발 checkpoint version이다.

초기 matrix의 reverse expected program이 같은-family edit에서 midpoint를 보존한 것은 테스트 입력 오류였다. 계약대로 expected source에서 midpoint:auto를 명시해 비교했다. Packed Bar의 left legend offset30은 기존 y-axis labels와 겹쳐 공통 collision 검증이 거절했다. Positive fixture를 offset100으로 수정했고 overlap 검증은 유지했다.

## 남은 범위

C2 categorical/continuous occupied alignment, hidden categorical title metrics와 최종 layout matrix는 계속 진행한다. W3 labels/reference/format, W4 themes, W5 fitting, Phases6–11과 실제0.0.13 릴리즈는 남아 있다. 이 결과를 전체 W2 완료로 기록하지 않는다.
