# Format6 제품 기능 checkpoint

## 진행 상태

- [x] 명시 format6 / scene3 / circle-batch 전체 소비자 연결. 기본 v3–v5 유지.
- [x] 실제 1k 6개 scale 및 fallback/timeline/mixed의 전체 frame·native·offline·rebase 비교.
- [x] Canvas/SVG/PNG/PDF와 public interaction 및 graph 이동/간선 편집 연결.
- [x] 깊은 constant snapshot, 기존 logical work/expanded/cell/physical guard 유지.
- [ ] 원래 100k의 같은 프로세스 native → offline → rebase → offline 전체 완료.
- [ ] 원래 1k/10k/100k full-frame 50ms 및 P95/100cycle 최종 qualification.

이 문서는 기능을 보존하는 중간 checkpoint이다. 원래 capacity나 STEP057–070/077 완료 판정이 아니다. 정확한 archive·source hash·검증 결과는 인접 `format6-product-evidence/qualification.json`에 고정한다.

승인: [구체 제안](batch-frame-format6-proposal.md), [채택 기록](batch-frame-format6-adoption.md), [constant snapshot 채택](format6-constant-snapshot-review.md). 사용자 remainingApproval을 재사용했다. PR·배포·패키지 발행은 수행하지 않았다.

## 포함 범위와 호환성

공통 primitive는 정확한 dense x/y/radius와 하나의 concrete appearance를 가진 1..10000행이다. 모든 renderer는 각 행을 기존 circle 수학·paint·clip 순서로 직접 소비한다. Scene3는 연속 run을 이 primitive로 만들고, 다른 종류는 single entry로 유지한다. Frame timer 안에 좌표, appearance, placement, 의미, native identity와 backend-neutral graphicSpec이 완성된다. 복잡한 paint 및 지원하지 않는 fast path는 완성된 일반 sampler 결과를 compact한다.

공통 authoring/editable4/graphic1 저장은 additive 지원이다. Scene2 node나 scene3 single에 batch를 삽입하는 입력은 거부한다. Native authority는 정확한 runtime private proof에만 존재하고, caller-authored batch와 offline 복원은 이 권한을 만들지 않는다. Player는 선택한 representation을 유지하고 교차 interrupt를 원자적으로 거부한다.

저장은 기존 columns@2와 tagged numeric codec을 사용하며 format6만 schema-specific numeric projection과 동일 참조 compound constant를 선택한다. 길이·논리 work·expanded/cell·physical 검산을 먼저 완료한다. Constant reader의 snapshot은 shallow-owned 입력도 모든 자손을 새로 복사하며 caller alias를 남기지 않는다. 기존 v3–v5 일반 frame/wire bytes는 비교 oracle로 고정했다. 의도된 수리 예외: graph unbundle의 completed-graph 생성 이력과 검증된 edited-graph-geometry 상태를 함께 복원하도록 기존 v3–v5 오류를 고쳤다. Missing reason/meaning과 잘못된 node 편집은 계속 거부한다.

`deserializeAnimation`의 타입은 정확한 Any union이며 version6 검사 후 좁힌다. InteractionState.scene와 frame command.scene도 scene2/3 union이다. 실행 문서, 선언, renderer별 저장/재생 및 public session 테스트를 함께 갱신했다.

## 원래 100k 실패와 진단

원 fixture hash는 `b68cab72c1abb6094e715d6e5caa84c54aacf18750ad4a22fb63e3b8c5b2c39f`이다. 값, capacity, guard, export50 거부 정책을 낮추지 않았다.

처음에는 physical envelope guard에 걸렸고, 기존 reader가 이미 지원하는 constant 표현을 format6 encoder에서 선택하여 통과했다. 비계측 native 실행에서 모든 100000 좌표/identity 및 sample/export guard는 통과했고 GC 후 sample 167.439ms 단일 진단이 있었다. 이는 50ms 미달이며 P95 또는 속도 향상 증거가 아니다.

같은 프로세스의 offline 단계는 두 번 장시간 `WeakSet.add → EphemeronHashTable::Rehash`에 머물러 TERM했다. One-time deep constant snapshot 이후에도 재현되었다. Phase를 별도 프로세스로 나누어 통과 처리하지 않았다. 원 실패 로그와 partial 결과를 증거에 보존한다.

