# 고정 Canvas의 responsive guide와 bounded layout

## 진행 상태

- [x] STEP-034/035·geometry-design 계약과 기존 fitCanvas/guide transaction 대조
- [x] 전체 승인 `b758b912` 재사용; 새 질문 없이 아래 구현 선택 기록
- [x] private closed label policy와 4회/0.1px convergence reducer·독립 literal 시험
- [x] Canvas/axis authoring·wrapped materialization·inspection·codec 공개 연결
- [x] 실제 resize/font/revise·명시 child 교체·scene·네 renderer 검증
- [x] 고정 tar 설치 소비자·최종 문서 자격
- [x] STEP-034 완료 기록과 generated docs 동기화
- [ ] STEP-035 nested facet/shared guide 후속 통합

기준은 STEP-033 qualification `0aae2f639`와 합산 runtime `039deaf14`다.
현재 공개034 source는 아래 intent와 결과를 Full/Basic의 기존 action·inspection·codec에 연결했다.
[공개 구현 검증 기록](RESPONSIVE_COMPLETION.md)이 정확한 소비자 범위와 남은 자격을 소유한다.
STEP-035의 중첩 패싯/공유 가이드 및 AT-20 전체는 이 체크포인트로 완료하지 않는다.

## 기존 의미와 경계

`fitCanvas`의 명시적 확대·기존 iterationLimit 계약은 그대로 둔다. Responsive 모드는 고정된
outer width/height와 authored margin을 유지한다. Guide를 위해 추가로 필요한 lane은 그 margin
안이나 plot 영역의 명시적으로 계산된 reservation으로 표현한다. Font를 줄이거나 차트를 crop,
Canvas를 확대하는 fallback은 없다. 영역이 부족하면 `layout-unsatisfied`와 required bounds를
반환한다. Plot minimum을 만족시키기 위한 부족분도 CSS pixel로 보고한다.

최종 plot bounds의 단일 owner는 기존 `src/layout/canvas.js`의 `resolveGraphicBounds(program)`다.
Responsive mode의 derived plot reservation도 이 함수에서 읽는다. Mark·guide·coordinate·frame
adapters가 별도 margin 계산기를 갖지 않게 한다. Root 담당 `grammar/framePolicy.js`의 single-Y
검사는 solve 후 이 bounds로 집계한 실제 Cartesian region을 받는다. Distinct childPath/frame
identity와 non-Cartesian scope 분리는 원래 composition/coordinate owner를 재사용한다.

## 공개 연결 선택

기존 `createCanvas`/`editCanvas`의 `responsive: false | { minPlotSize?: { width, height } }`를
opt-in 경계로 사용한다. Omission은 기존 intent를 보존하고 false는 해당 policy/result를
제거해 native layout으로 다시 materialize한다. Plot minimum의 기본값은 기존 fitCanvas의
160×120 owner와 공유한다. Fixed outer Canvas와 exact-inner `plot`은 동시에 켜지 않는다.

Axis label option의 `responsive: false | { sequence?, maxLines?, skipStride?, rotationCandidates? }`
역시 원래 guide config에 한 번 저장한다. Policy는 Canvas responsive mode에서만 실행되며 false로 끈 동안에는 intent를 보존하고 derived 선택을 제거한다. 기본은
`sequence: ['wrap','skip','rotate']`, `maxLines: 2`, `skipStride: 2`,
`rotationCandidates: [-Math.PI/4,-Math.PI/2]`다. 순서를 바꾸거나 중복 단계는 거부한다.
Rotation은 기존 radians 또는 `{value,unit}` 입력을 받아 finite radians로 정규화하며 중복
숫자 후보는 거부한다. MaxLines 1..10000, skipStride 2..10000과 후보 길이 1..10000은 기존
generated item 한도를 재사용한다. 실제 후보×label 작업은 기존 work budget을 먼저 검사한다.
명시 null/undefined/잘못된 descriptor는 default로 대체하지 않는다.

원래 label을 우선 시도한 뒤, 실제 anchor 간격의 측정 가능한 폭으로 wrap한다. MaxLines는
문자열을 잘라내는 허가가 아니다. 다음 skip 단계는 원래 label 순서의 0,stride,2×stride를 남기고
tick/scale/domain/data를 바꾸지 않는다. 남은 anchor 사이의 폭으로 다시 wrap하며, 그래도 안
맞으면 그 텍스트·origin에 명시 rotation 후보를 순서대로 적용한다. 회전은 기존 common rotation과
text metrics owner를 사용한다. Explicit maxWidth/font/align은 그 값 그대로 검사하고, 시도마다
임의로 좁히거나 원래 guide intent를 덮지 않는다. MaxLines/skip/rotation 적용 stage와 reason은
resolved result의 inspection 값으로 노출한다.

