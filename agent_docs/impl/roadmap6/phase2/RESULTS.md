# Phase 2 구현 결과

Phase 전체는 구현 중이며 V/X는 아직 승인되지 않았다. 아래 결과는 A 승인 범위의 검증된 개별 변경이다.

## W5 — Bar incomplete authoring

- 기준 commit: `48d6876c` (A 승인·Planned 등록). B01의 남은 lower measure-first와 D14의 Bar 순서 제약을 교정했다.
- 위치 없는 ordinary Bar에 width를 지정하면 기존 barWidth config만 저장한다. Measure를 먼저 지정하면
  유효한 field/type/scale과 명시적 집계/stack만 저장하며, 생략한 aggregate/stack을 위장하지 않는다.
- 반대 위치가 완성될 때 같은 Bar policy가 pending measure를 해석하고 기존 wrapped encodeX/Y를 호출한다.
  Category pair는 mean/null, 같은 field의 histogram pair는 count/zero다. 명시적 집계·stack·scale은 보존한다.
  별도 pending flag나 compiler queue는 없다. Scale zero의 자동 선택도 role이 정해질 때 수행한다.
- Missing field와 잘못된 값/width는 미완성 상태에서도 즉시 거부한다. Width가 저장된 Bar를 histogram으로
  완성하는 것은 거부한다. 완성된 histogram의 기존 atomic field 재할당은 유지한다.
- Box는 기존 전용 width owner와 pending range 검사를 보존한다. `createBoxPlot({ width })`로 미완성 Box의
  폭을 지정하며 lower encodeBarWidth는 range 완성 후에 사용한다. Box에 mean aggregate를 삽입하지 않는다.
- 여섯 순서 × 두 방향 × 세 category type × band/pixel 두 mode = 72개 조합의 최종 semantic 의미,
  graphicSpec, resolved scales, mark config가 기존 category-first lower chain과 같다. Resize도 동일하다.
  별도로 explicit aggregate/stack/zero 18개 조합, histogram 6개 조합, invalid input·trace 불변성,
  grouped width 및 remove/recover를 검증한다.
- 기존 의미 보존 교정이므로 W5의 V는 N/A다. 기존 horizontal grouped Bar와 temporal Bar/Line의
  primitive/public PNG 2/2가 같은 실행의 decoded pixel parity를 통과했다. V1/V2의 승인을 대신하지 않는다.
- Current ENCODINGS, 공개 position/appearance/reference, action cards·검색·LLM artifacts를 동기화했다.
  Planned의 incomplete-bar-authoring entry는 제거했고 새 public signature는 없다.
- 검증: 최종 `npm test` 2,341/2,341, focused Bar 121/121, Box 관련 35/35, contracts 259/259,
  installed package exit 0. Representative render 2/2. 실제 실행은 모두 exit 0이다.
- 실행 로그: `.artifacts/roadmap6-authoring/bar-{all,regression-test,box-test,contracts,package,render}.log`.
- 처분: B01 구현·검증 완료. D14는 이 부분만 완료하며 Phase 4 W4의 Polar/category ordering을 남긴다.
  Phase 2 전체의 X 승인·완료는 아직 요청하지 않는다.