추가 loader 계측 PID24486은 global registry를 교체하거나 회전하지 않았다. Native 준비 완료 등록 수 8703664, offline에서 마지막 기록 11011072였다. 마지막 1024개 구간은 `restoreEndpoint → validatePointAnimationPosition → preparePositionInterpolation → cloneAndFreeze`의 버리는 scale/plan 복사였다. 1024 간격 기록이므로 멈춘 정확한 마지막 add 한 개라고 단정하지 않는다. OS sample 1511/1511이 WeakSet.add 경로였다. 이후 진행이 없어 TERM했다.

WeakRef 표본 2124/2124 alive는 동일 synchronous job의 keep-during-job 특성 때문에 실제 retained registry 크기 근거가 아니다. 계측 timing도 성능 판정에 사용하지 않는다. 비계측 실패가 선행하여 정체는 loader에만 나타나는 현상이 아니다. 원 owner/검증/registry 의미를 유지하는 validation-only 후보는 별도 검토 대상으로 남긴다.

설치본 Node20 재검사에서도 기존 `hit-preparation/all-100000-native-points` isolated child PID35818이 같은 재해시에 머물렀다. 첫 canonical 실행에서는 이 원 사례가 통과했으나, 두 번째 실행에서 OS sample755/755 및752/752가 WeakSet.add 경로였고 4분52초에 해당 child만 SIGTERM했다. 이는 기존 90분 timeout을 수정한 것이 아니라 수동 진단 중단이다. 부모는 나머지 사례를 계속 실행했고 fixture/입력/archive는 그대로다. 따라서 병목 범위에는 offline 복원과 native construction 모두가 포함되며, 독립 재실행 성공이 있더라도 intermittent failure 해결로 세지 않는다.

