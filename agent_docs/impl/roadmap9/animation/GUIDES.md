# 의미 기반 guide animation

## 진행 상태

- [x] [remainingApproval](../AUTHORIZATION.json#remainingApproval)의 남은 API·저장·구조·시각 승인 재사용. 추가 승인 질문 없음.
- [x] 기존 native guide metadata와 geometry 계산 소유 경계 조사.
- [x] 공통 tick value·axis item association·순수 geometry 소유자 재사용.
- [x] semantic guide key 및 값/scale/frame typed kernel, 변경·신규·제거 tick 검증.
- [x] 현재 frame 재기준·strict offline·네 renderer·설치 소비자·현재 계약과 공개 문서 동기화.
- [ ] Title·legend·Parallel·reflow·band-boundary guide 및 timeline의 남은 범위.

## 결정

공개 animation 함수는 그대로 둔다. ChartProgram/graphic schema에 임의 guide item lineage를 만들지
않고 endpoint의 optional `guides` vector로 실제 guide 의미를 보존한다. 키는 child namespace,
명시 guide owner, component, typed tick value, 해당 label의 줄 역할로 만든다. 같은 tick value의
label 문자열 변경은 crossfade이며 새 값은 enter/exit다. 배열 index나 표시 문자열로 다른 값을
대응시키지 않는다. 중복 값으로 유일한 대응을 정할 수 없으면 임의 첫 항목을 고르지 않는다.

기존 hit가 쓰는 axis association을 작은 read-only materialization owner로 공유한다. Hit key와
출력은 바꾸지 않고 legend/title/parallel 특화 처리를 불필요하게 옮기지 않는다. Tick 결정과
값→scale mapping, Cartesian axis/grid 및 polar rule/circle geometry는 기존 native 계산을 재사용한다.
축 생성/편집 action은 계속 명시 materialization을 수행한다. Animation 준비/샘플은 trace를 만들지 않는다.

선형/시간/변환 scale은 기존 semantic position kernel을 사용한다. Guide 값은 key의 원 의미값이며
같은 값의 scale/domain/range 이동을 보간한다. 범주형은 동일 typed domain 정책에서만 연결한다.
Plain label 위치는 native geometry와 고정 text policy가 일치할 때만 움직이며 문자열·font/layout
정책 변경을 숫자로 보간하지 않는다. 복잡한 label reflow/flush 등은 실제 지원 경계를 검증하여
명시 fallback으로 기록하고 guide 전체 완료로 과대 집계하지 않는다.

Plan/frame에는 현재 guide 의미만 보존한다. Restore는 닫힌 version, typed semantic key, 길이,
finite bounds, 실제 primitive forward equality를 검증한다. Kernel version은 planner 소유 manifest에
추가하고 transition version 숫자를 복제하지 않는다. Geo/partition/appearance 통합 후 공유
planner/sample/proof는 각 family의 optional vector를 유지한다. Timeline은 다음 별도 체크포인트다.

## 독립 준비 체크포인트 기록

이 체크포인트는 private 정규화·투영·대응 준비와 기존 native guide/hit 소유자 추출까지다.
공개 여섯 animation 함수와 endpoint/plan/frame 저장 형식에는 아직 연결하지 않았다.
`native-guide-values@1`의 수치·입력 오염·typed identity·중복 ambiguity 검증을 마쳤으며,
기존 공개 guide 여섯 사례를 같은 tar의 Node 20·22·24 설치본에서 확인했다.
세부 명령·최초 실패·현재 한도는 [준비 증거](./guide-foundation-evidence/README.md)에 둔다.

현재 순수 준비 범위는 Cartesian axis line/tick/fixed label/grid 및 polar axis/tick/fixed
label/rule/circle grid다. Band-boundary grid, flush·rotation·responsive reflow label,
axis title, legend, Parallel guide와 timeline은 후속 의무로 남긴다. 공개 typed guide
중간 프레임, 재기준, offline 복원, 네 renderer가 아직 검증되었다고 집계하지 않는다.

위 독립 준비 당시의 남은 공개 연결은 아래 체크포인트에서 닫았다. Transition version은
private guide owner에 하드코딩하지 않는다.

## 공개 연결 체크포인트

Appearance version2 및 Geo/partition/Cartesian/polar/D source `01ae2001f`를 합쳐 기존
여섯 API에 optional `guides` vector를 연결했다. 실제 typed raw value와 child namespace별
guide owner를 대응하고 중복 raw value는 임의 매칭 없이 명시 enter/exit로 보존한다.
`guideKey`는 mark `itemKey`와 구분하며 새 ChartProgram action·graphic schema를 추가하지 않았다.

현재 guide 상태는 flat proof에 보존하고 30회 반복 재기준 및 strict offline replay를 검증했다.
저장 복원은 cardinality·kernel·key·mark/background 배타성·native forward geometry를 검사한다.
전체 animation 323개 및 변경 8 owner의 critical floors가 통과했고 이후 Basic creation-only
실행 회귀를 추가했다. 실제 5 source × 3 recipe, Canvas/SVG DPR1·2, PNG/PDF를 확인했다.
Canvas resize 배경의 기존 weighted raster와 가이드 자체의 vector path 증거를 구분한다.

설치·문서·첫 실패·한도 측정 및 source pin 근거는 [공개 증거](./guide-public-evidence/README.md)다.
이 체크포인트는 위에 표시한 native guide slice만 닫으며 전체 STEP061/062/063/077이나
title·legend·Parallel·reflow·band-boundary guide와 timeline을 완료로 세지 않는다.

남은 native 의미의 책임·정책·준비 상태는 [GUIDE_DETAILS](GUIDE_DETAILS.md)에 기록한다.
