# 공개 inspection session — STEP047–049 연결

## 진행 상태

- [x] [전체 사용자 승인](../AUTHORIZATION.json)의 남은 공개 API·아키텍처 세부 결정 승인 재사용
- [x] exact current mark/guide metadata, CSS 좌표·shape/index/frame owner 연결
- [x] 독립 `ggaction/interaction` entry와 Full/Basic 타입·Current·예제
- [x] headless command, DOM pointermove/click, mount/unmount/destroy, generation/version 원자 교체
- [x] 실제 Canvas/SVG DPR1/2/3 브라우저 이벤트 및 sampled frame 검사
- [x] 새 owner와 기존 축/크기 범례 공통 추출의 집중 coverage
- [ ] 최종 source-free 동일 archive·문서 생성/빌드·browser 증거 기록 및 push
- [ ] STEP035 추가 composition 구현과 최종 통합, AT33/34 전체 인수
- [ ] STEP050 이후 편집 제스처·선택 orphan/drop·history 및 전체077

## 구체 결정

현행 API는 [INTERACTION Current](../../../contract/current/INTERACTION.md)가 단독 소유한다.
컨트롤러는 기존 domain action을 대신하지 않으며 새 저장 schema, compiler, animation sampler를
만들지 않는다. 순수 hit owner를 실제 program scene identity와 연결하고 host lifetime만 보유한다.
`createInteractionSession({program,bindings?})`는 독립 package function이다. 별도 action count나
ACTION_INDEX 허위 항목을 만들지 않는다. 미구현 binding/command/clock/assetResolver는 명시 거부한다.

`dispatch({type:"frame",scene,version,generation})`는 기존 Canvas scene v2를 복사·검증하고 현재
program의 known key/type/topology에만 연결한다. 새 program revision은 `updateProgram`으로 먼저
알린다. Frame 수락과 반환한 exact scene의 렌더링은 host가 동일 순서로 수행한다. Enter/exit의
subset과 opacity는 기존 bridge가 처리하지만 새로운 animation sampler 자체는 후속 소유자다.

가이드의 raw typed 값을 기존 pure tick/sample/layout resolver에서 읽는다. 렌더링되는 실제
physical item 순서·줄 그룹과 정확히 일치할 때만 연결하며 stale cardinality는 거부한다. Layout을
새로 적용하거나 program을 수정하지 않는다. 축 문자열/줄 나누기와 범례 clip group은 생성과
검사의 공통 owner로 추출했다. Parent/child composition namespace와 mark lineage는 기존 owner를
재사용하고 guide에 data lineage를 추측하지 않는다. 실제 geometry는 항상 current scene에서 얻는다.

## 검증과 한계

집중84검사는 session lifecycle, 늦은/잘못된 frame, own-data/accessor/cycle/work budget,
reentrant queue, explicit rotation matrix, Full/Basic, restored program, axis raw identity,
12종 legend family·clipped samples·summary·label omission 및 nested composition을 검증한다.
모든 새 interaction owner는 lines100%, branches94.87–100%, functions100%다.
기존 guides1,128검사도 통과했고 변경한 labels/policy/size owner의 canonical floor를 보존했다.

실제 브라우저3검사는 두 겹침 점의 independent CSS literal(126,182), 단일 점(294,118),
miss(30,270)를 Canvas/SVG 양쪽에 직접 pointer 이벤트로 입력한다. DPR1/2/3에서 logical keys와
localPoint가 일치하고, accepted frame에서 x25 이동 후 옛 위치는 miss이고 새 위치는 같은 두 item이다.
초기 예제에 미지원 Point `size` 옵션을 넣어 발생한 timeout 원본은 보존하고 옵션을 제거했다.
새 geometry나 renderer primitive는 추가하지 않았다.

Docs의 처음 실패는 미커밋 source link/provenance, 신규 contextual snippet 등록과 module
compatibility/architecture 안내 누락이었다. Ruby2.6 preflight 실패도 보존하고 기존 Ruby3.2 경로로
통과시켰다. 실패를 전체 통과로 재분류하지 않고 최종 owning 결과와 구분한다.

독립 source-free 소비자는 같은 tar를 Node20/22/24에서 사용하여 Full/Basic inspection,
복원·frame generation·host cleanup과 strict exactOptionalPropertyTypes를 검사한다. 기본
Full/Basic/SVG bundle 한도는 유지한다. 전수 integration/realistic/renderer sweep은 root의 최신
통합 checkpoint 의무이며 이 controller branch 결과로 대신 주장하지 않는다.
