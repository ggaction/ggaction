# 현재 Geo 프레임의 native 선택 연결

## 진행 상태

- [x] 기존 remainingApproval과 root의 구체안 확인 재사용
- [x] source membership·현재 picture·저장 key intent 소유자 감사
- [x] 현재 frame의 source-backed 항목만 keyboard/click에 연결
- [x] 투영 clipping과 원본 제거의 lifecycle 구분
- [x] current scope/revision·nested/clip/opacity·codec/history 회귀
- [ ] 실제 공개 Geo typed sampler와 browser/설치 합산

## 확정 최소 경계

새 public API·저장 schema는 없다. `selectMarks`/`editMarkSelection`은 이미 opaque item-key intent를
저장하고, native highlights는 현재 materialized items에만 적용한다. 확장 대상은 현재 frame에서만
보이는 Geo source item과 session activation의 교집합이다. 일반 native mark와 plain scene의 권한은
늘리지 않는다.

Private `geo-feature` origin은 D3의 exact native program/source reader로 검증한다. Frame 준비의
기존 private WeakMap에 현재 source association만 보관하며 과거 plan/frame을 보관하지 않는다.
Session은 원래 native owners 중 exact current program에 속해야 한다. 현재 native childPath와 Geo
owner의 source items를 다시 읽고, 실제 frame의 같은 scoped key와 resource kind/id가 겹친 항목만
추가 후보로 삼는다. Source identity key에는 typed feature key와 geometry logical identity가 포함된다.

중간 Geo 그림은 to endpoint의 geometry/projection revision을 사용한다. From 세션의 revision과
같다고 가정하지 않는다. Frame ref는 실제 to source에서, current native ref는 실제 current source에서
각각 검증한다. Geometry/projection kind/id, child scope, Geo owner, logical item key는 같아야 한다.
원본에 없는 key·다른 owner/child/resource·다른 program·stale frame은 권한을 얻지 않는다.

Focus는 기존 실제 hit-shape anchor와 clip/opacity admission을 통과해야 한다. Click 역시 실제 현재
후보가 필요하며 source에 존재한다는 이유만으로 hidden 항목을 활성화하지 않는다. Native action은
현재 program에 기존 item key intent를 저장하고 기존 원자 transaction/history/asset owner를 거친다.
Commit 뒤에는 기존 규칙대로 native picture로 돌아온다. 원본에서 투영만으로 숨겨진 key는 semantic
membership을 잃지 않으며, 명시 제거된 feature/owner/child는 keep-hidden/drop 정책을 따른다.

이를 위해 Geo의 semantic membership policy만 source items를 사용한다. Drawing/highlight와 공개
inspection의 현재 visible items는 그대로다. 그림상의 opacity/clip이 semantic membership 제거가
아니라는 Current INTERACTION의 기존 규칙을 Geo horizon에도 적용한다. Property predicate의
계산은 현재 concrete items에 남기고 source configuration을 graphic properties로 오해하지 않는다.

## 검증 구분

D3의 private origin fixture를 재사용해 native-hidden MultiPoint가 중간 그림에 나타날 때 semantic
후보 하나·focus·click/keyboard selection·단일 history commit을 검사한다. Unrelated hidden key,
다른 native resource ID 및 revision별 actual input, source removal, native commit 이후 stale frame,
중첩 namespace, 실제 clip/opacity0, codec 복원, keep-hidden/drop을 독립 expected로 고정한다.
Source/type/public prose를 동기화한 뒤 영향 검사와 동일 tar installed 경계를 검증한다. Geo typed
sampler가 동적 origin을 생성하는 실제 browser/installed 조합은 peer와 합산 후 닫으며, private
fixture만으로 STEP062/070/077 완료를 선언하지 않는다.

## Source·설치 검증

관련415개가 통과했고, 변경된8개 coverage owner의 line/functions는 모두100%, branch는
95.17–100%다. 새 helper family도 기존95/90/100 floor를 유지한다. Node20/24의 신규 및
기존 LOD owning20개씩, 최종 source/package/discovery42개, 선언/architecture를 포함한 앞선37개가
통과했다. 초기 broad의 null geometry 가용성2실패 및 keyboard→Full import 경계 실패를 보존하고,
각각 원본 drawable 상태 및 기존 단일 WeakMap 추출로 수리했다. Runtime 경계를 완화하지 않았다.

