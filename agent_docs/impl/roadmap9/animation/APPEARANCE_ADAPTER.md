# Animation appearance 연결 결정

[remainingApproval](../AUTHORIZATION.json#remainingApproval)의 공개 API·저장/시각 세부 결정 승인을 재사용한다. 원 animation 계약의 AT42는 실제 sampled color와 수치 appearance를 요구하며, 독립 RGBA 수치 kernel만 있는 상태를 완료로 세지 않는다.

## 채택할 경계

- 각 native geometry track owner가 geometry를 제외한 style slice를 공통 `animation/appearance` owner에 전달한다. 단순 solid fill/stroke만 기존 `parsePaintColor`와 `interpolateRGBA`를 재사용하고, opacity 및 명시 strokeWidth는 기존 numeric kernel로 보간한다.
- None paint는 ink alpha0, 생략 opacity는 기존 renderer의1이다. 생략 strokeWidth나 미해결 host color의 값을 새로 추정하지 않는다. Structured fill·다른 text/effect/static policy 변화는 명시 appearance crossfade를 유지한다.
- 현재 색/opacity는 concrete sampled properties에 이미 남으므로 frame 재기준에 새 semantic state나 이전 plan 보존이 필요하지 않다. Endpoint의 원 graphics는 정확히 유지한다.
- 기존 version1 payload의 같은 입력을 새 sampler가 조용히 다른 결과로 바꾸지 않는다. 공개 연결 시 transition plan/kernel을 version2로 명시 상향하고 premultiplied-linear-srgb@1 appearance version을 kernel manifest에 넣는다. 미발행 개발 animation surface의 구 version은 기존 unknown-version 원칙대로 오류다. 새 public function·ChartProgram resource·compatibility layer는 추가하지 않는다.

## 공개 연결 상태

Point·Cartesian·polar·partition·graph track은 native owner가 geometry를 제외한 style을
공통 appearance owner에 전달하고 같은 현재 geometry에 patch를 적용한다. Geo는 feature별
동일 style의 기존 native structured-paint 동작을 보존하며 달라진 solid style만 함께 준비한다.
재기준은 실제 concrete 현재 색을 다시 해석하고 version2 transport는 required appearance
kernel을 검증한다. 기존 geometry decision과 public6함수는 유지한다.

집중 source·네 renderer·설치본·strict types·native session의 실제 qualification은 별도
appearance-public-evidence에서 기록한다. 기존 준비 증거를 공개 실행 증거로 승격하지 않는다.
전체 STEP077과 원안의 다른 paint/guide/timeline consumer 의무는 이 checkpoint로 닫지 않는다.
