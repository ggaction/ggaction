# 의미 위치 전환 커널

## 진행 상태

- [x] [잔여 전체 승인](../AUTHORIZATION.json#remainingApproval) 재사용과 구체 결정 기록
- [x] resolved semantic value·scale 기반 순수 continuous 위치 커널
- [x] 독립 수식과 정확 endpoint·극단값·명시 호환성 경계 검증
- [ ] 공개 planner의 item/channel 투영과 typed scene 연결
- [ ] band·ordinal·polar·curve·partition·Geo 및 실제 renderer 통합
- [ ] offline envelope·공개 선언·전체 소비자 검증

`grammar/animation/positions.js`는 화면 좌표를 역산하지 않는다. planner가 명시적으로
전달한 두 semantic value와 이미 해석한 scale을 받아 값을 선형 보간한 뒤 기존
`scales/mapping.js`에 보낸다. linear/time/pow/sqrt/symlog의 domain/range는 선형이고,
log domain의 각 endpoint 크기는 기하 보간한다. 음수 log도 같은 부호를 유지한다.
변환 수식·clamp·reversal은 기존 scale owner 한 곳이 소유한다.

같은 연속 타입·변환 parameter·clamp 및 domain 방향만 호환된다. 다른 정책, 선형
상수 domain, log 부호 변경은 명시 이유를 가진 crossfade 결정이다. 부동소수점
domain collapse 또는 표현 불가능한 중간 위치도 이유를 반환한다. endpoint 자체가
잘못되었거나 finite 좌표로 매핑되지 않으면 준비 단계 오류다. 정확0/1은 원래 value와
scale을 재사용해 원 endpoint와 동일하게 매핑한다. 렌더·ChartProgram 변경은 없다.

고정 log scale에서 value1→100의 중간은 value50.5를 매핑한다. domain1→100의 중간10과
구분한다. 이를 pixel midpoint로 대체하면 log 의미가 손실된다. 각 domain endpoint가
1→100,100→10000으로 이동할 때 중간 domain은[10,1000]이다. 원본 계약의 두 요구를
동시에 보존한다. 같은 최소 양수의 선형 보간이0으로 underflow하던 수치 helper는
동일 endpoint를 먼저 반환해 수정했고 독립 tiny log 회귀로 확인한다.

이 커널은 비공개이며 새 export·공개 API·저장 schema를 추가하지 않는다. 준비 plan의
version은 `semantic-continuous-position@1`이며 호출자가 소유한 입력을 복사·동결한다.
지원하지 않는 band/polar와 topology 전환을 이 커널에 숨기지 않는다. 전체 STEP061/062
또는 공개 animation 완료를 뜻하지 않는다.

집중검증은 새6개와 기존54개, transform별101시점의 독립 수식, 음수 log·고정/변경
range·clamp·reverse·descriptor·극단값을 포함한다. 최초 중간 overflow 실패를 보존하고
기존 mapper의 RangeError를 finite 표현 실패로 처리한다. 초기 소스에서7개 animation
owner coverage100/98.41/100, 새 owner100/96.10/100을 확인했다. 소스 고정 재실행과
package 경계 증거는 후속 `position-evidence/summary.json`이 소유한다.