동일 `72c51d72c2261b6bd14b63a2cc56b5ac5e87777dd0359db0c7ffb24650a15e13` archive로
Node20.20.2/22.23.1/24.22.1에서 각각 공개4사례·strict types·optional peers·6entry bundle이
통과했다. 새 public 사례는 projection clipping→camera→codec→원본삭제의 membership이다.
동적 Geo sample 생성까지 검증했다고 확대하지 않는다. 기존 실제 Canvas/SVG·DPR1/2·겹친항목
browser8개는 source 및 동일 tar 설치본에서 각각 통과했다.

Package는1134entries/7332934unpacked, Node20/24 packed1618319, Node22 packed1614704다.
첫 entry ceiling 실패를 보존했고 최소 caps1134/1619000/7333000을 적용했다. 동일 archive의
최대 Full774102·interaction130975gzip에 caps774200/131000을 적용했으며 나머지4entry는 기존
ceilings를 유지했다. 첫 문서 검사35개 중 stale runtime reference1개는 정본 generator로 갱신한
뒤 owning38개가 통과했다. Source pin·built 문서 검증은 후속 metadata에서 닫는다.
`geo-frame-selection-evidence/summary.json`과 압축 로그·설치 receipt가 각 검사 범위를 구분한다.

Source `c0b60b49799cdbfa0c461dfc6f32eeae831d0d90`를 원격에 push한 뒤 provenance→machine→LLM을
다시 생성했다. Source-pinned 문서32개, 환경 preflight, Jekyll build,186 built pages/1598LLM
artifact link·hash 검사를 통과했다. 변경 interaction page의320/390/768/1280폭에서 overflow0,
Axe0, browser error0이며320폭 화면도 직접 확인했다. 최종 metadata commit은 runtime/type/hash와
검증한 archive를 바꾸지 않는다. 공개 Geo sampler와 실제 activation 통합은 peer에 이 안정 source를
전달했으며 별도 합산 evidence로 닫는다.


## Geo Text source-grain 후속

- [x] 기존 remainingApproval 및 부모/Geo 담당자와 동일 closed origin 확장 합의
- [x] native Text source-only helper 재사용, 원본 label selection과 lineage 유지
- [x] exact Geo Text owner/role·child/resource 검증 및 current-source 교집합
- [x] 의미 lifecycle/codec/clip/opacity 및 package 경계 검증
- [ ] Geo 담당자의 실제 typed Text sampler/browser/설치와 합산

Peer `07759d610`의 `resolvePreparedSourceTextEntries(...,{sourceOnly:true})` 최소 delta를 재사용한다.
Explicit finite source-anchor map은 membership admission 용도로만 주며 좌표·font·format을 계산하지 않는다.
기존 source reader에서 drawable item만 얻고 원 native all/inline/named selection을 적용한다. Geo Text
policy에서만 sourceMembership을 켜서 keep-hidden/drop이 projection clipping을 원본 제거로 오인하지
않게 한다. 실제 graphic-property predicate와 highlight는 native 현재 picture를 계속 읽는다.

Interaction의 eligibility는 작은 markKind owner를 재사용한다. 신규 public API/저장 schema는 없으며
Text role과 geo role을 native layer에서 확정해 frame identity와 대조한다. 원 frame/current program 각자의
source revision을 검증하고 같은 child·mark·resource kind/id·logical key만 활성화한다. 새 geotexts vector는
peer shared4가 소유하고 graph preview writer는 기존 proof spread로 그대로 보존한다.

새 bridge 회귀7개, 기존 Text/Geo/selection 결합201개, 최종 hit owning87개가 통과했다.
Hit owner coverage는99.31/93.10/100으로 기존95/90/100 floor를 유지한다. Source-only Text/selection
policy, frameSelection, markKind도 적용 floor를 유지했다. 설치 fixture는 공개 native Geo Text의
projection-hidden 선택 유지→codec→원본 삭제 drop을 검증한다. 실제 typed Geo Text sample의
현재-frame browser/renderer 연결은 peer shared4 checkpoint에서 별도로 합산하며 아직 완료로 표시하지 않는다.
