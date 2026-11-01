# 암묵적 native 범례 lane

## 진행 상태

- [x] 기존 remainingApproval에 포함된 종속 guide 배치를 구체화했다.
- [x] Axis-free 네 edge와 categorical/size/gradient 공통 lane의 native 계산을 재사용한다.
- [x] 불완전한 중간 의존 그룹은 identity + guide-unavailable로 보존하고 strict restore 검증은 유지한다.
- [x] 집중/critical/네 renderer/browser/실제데이터/같은 tar 세 Node 검증.
- [x] Source dc704e9f6 pin, 문서30/빌드186pages·1598artifacts/변경페이지4width 접근성·overflow·console0.
- [ ] Same-edge axis-dependent inferred clearance와 dynamic reflow 의존 연결은 후속 의무다.

승인은 [AUTHORIZATION.json](../AUTHORIZATION.json)의 `remainingApproval`을 재사용한다.
공개 API 원형은 유지하고 guide manifest만 `native-guide-values@10`으로 올린다.
Root의 timeline/transition3 및 R의 label reflow8와 합칠 최종 manifest는 root가 정합한다.

## 단일 소유와 저장

`legendBlockState`가 기존 categorical/size/gradient의 normalization·sample·bounds style
선택을 소유한다. 기존 명시 group도 같은 dispatcher를 쓴다. `resolveSizeLegendConfig`는
native size의 categorical inheritance 규칙을 그대로 추출하여 action/materializer와 공유한다.
`legendLaneState`는 `{edge, frame, blocks:[{kind,target,values}], allowOverflow}`를 닫힌
의미값으로 저장한다. Frame은 한 번, 각 block은 native config/scale/exact font queries를
가진다. 기존 lane의 edgeKinds 순서, blockDescriptor/groupBlocks/occupied bounds,
layout/legendLane의 side/horizontal packing을 재사용한다. Action/trace/source 수정은 없다.

현재 frame과 실제 native 값·면적·symbol 크기에서 geometry를 다시 계산한다. Endpoint
좌표/offset을 추론된 의미로 간주하지 않는다. 같은 edge의 axis가 inferred clearance에
기여하면 아직 guide-layout fallback이며 조용한 pixel 보간은 없다. Border/clip/overflow,
자동 sample, 개별 local placement와 아직 지원하지 않는 sibling도 fallback이다.

## 엄격 복원과 중간 의존

Native projection/restore는 전체 lane의 동일 layout과 complete sibling keys를 검증한다.
표시 text 대신 typed value+role+target+scope가 identity다. Bounds를 바꾸는 직접 font/rotation/선
두께 수정은 전체 lane의 guide-edited다. Size는 면적 mapping 뒤 반지름을 계산한다.

최초 회귀는 color+size에서 size만 남기는 editLegend와 currentColor fade를 합친 경우다.
퇴장 중 color에 이전 lane 의미가 남아 sampled→rebase→offline에서 partial group 검증이
실패했다. 원 `.artifacts/implicit-lane-public-third.log`를 보존했다. Root가 승인한 최소
sample seam은 finish의 guide vector를 `retainSampledGuideMeaning`으로 전달하는 한 곳과
import다. 이 읽기 helper는 실제 sampled siblings를 검사해 불완전한 typed lane/group/title만
identity+unavailable로 낮춘다. Strict validator, 다른 scope와 renderer 출력은 그대로다.
다른 shared3 및 sample의 clock/geometry/metric/origin 동작은 수정하지 않는다.

## 검증

[qualification.json](implicit-legend-lane-evidence/qualification.json)에 최초 실패와 최종 결과를 분리했다.
427 animation + 마지막 text proof 11, 기존 native guide576, 계약21+4+10, 실제5source×14recipe,
대표4renderer 및12variants×2backend×DPR1/2를 확인했다. 동일 최종archive4f93e00117ac의
Node20/22/24 각6runtime·strict types·실행문서·optional peers·6bundles가 통과했다.
이전 archive는 rotation proof 보강 전 중간 증거이며 최종으로 재사용하지 않았다.
최대 animation292935gzip에293000 한도를 적용했다. 원 package/bundle 초과도 보존한다.
