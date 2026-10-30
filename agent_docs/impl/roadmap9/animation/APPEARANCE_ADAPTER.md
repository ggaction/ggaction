# Animation appearance 연결 결정

[remainingApproval](../AUTHORIZATION.json#remainingApproval)의 공개 API·저장/시각 세부 결정 승인을 재사용한다. 원 animation 계약의 AT42는 실제 sampled color와 수치 appearance를 요구하며, 독립 RGBA 수치 kernel만 있는 상태를 완료로 세지 않는다.

## 채택할 경계

- 각 native geometry track owner가 geometry를 제외한 style slice를 공통 `animation/appearance` owner에 전달한다. 단순 solid fill/stroke만 기존 `parsePaintColor`와 `interpolateRGBA`를 재사용하고, opacity 및 명시 strokeWidth는 기존 numeric kernel로 보간한다.
- None paint는 ink alpha0, 생략 opacity는 기존 renderer의1이다. 생략 strokeWidth나 미해결 host color의 값을 새로 추정하지 않는다. Structured fill·다른 text/effect/static policy 변화는 명시 appearance crossfade를 유지한다.
- 현재 색/opacity는 concrete sampled properties에 이미 남으므로 frame 재기준에 새 semantic state나 이전 plan 보존이 필요하지 않다. Endpoint의 원 graphics는 정확히 유지한다.
- 기존 version1 payload의 같은 입력을 새 sampler가 조용히 다른 결과로 바꾸지 않는다. 공개 연결 시 transition plan/kernel을 version2로 명시 상향하고 premultiplied-linear-srgb@1 appearance version을 kernel manifest에 넣는다. 미발행 개발 animation surface의 구 version은 기존 unknown-version 원칙대로 오류다. 새 public function·ChartProgram resource·compatibility layer는 추가하지 않는다.

## 현재 상태

공통 helper의 독립6개 검사와 line/branch/function100/100/100을 통과했다. Color의 해석은 host-independent owner를 사용하며 원 명명색과 CSS 문자열을 정확 endpoint에서 보존한다. Float conversion의1ulp는 수치 tolerance1e-12로 평가한다. 원 최초 실패는 보존한다.

현재 helper는 공개 planner/sampler에 아직 연결하지 않았다. Geo·Cartesian·polar·partition shared seam이 고정된 뒤 한 번 합산하고 Current·타입·public docs·strict envelope·설치본·네 renderer와 current frame 검증을 같은 공개 checkpoint에서 닫는다. 이 준비를 AT42 또는 전체 STEP077 완료로 세지 않는다.
