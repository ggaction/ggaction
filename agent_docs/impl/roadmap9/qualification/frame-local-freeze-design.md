# Point sampled frame local freeze와 whole-frame proof 검토

상태: 첫 단계 `approved`, 구현/검증 완료([검증 기록](position-frame-state.md)). 2–5 단계는 `planned`, 미구현. [공통 sampling 감사](frame-sampling.md)의1k 실제 귀속에서
도출한 후속 후보다. Root의 2026-11-02 읽기 전용 설계 지시에 따른 review 자료이며,
제품 구현 채택은 별도다. `AUTHORIZATION.json#remainingApproval` 범위의 검토를 재사용한다.
이번 commit은 core/renderer/animation 제품 파일을 바꾸지 않는다.

현재 runtime/원 fixture/CPU와 operation 근거, prototype 및 source pin은 위 감사가
소유한다. 이 문서는 더 큰 frame 수명/권한 설계만 소유하며 scale 공유와 함께 구현하라고
묶지 않는다. [SECOND_ARCHITECTURE.md](../../../SECOND_ARCHITECTURE.md)의 불변성과
물질화 경계가 판단 기준이다.

## 구성과 수명

아래는 **측정된 병목에서 도출한 미구현 후보**다. 아직 절감량/속도를 제품 결과로 세지 않는다.
일반 deep-freezer나 core ownership API를 추가하지 않는다. 현재 core 규칙과
[SECOND_ARCHITECTURE.md](../../../SECOND_ARCHITECTURE.md)의 물질화/renderer 경계를 유지한다.

1. 먼저 `sample.js`의 point branch에서 새로 만드는 positions row/x/y **3개 local record만**
   bottom-up `Object.freeze`한다. 재사용 scale는 이미 owned다. 모든 위치를 채우고 길이를
   확인한 vector root만 기존 `freezeOwned`로 완성한다. `registerAnimationFrame`은 기존
   `cloneAndFreeze(input.positions)`를 유지하되 root 재사용으로 복제3,001개를 피할 수 있다.
   새 row/x/y를 core WeakSet에 각각 넣을 필요는 없다. 다른 family나 외부 입력에는 적용하지 않는다.
2. Point node의 properties는 기존 concrete validator를 먼저 실행한 뒤 **기존 `freezeOwned`**로
   완성한다. Scene compiler가 zero-offset properties를 공유하므로 이 properties proof는 유지한다.
   새 node 외피와 직접 만든 finite tuple는 local `Object.freeze`로 완성한다. 다른 branch의
   기존 owned node와 함께 nodes vector를 동결한 뒤 scene root만 owned로 만든다. Timeline patch는
   현재 `timeline.node`의 concrete validation/clone 경로를 유지한다. 일반 frozen caller node는
   이 branch에 들어올 수 없고, authentic plan의 primitive/owned paint에서 만든 local만 대상이다.
3. Decisions도 그 함수가 방금 만든 record만 동결한 뒤 decision vector와 frame root를 완성한다.
   기존 `registerAnimationFrame`의 exact frame→WeakMap provenance를 **전체 frame proof**로 그대로
   사용한다. 새 frozen/clone 검사로 frame authority를 발급하지 않는다. Root core-owned는 전체
   reachable graph가 immutable이라는 기존 의미를 유지하되 child 각각의 core ownership은 추가하지 않는다.
4. `captureFrameMeaning`의 matching/source2,005 등록과 identity 재검증은 별도 후순위다.
   Current exact auth-plan identity ref에서 온 항목만 검증 재사용을 검토할 수 있다. Geographic/
   guide 생성 identity, enter/exit/중복 재배치에는 현재 index/identity/ambiguity 검사가 필요하다.
   Key/hash 또는 같은 serialized identity로 건너뛰지 않는다. 현재 duplicate 검사를 일괄 없애지 않는다.
5. Graphic wrapper1,008 clone도 별도 후순위다. `canvasSceneProgram`만 concrete compile을 소유하고
   여전히 완성된 graphicSpec을 반환해야 한다. Sample가 두 번째 compiler를 만들거나 Canvas에
   semantic/scale 계산을 넘기지 않는다. Exact immutable scene의 **compiler가 직접 만든** wrapper만
   local freeze로 끝내는 후보와 일반 mutable scene의 snapshot/clone 경로를 분리해 검증해야 한다.

