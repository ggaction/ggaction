# Roadmap 6 Phase 1 — 실행 증거

아래 결과는 이 branch에서 실행한 검증이다. 기준 감사는 수정하지 않는다. Phase의 완료·승인 상태는
[GATES.md](GATES.md)가 소유하며, 구현 완료가 다음 Gate의 승인을 뜻하지 않는다.

## W1 — Bar pair-role와 temporal 선언

- 변경: `createBarPlot({ x: "value", y: "category" })`가 category y를 먼저 작성한 뒤 기존 x position
  owner의 mean 추론을 사용한다. 세로는 기존 x→y 순서를 유지한다. 공통 bar category predicate를 재사용한다.
- 호환성: 기존 explicit mean lower chain과 semantic/graphic output이 동일하다. Canvas resize와 mark opacity
  edit 뒤에도 동일하고 입력 options·source program을 바꾸지 않는다. 새로운 visual target은 없다.
- 타입: temporal y category와 time scale을 허용한다. category의 aggregate/stack 및 band scale을 허용하지 않는다.
- 변경 전 새 regression: 3 실패 / 기존 10 통과. 변경 후 focused bar + grammar tests: 14/14 통과.
- `node --test test/unit/actions/charts/*.test.js`: 45/45 통과.
- `npm run test:contracts`: 255/255 통과. 61개 nested scale path의 259개 literal 조합을 실제 실행하며,
  추가된 `createBarPlot.y.scale.type = time`을 명시적으로 확인한다.
- `npm run test:package`: exit 0. 설치된 package의 strict TypeScript positive/negative, root/basic import,
  browser bundle, renderer entry와 MCP consumer를 확인했다.
- 문서: Current BASIC_CHARTS, public basic charts와 action reference source, generated reference/search/LLM/types를 동기화했다.
- 원장: B07 구현·검증 완료. B01의 facade 실패 P35는 교정했지만 P37 lower measure-first는 D14 / R6-P2-W5의
  incomplete-authoring 계약에 남긴다. B01 전체와 Phase 1 X를 완료로 표시하지 않는다.
- 재현 환경: Node 22.23.1 / npm 10.9.8 / macOS arm64. Temp/cache/browser 경로는 이 저장소의
  `.artifacts/repository-study/` 하위로 고정했다. 실행 로그는 `.artifacts/roadmap6-authoring/bar-*.log`에 있다.
