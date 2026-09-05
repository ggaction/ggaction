# Phase 2 추가 결정 — 전체 브라우저 번들 예산

## 검토 요청

W1의 공통 guide 재사용을 포함하는 `ggaction` 전체 엔트리 gzip 상한을 **230,000 → 235,000 bytes**로
조정하는 안이다. Basic 125,000 및 SVG 25,000 상한은 유지한다. 현재 실행 상한과 공개 수치는 아직
수정하지 않았다. 기존 A 승인을 예산 증가의 승인으로 해석하지 않는다.

## 실제 측정과 영향

| 엔트리 | W5 commit `c6bc6dcd` | W1 후보 | 현행 상한 | 결과 |
| --- | ---: | ---: | ---: | --- |
| ggaction | 228,286 | 231,731 | 230,000 | 1,731 초과 |
| ggaction/basic | 120,988 | 124,174 | 125,000 | 통과 |
| ggaction/svg | 6,418 | 6,418 | 25,000 | 통과 |

같은 `scripts/browser-bundle-size.js`의 production Vite consumer, esbuild minify, gzip level 9로 측정한다.
전체 엔트리 증가 3,445 bytes는 기존 facade 9종의 guide ID·coordinate·부분 component·명시 style
호환성 처리와 공유 owner의 사전 검증을 포함한다. 새 dependency나 public export는 없다.
Standalone legend family routing의 중복을 제거했다. Basic이 사용하는 순수 config resolver 때문에
불필요한 Opacity/Interval/StrokeWidth action 생성이 포함되지 않도록 그 상수 생성에 pure annotation을
붙였다. `action()`의 WeakMap metadata는 반환 함수에만 연결되므로 사용하지 않는 함수 생성을 생략해도
관찰 가능한 등록·동작은 바뀌지 않는다. 실제 등록 액션과 trace는 전체 테스트로 확인했다.

`npm run test:package`는 installed runtime, MCP, strict TypeScript, tutorial consumer와 세 번들 측정 뒤
full ceiling 검사에서 exit 1이다. 실패를 통과로 바꾸거나 baseline을 덮어쓰지 않았다.
`npm test`는 2,371/2,371, 대표 primitive/public PNG는 19/19 통과다.
로그는 `.artifacts/roadmap6-authoring/guide-{all,package,render}.log`에 있다.

## 선택과 후속 작업

- 제안: Full 상한만 235,000으로 조정한다. 현재 구현을 수용하고 3,269 bytes의 여유를 둔다.
  승인 후 executable owner, Current architecture, README/docs 및 숫자 일치 검사를 함께 갱신하고
  installed package 검증을 다시 통과시킨다.
- 대안: 230,000 상한을 유지한다. W1 closeout을 보류하고 의미·지원 범위를 줄이지 않는 추가 크기 개선을
  수행한다. 이미 승인한 guide 기능을 조용히 삭제하는 안은 제안하지 않는다.
- 어느 선택도 W2/W3/W4 결과나 후속 roadmap의 예산 증가를 자동 승인하지 않는다. 향후 증가도 같은
  실제 측정과 전체 패키지 검사에 따른다. 배포·release 승인은 포함하지 않는다.

이 결정의 이름은 **R6-P2-B**다. V의 primitive 검토 준비는 독립적으로 가능하지만 예산 상한 변경과
W1 최종 완료 선언은 B 승인 전까지 진행하지 않는다.
