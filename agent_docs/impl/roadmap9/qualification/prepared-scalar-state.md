# Prepared scalar sampling 구현

상태: source·회귀·원100k·동일 archive 소비자 검증을 마감한 개념 checkpoint. 전체57–77 closeout 및50ms 달성은 남는다.

## 채택

Root는 `fa704a7cdb8b152de334437de5bfc7c4fa84415e`의
[구체 prototype 검토](scalar-mapper-prototype.md)를 읽고
[기존 포괄 승인](../AUTHORIZATION.json#remainingApproval)으로 2026-11-02에 shared scalar helper와
local position record의 core-owned 등록을 함께 채택했다. 추가 사용자 승인 질문은 하지 않는다.

기존 linear/transformed owner의 scalar 계산을 작은 shared helper로 추출한다. 일반 vector API는
기존 validation 순서·unknown/옵션 getter 시점·degenerate 분기를 유지하며 factory 경로로 바꾸지
않는다. Private prepared factory는 닫힌 data snapshot을 검산하고 opaque token을 발급한다.
Closure는 primitive와 불변 pair/transform parameters만 보유한다. Position exact from/to pair의
기존 한 progress slot에 mapper를 함께 보관하고 첫 finite 성공 뒤에만 publish한다.
새 position record만 `freezeOwned`로 등록하며 core-owned 결과와 caller copy/forge 재검산을 유지한다.

Public API/types/schema, 기존 vector 결과 ownership, native/offline 권한, wire, 원 work/fixture/SLO는
변경하지 않는다. Critical owner coverage, 실제 six-type 1k product 비교, 동일 설치 archive의
Node20/22/24 및 minified browser를 검증한다. 원100k 슬롯은 root와 조율해 단독 large process로 실행했다.

## 실제 검증

Owning 회귀1097/1097, 새 focused5개+기존14개, 경계34개, artifact/docs16개,
coverage policy7개, animation render52개를 통과했다. Positions100/98.46/100,
continuous100/97.74/100, transformed95.39/92.70/100이며 private token owner mapping은
100/100/100이다. Mapping100 및 계산 owner95/90/100의 최소 coverage floor를 고정했다.

실제 변경 전 `b3da444d7` vector와 변경 후 vector/private scalar의91,824개 값·±0·오류 class/message가
같다. Six types의 실제1k native/offline/timeline/rebase/mixed/fallback 전체 frame/meaning/work와
v3/v4 native·sampled rebase bytes/hash도 동일하다. Linear/time 한 sample의 core clone6035→2035,
전체 WeakSet.add16084→10084, has39151→23155다. Transform4종 clone8035→2037이다.
이는 연산 감소이며 시간 향상 비율이 아니다.

원100k는6144MiB Node24 process에서 native/offline/rebase/restored 전체좌표와 whole frame,
exact replay, batch50 원 work 거부를 통과했다. Bytes33703073/41202280 및 작업량
78333686/97911711/46333687/133456501을 유지했다. 순수 sample 호출1890.16ms는 좌표 oracle11.02ms를
포함하지 않지만 plan 직후 GC가 없고 소형 package 작업과 CPU를 공유했다. 이전 측정과의
speedup/P95/50ms 비교 근거로 쓰지 않는다. 별도 live mapper7개의 caller input/options/pair21refs는
명시 GC5회 후0개 생존했다. 이 작은 reachability 증거는 retained heap100cycle을 대신하지 않는다.

최종 archive `c92a7375fe6955945fd18bb4a5a17b658abca047b7bbf9e433ea10c4123f7143`의
Node20/22/24 public runtime·strict types·7docs·optional peers·6bundle과 설치 minified browser
v3/v4×DPR1/2를 통과했다. Source17개는 archive의 원문 또는 canonical compact 결과와 동일함을
검산했다. Entries1259, Node22packed1809509, Node20/24packed1812731, unpacked8156711이며
최소 cap1259/1812800/8156800이다. Full788833/Basic426214/animation341294 gzip bytes의
최소 cap788900/426300/341300을 README·architecture와 동기화했다. Runtime 한도 변경0.

초기 unpacked/packed/bundle 초과, 잘못된 evidence selector, README cap 동기화 누락의 원문을
보존했다. README가 package input이므로 수정 뒤 최종 archive를 다시 고정하여3Node와 browser를
새 SHA에서 재실행했다. [정확 source/hash/명령/판정](prepared-scalar-evidence/qualification.json)이
검증 기록을 소유한다. Public API/types/schema 변화0이며 source pin metadata는 별도 commit으로 기록한다.
