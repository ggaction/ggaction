# Phase 2 추가 결정 — 전체 브라우저 번들 예산

## 승인·적용 상태

W1의 공통 guide 재사용을 포함하는 `ggaction` 전체 엔트리 gzip 상한을 **230,000 → 235,000 bytes**로
조정했다. 사용자가 “조정한다”로 이 안을 승인했고 R6-P2-B 승인 기록 후 실행 상한과 Current architecture를
갱신했다. Basic 125,000 및 SVG 25,000 상한은 유지한다. Installed package 재검증은 exit 0,
full 실측은 231,731 bytes이며 여유는 3,269 bytes다. [실제 적용·검증 결과](RESULTS.md#b--browser-bundle-budget-acceptance)를 따른다.
V의 6개 시각 target은 별도 검토 중이다.

## 승인 전 측정과 영향

| 엔트리 | W5 commit `c6bc6dcd` | W1 후보 | 검토 당시 상한 | 당시 결과 |
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

승인 전 `npm run test:package`는 installed runtime, MCP, strict TypeScript, tutorial consumer와 세 번들 측정 뒤
full ceiling 검사에서 exit 1이었다. 이 실패는 승인 전 측정 이력으로 보존한다.
당시 `npm test`는 2,371/2,371, 대표 primitive/public PNG는 19/19 통과였다.
로그는 `.artifacts/roadmap6-authoring/guide-{all,package,render}.log`에 있다.

## 검토한 선택과 처분

- 승인·적용한 안: Full 상한만 235,000으로 조정했다. 현재 구현을 수용하고 3,269 bytes의 여유를 둔다.
  Executable owner와 Current architecture를 동기화하고 README/docs의 영향 범위를 확인했다.
  숫자 일치를 포함하는 문서·navigation 검사 10/10과 installed package 검증을 통과했다.
- 선택하지 않은 대안: 230,000 상한을 유지하며 W1 closeout을 보류하고 의미·지원 범위를 줄이지 않는
  추가 크기 개선을 수행하는 안이었다.
- 어느 선택도 W2/W3/W4 결과나 후속 roadmap의 예산 증가를 자동 승인하지 않는다. 향후 증가도 같은
  실제 측정과 전체 패키지 검사에 따른다. 배포·release 승인은 포함하지 않는다.

이 결정의 이름은 **R6-P2-B**다. 승인·적용·package 재검증을 마쳐 W1 완료 대기를 해제했다.
V와 전체 Phase의 X 상태는 [GATES.md](GATES.md)에 별도로 기록한다.