저장 intent는 `materializationConfigs.canvas` 및 해당 `guideConfigs.axis[id].labels`가 각각
소유한다. Reserved lanes/plot과 선택한 fallback은 같은 owner 아래의 derived result이며 독립
mutable solver나 history resource를 만들지 않는다. Renderer는 이미 결정된 text lines·origin·rotation만
읽는다. Persistence는 결과의 닫힌 shape/bounds와 retained input을 검증하고 solver를 실행하지 않는다.

Closed label 정규화는 기존 rotation owner를 재사용하는 grammar에 두고, layout reducer는
core/layout 경계만 읽는다. 최초 source boundary 실패 뒤 그 두 책임을 분리했으며 허용
import 목록을 넓히지 않았다.

## 계산 순서와 private reducer

Wrapped orchestration이 text measurement → guide intrinsic bounds → reserved lanes → plot bounds
→ marks → final occupied bounds → ancestor composition 순서로 한 pass를 만든다. 기존 planner의
deduplication과 guide transaction을 재사용하고 transient intermediate program을 사용자에게 반환하지 않는다.
`evaluateResponsiveLayout(passes, {canvas,minPlotSize})`는 그러한 명시 pass의 plot/occupied/ID별 lane
bounds만 읽는다. Callback, program, font provider, renderer를 실행하지 않는다.

최대 네 measured pass에서 연속 두 결과의 모든 경계 좌표 변화가 0.1 CSS px 이하면 수렴이다.
Lane enumeration order는 의미가 없지만 lane identity/cardinality 변경은 수렴으로 보지 않는다.
현재 결과가 앞선 비인접 결과와 0.1px 이내로 반복되면 oscillation, 네 번째 결과까지 달라지면
iteration-limit이다. 수렴해도 plot minimum이나 Canvas containment를 만족하지 않으면
insufficient-space다. Invalid/nonfinite/overflow geometry는 입력 단계에서 거부한다.
Required bounds는 최종 plot·occupied·모든 lane과 minimum 부족분을 포함한다. Huge finite 위치
차이의 subtraction이 overflow하면 metric을 null(비교 불가)로 유지하고 수렴으로 통과시키지 않는다.

## 소비자와 남은 검증

Canvas edit와 동일한 retained layout intent 편집은 같은 concrete output으로 수렴해야 한다.
Data revision·scale/domain·font profile 교체는 기존 dependency plan에서 해당 guides/lanes와
ancestor snapshots까지 닫는다. 준비된 exact metrics에 새 wrapping query가 없으면 기존
metrics-required를 유지하고 원래 receiver/trace를 보존한다. Native fallback을 exact 측정으로
추측하지 않는다. Font 준비 closure는 동일 explicit materialization 경계를 반복 측정한다.

STEP-035에서는 3행 long-label·ragged/empty panel·shared legend/header/footer·nested concat을
full occupied bounds로 배치한다. Child root Canvas만 resize하거나 mark bounds만 정렬하지 않는다.
현재 scope의 final SVG/Canvas/PNG/PDF/scene·program/graphic codec·installed evidence가 모두
완료돼야 공개 완료로 기록한다. Parent의 selection namespace 및 single-Y owner와 파일 경계를
유지한다. Private 숫자 시험은 이 공개 consumer evidence를 대신하지 않는다.

## Private checkpoint 검증

독립 정상 시험 14개가 통과했다. Label normalizer coverage는100/100/100,
layout reducer는100/97.18/100으로 각각95/90/100 floor를 넘는다. Descriptor getter 무실행,
invalid/empty/zero/duplicate/10000 한도, finite 산술 overflow, lane identity/order, A-B-A 반복,
네 번째 미수렴, 정확0.1px와 그 직후 값, Canvas/plot minimum 부족분을 literal로 검증했다.
Source boundary/discovery/문서·coverage policy41개와 package 계약13개가 통과했다.

Private owner 두 파일의 canonical packed entry는871이다. Node20/22/24의 unpacked bytes는
5,860,433으로 동일하며 packed는 각각1,275,533/1,273,124/1,275,533이다. 원래869 entry 실패를
보존하고 한도만871/1,276,000/5,861,000으로 최소 조정했다. 측정은 임시 측정 전용 복사본에서
한도 assertion을 분리했고, 그 파일을 제거한 뒤 원래 canonical validator로 package 검사를
통과했다. 숫자와 log hash는 `responsive-evidence/summary.json`에 보존한다.
두 owner는 공개 entry에 연결되지 않았으므로 public bundle/type/API 값은 바뀌지 않았다.