Root의 정적 소스 감사는 정확한 [Node20.20.2 objects.cc](https://raw.githubusercontent.com/nodejs/node/v20.20.2/deps/v8/src/objects/objects.cc#L6035)에서 deleted 수가 live elements의 절반을 넘는 조건에 in-place rehash를 호출하며, [동일 파일의 구현](https://raw.githubusercontent.com/nodejs/node/v20.20.2/deps/v8/src/objects/objects.cc#L5469)이 probe별 capacity 순회를 포함함을 확인했다. OS stack도 `Rehash(PtrComprCageBase)` overload이다. 그러나 실제 table의 deleted/live/capacity 수를 측정하지 않았으므로 엔진 버그나 유일 원인으로 단정하지 않는다. 임시 owned 객체를 대량 등록 후 버리는 패턴이 촉발할 수 있다는 것은 아직 가설이다.

## 경계 수리 전 archive 설치본 재검사

동결 archive `0050d9403cc4fc9ba8a689cf8194a818857c078b6ad2ffad09873248fff11844`를 Node20/22/24와 실제 minified Chromium에서 사용했다. Node22는 전체 408 사례, 선언, MCP, 실행 문서, 6개 bundle을 통과했다. Node20과 Node24의 전체 matrix는 각각 407/408 사례를 통과했고, 두 실행의 실패는 원 기록에 남겼다. 나머지 선언·MCP·문서·bundle은 세 Node 모두 통과했다.

Node20의 원 native100k 사례는 앞서 기록한 재해시 정체로 수동 중단했다. Node24의 `static-delivery/native-endpoints-animation-replay` 사례는 내부 fresh process의 `offlineRestore` 단계에서 원래 60000ms timeout에 걸렸다. 이 Node24 실행에는 OS sample이 없으므로 재해시와 같은 원인이라고 단정하지 않는다.

이후 CPU 슬롯을 분리하여 같은 archive·수정하지 않은 fixture·기존 timeout으로 해당 사례만 독립 재실행했다. Node24는 1188.728ms, Node20 native100k는 62529.875ms에 통과했다. 두 결과는 원 사례의 재실행 증거이며 실패 기록을 대체하지 않는다. 특히 원 format6 같은 프로세스 offline/rebase, 간헐적 registry 정체, full-frame P95/100cycle 완료 근거가 아니다. 정확한 fixture hash와 실행 버전은 `retry20.json` 및 `retry24.json`에 보존한다.

## 전체 검사에서 확인한 소유권 수리

첫 전체 normal coverage는 10442개 중 5개 실패였다. PRIMITIVES의 상대 링크, 문서 bundle ceiling 동기화, frame provenance의 가벼운 의존성, interaction의 animation 역참조, planner/batch sampler 순환 참조가 대상이다. 설치본 408개 runtime 사례는 이 실행에서도 전부 통과했다. 원 실패 로그는 `pre-boundary-full-normal-coverage.log`에 보존한다.

경계 규칙을 완화하지 않고 공통 concrete 행 읽기를 `core/sceneRows.js`, 구조 검증을 `grammar/schemas/batchScene.js`로 옮겼다. 기존 함수 본문과 검산은 유지한다. Planner는 이미 소유한 준비값을 batch sampler에 명시 전달하고 sampler는 sample에 필요한 불변값만 저장하며 planner callback을 보존하지 않는다. 이 소유권 수리로 runtime artifact가 달라져 새 archive에 대해 다시 검증한다.

첫 전체 coverage에서 `persistence/validation.js`는 99.74/98.67/100으로 원 floor를 충족했다. `animation/geoFrames.js`의 branch 88%는 미충족이어서 미일치 slot/owner와 실제 drawing slot 검산의 회귀를 추가했다. 새 row/schema owner에도 기존 critical 95/90/100을 적용한다.

## 동일 archive 재검사의 stdin 전송 수리

경계 수리 후 archive `349dbf2925ab89ff2a72cafd7d86f127455b0af324cca43e04dc541b6533ba9d`의 첫 Node20 실행은 405/408, Node24는 407/408이었다. Node20 원 native100k는 62828.092ms에 통과했다. 실패는 fresh child의 원 timeout이었으며 Node20 세 사례는 conditional encoding, keyboard focus, geographic routes, Node24 한 사례는 static delivery replay였다. 원 matrix와 독립 재검사 기록을 보존한다. 독립 Node20 재검사는 두 사례가 통과했으나 keyboard는 다시 실패했다.

Keyboard child의 OS sample 1574/1574는 `ReadFileUtf8 → uv_fs_read → read`로 표준입력을 기다렸다. 이 사례의 42988bytes를 전달하는 순수 Node 반례는 ggaction import 없이도 30000ms timeout을 재현했다. 같은 bytes를 읽기 전용 임시파일 fd0으로 전달하면 29.662ms에 byte-for-byte roundtrip했다. 이는 기록한 keyboard 정체를 제품의 deserialize 이전 입력 전송으로 좁힌 근거다. 다른 모든 timeout의 원인을 이 표본만으로 단정하지 않는다.

`consumers/input.js`는 위 네 fixture의 입력 전송만 file-backed stdin으로 바꾼다. 자식 프로세스와 code, 정확한 입력 bytes, 30000/60000ms timeout, maxBuffer, offline network 차단, 모든 결과 검산은 그대로다. 파일과 descriptor는 성공/실패 모두 정리한다. Empty/binary/Korean/42988bytes 및 child 실패 보존 테스트를 추가했다. 제품 runtime이나 frozen archive는 바뀌지 않는다. 기존 파이프 실패는 제품 성능 병목인 WeakSet 재해시와 별도로 보존한다.

## 최종 기능 checkpoint 검증

- 전체 normal coverage **10446/10446** 통과. Lines 97.38%, branches 95.63%, functions 99.35%, 기존 및 새 owner를 포함한 **776 critical floors** 통과.
- 동일 archive `349dbf…ba9d`의 Node20/22/24 각각 설치본 408개 runtime, strict TypeScript, MCP, 실행 문서, 6개 browser bundle 통과. Node20/24의 stdin 전송 수리 후 전체 matrix를 재실행했다. 전체 normal 안의 Node22 설치본 408개도 다시 통과했다.
- 설치본 minified Chromium DPR1/2에서 format6 재생과 공통 6개 paint 검증 통과. 소스 runtime 입력은 0개다.
- 1203개 focused owning 검사, 실제 1k의 6scale 및 fallback/timeline/mixed 전체 frame·native·offline·rebase 비교, 100sample/10rebase 수명 검증 통과. 수명 oracle은 old objects/plan/rebase objects를 회수했고 원100k heap qualification으로 확대하지 않는다.
- Package 상한은 실측 최대 1267 entries / 1833498 packed bytes / 8236966 unpacked bytes다. Animation gzip 실측353156에 맞춘 최소100-byte 단위 상한353200을 기록했다. 이는 artifact footprint만의 조정이며 workload·runtime guard·SLO를 바꾸지 않는다.

검증 원본과 실패 이력, source/runtime archive 대응, fixture 및 harness hash는 인접 evidence의 `qualification.json`을 참조한다. 원100k 같은 프로세스 offline/rebase와 50ms/P95/100cycle는 위 체크리스트대로 미완료다.
