# Cartesian typed animation

## 진행 상태

- [x] 원안 STEP061/062와 remainingApproval의 공개 API·저장·시각 결정을 재사용한다.
- [x] native final item/row identity와 값·scale 준비, 동일 정책 보간, native geometry 검산을 구현했다.
- [x] rule/rect/bar/histogram/line/area의 대표 source·같은 frame의 4 renderer 증거가 있다.
- [ ] 최종 focused coverage·경계·선언·문서·동일 tar 3Node 설치를 닫고 source/evidence를 push한다.
- [ ] 나머지 typed family와 전체 STEP061/062/077 자격은 별도 의무다.

승인은 [AUTHORIZATION.json](../AUTHORIZATION.json)의 remainingApproval을 그대로 적용한다.
새 public signature나 scene schema를 만들지 않는다. 기존6 animation 함수와 renderer-ready frame을
그대로 쓰며 planner payload의 optional closed Cartesian state/kernel version만 추가한다.
검토 대상 public source는 `test/support/animation-cartesian-frame.js`, 독립 수치 reference는
`test/unit/animation/cartesian-values.test.js`, PNG/PDF 및 Browser Canvas/SVG는 같은 source를 쓴다.

기반은0bcba0bbb이며 graph1551c22a9와 retention60a4c20c6의 source를 함수별 결합했다.
최종 peer350b72e55와 공유4 owner를 비교하여 차이가 Cartesian vector 연결뿐임을 확인했다.
Frame은 이전 plan을 보존하지 않으며 현재 semantic vector만 가진다. 기존 graph/point 의미도 유지한다.

호환 범위는 Current ANIMATION의 Cartesian 단락이 소유한다. 집계·binning·stack/wiggle은
endpoint 준비 때만 수행하며 sample은 native path/bar shape를 계산한다. 다른 곡선/폭/layout,
ordered row grid, categorical domain 등의 정책 변화는 잘못된 중간 geometry를 추정하지 않고
명시 fallback으로 남긴다. Special placement·conditional/density area 등의 후행 의무를 제거하지 않는다.

최초 graph-vector cardinality failure는 graph 성공 경로에 Cartesian null을 한 번 보존하지 않은
결함으로 수정했다. Incomplete native line의 identity 조회를 앞당긴 failure는 명시 unsupported
state를 먼저 돌려주도록 수정했다. 렌더 fixture의 area 기본 alpha(.2)와 histogram bar 옵션 작성
오류도 최초 로그를 보존한다. Canvas resize의 배경 crossfade는 기존 공통 정책이며 그 PDF를
전부 vector라고 주장하지 않는다. Native shape 내부 pixel과 exact endpoint PNG를 검증한다.