핵심 수명은 sample 호출의 local mutable builders → 검증/완성 → deep immutable frame이다.
완성 전 builder는 반환·cache·provenance에 노출하지 않는다. Frame proof는 현 frame의
scene/graphicSpec/meaning와 기존 opaque planIdentity, 현재 source origins만 갖는다.
Plan, controller, 이전 frame/이전 sampled endpoint를 새로 보관하지 않는다.
Prepared scale pair cache도 program/plan/frame을 value로 갖지 않으며, slot scale는 새 숫자
배열과 primitive만 갖는다. 양쪽 WeakMap key가 사라지면 ephemeron으로 함께 해제된다.
이는 정적 참조 분석이며 heap/GC 회수 실측을 대신하지 않는다.

새 node를 child core-owned로 stamp하지 않으면 후속 개별 child clone/validator는 기존 일반
경로로 돌아갈 수 있다. 반대로 이 후보를 적용하면서 properties까지 unowned로 만들면
scene compiler가 properties를 다시 복제해 손해가 날 수 있다. 그래서 point properties의
기존 owned 경계는 유지한다. Whole-frame proof를 외부 graphic/program/native authority로
확장하지 않는다. 이 후보의 실제 boundary 변경을 채택하면 해당 구현 checkpoint에서
architecture record, scoped owners, owning/critical/consumer 근거를 함께 갱신한다.


## 채택 전후 구분

이 문서의 함수 변경은 실제 prototype으로 검증하지 않았다. core clone/registration
감소 예상과 실제 CPU/heap 감소는 다르다. 먼저 positions vector 하나의 지역 동결을
별도 owning checkpoint로 검증하고, 다른 node/frame/renderer 단계는 결과를 보고 선택한다.

필수 반례는 mutable caller array/object·얕은 frozen clone·arbitrary owned graphic·잘못된
plan/time/progress·prototype getter/descriptor·style/clip/weighted blend·timeline patch다.
각 단계마다 원 full frame, native/offline/rebase/batch, renderer graphicSpec-only,
mutation 불가와 provenance의 이전 plan/frame 참조0을 확인한다. Exact artifact consumers와
heap 회수 측정 없이 SLO/수명 완료로 세지 않는다. 이 단계의 resource/node/work 및 v3/v4
schema 정책은 변경하지 않는다.


## 2026-11-02 첫 단계 채택

Root는 기존 `AUTHORIZATION.json#remainingApproval`과 b′ 검토에 이어 첫 단계만 구체
채택했다. 안정 기준은 `2fb36c76d79d7f5c85cbc931e7413772af2dc858`이며 별도
`codex/roadmap9-position-frame-state` branch에서 진행한다. 새 point row/x/y 세 record를
bottom-up `Object.freeze`하고, 모든 emission/exit와 기존 node 검증이 끝난 positions vector
root만 `freezeOwned`한다. `registerAnimationFrame`의 clone 경계와 node/properties/scene/
decision/core/renderer 구현은 그대로다. 이 변화는 deep immutable root가 이미 동결된 local
자손을 소유한다는 기존 규칙을 이용하며, 외부 frozen/copy에는 권한을 부여하지 않는다.

Exact/enter/exit의 non-null row는 `assemble`의 preparedPositions 전체 clone 경계를 지난
값이다. Offline 입력도 semantic/actual graphic 검산과 clone 후 같은 경계에 들어온다.
그 밖의 branch와 추가 geographic/guide emission은 null slot만 넣는다. 새 point row는
finite value primitive와 기존 exact deep-owned scale만 갖는다. Endpoint side 단축 경로는
변경하지 않는다. 새 cache/provenance field/이전 plan 또는 frame 참조는 없다.

검증은 1k old/new 전체 frame/meaning/batch/rebase·v3/native-v4 bytes·sampled-v4 replay,
실제 clone/ownership operation, owning/critical과 source-free 소비자를 구분해 기록한다.
원100k는 별도 large slot을 받은 뒤 직렬로 검산한다. Timing은 진단이며50ms/P95/retained
heap 통과가 아니다. 장수명 WeakSet rehash의 root OS sample 관측은 별도 가설이고 이
변경의 효과로 단정하지 않는다. Global ownership 교체와 scalar mapper는 채택 범위 밖이다.
