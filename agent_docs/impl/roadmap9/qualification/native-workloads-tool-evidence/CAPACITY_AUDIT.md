# Native workload 용량과 실제 비용 감사

기준: 도구 checkpoint `41487c00c`, 원 설치 archive
`c1b9fb3bd8a9be11eeba13288072ecbfdcf00b024fd29959da20663f0b3265a4`.
이 문서는 읽기 감사와 후속 제안이다. 아래 cardinality/공개 옵션 변경은 구현하지 않았다.
원 24개 크기×DPR 셀, 48개 stage, SLO, seed, 입력 행/vertex를 유지한다.
명시 한도 실패는 성공이나 N/A가 아니다. 최종 production archive의 warmup5+30 P95는 root 소유다.

## 최초 실패와 실제 소유자

원 stack은 `capacity-audit/blocker-stacks.jsonl`에 그대로 보존했다.

| 입력 | 최초 소유자 | 추가 확인 / 현재 계약 |
| --- | --- | --- |
| point10k CSS hit | `grammar/hitIndex.js` BVH tie 정렬 work | 입력 metadata의 이차 source 조회가 아니라 반복 전체 key 길이 과금. 10M preparation 상한 유지 수리 가능 |
| point10k / partition10k preview | `materialization/animation/guides.js` endpoint 길이10000 | 배경 포함10001. 이 검사만 제거해도 `animation/planner.js` 양 endpoint 합10000, `animation/sample.js` 출력10000이 남음 |
| point100k 및 종속 point load/revise | `core/validation.js::validateGraphicItemLimit` | Current MARKS의 raw/concrete point50k inclusive, missing skip 이전 검사. source 저장 용량과 별도 |
| Geo10k vertices | `materialization/geo/mark.js::resolveGeoMark` | 원 vertex가 아니라 실제 projected outputPoints 누적10000 |
| Geo100k vertices | `grammar/geo/stream.js::projectGeometry` | refined/output/command30000. concrete `grammar/pathTopology.js::MAX_PATH_COMMANDS`도30000 |

`capacity-audit/endpoint-boundary.jsonl`은 실제 point4,999개의 양 endpoint가 배경 포함10,000으로 성공하고,
point5,000부터 총10,002로 planner에서 거부됨을 보여준다. Current ANIMATION의 **양 endpoint 합** 한도는
명시 계약이다. 따라서 단순 off-by-one이나 중복 guide guard 결함으로 해석하지 않는다.

## 실제100k source 저장 규모

동일 `nativeWorkloadInput` 원본으로 공개 createData/createGeometryData만 실행했다.
guard를 끄거나 큰 concrete를 만들지 않았다. `capacity-audit/source-resource-volume.jsonl` 참조.

| 입력100k | 원 JSON UTF-8 | 저장 resource JSON UTF-8 | 추가 실제 수치 |
| --- | ---: | ---: | --- |
| keyed point rows | 5,935,758 B | 9,525,150 B | row key100,000개, key 문자2,888,890 |
| Geo LineString vertices | 2,352,803 B | 4,706,449 B | feature1, positions100,000, values300,010, source work1,489,000 |

이것은 source 저장 성공이며 full consumer 지원 증거가 아니다. 현재 point10k editable snapshot은
7,225,738자다. 100k snapshot/양 endpoint/의미 vector 크기를 이 숫자의 단순 배수로 확정하지 않는다.
100k point는 최소100,001 scene node(배경1 포함), 양 endpoint는 최소200,002 node가 필요한다.
현재 hit scene 자체 상한100,000도 별도 걸리므로 point 생성 옵션 하나로 해결되지 않는다.

Geo fixture의 이웃 vertex는 위도 차10도다. native source-segment refinement의 span5도 규칙상
99,999개 segment마다 적어도2개 segment로 나뉜다. 따라서 시작점을 포함한 refined line은 최소199,999점이다.
이는 코드/원 좌표로 산출한 **하한**이며 아직 전체 native output을 생성한 측정값이 아니다.
원 입력을 평탄화하거나 interpolation/precision/vertex 수를 바꾸면 같은 workload가 아니다.

## Hit 최소 수리와 후속 최적화 경계

`capacity-audit/hit-cost-prototype.jsonl`의 첫 행은 원 source hash
`49550ab1ac089fd721aec4986bd50171f2e46aefda7c2a33a1a1082c3e7f6de5`를 계측한 결과다.
scene670,066 + entries660,000 + metadata2,627,780 + signature3,857,780 뒤 BVH build2,184,412에서
10M을 넘었다. 같은 좌표의 tie 비교 때 node key 양쪽 전체 길이를 반복 과금한다.
hitProgram은 이미 context/identity/guide/profile Map을 사용한다. 이번 입력에서 source-lineage 이차 lookup은 발견하지 않았다.

읽기 전용 prototype의 실제 UTF-16 prefix 비교는 같은 순서를 만들면서 build약1,534,024,
누적약9.35M으로10k 전 항목 index와 exact row hit를 만들었다. 이 숫자는 계측 진단이며 P95가 아니다.
root가 이 구체 수리를 승인했다. 후속 제품 수리는 문자열 `<` 전체 비교를 별도로 실행하지 않고,
하나의 비교 함수가 읽은 code unit을 기존 work에 과금한다. 원 validation/serialization 전체 비용은 유지한다.

별도 후속 후보는 immutable node key의 lexical rank를 한 번 준비해 BVH tie에서 정수 비교하는 방식이다.
그러나 그 자체 정렬·문자·저장 예산을 먼저 계산해야 하며 이번 수리에 섞지 않는다.
Metadata signature를 hash로만 대체하거나 원 key/lineage를 축약하지 않는다. 100k 전체 문자열의 검증 비용이
10M 안에 드는지는 별도의 resource-aware identity sharing 검증이 필요하다.

## 다음 구체 정책 제안 — 아직 비구현

1. **기본값 유지.** 전역 MAX_GENERATED_ITEMS, MAX_WORK_ITEMS, path 한도를 통째로 높이지 않는다.
   native source가 가진 raw count와 실제 출력/문자/명령 수를 분리해 동일 정확 owner에서 검증한다.
2. **Point 명시 용량.** 필요하다면 기존 create/edit point 옵션에 bounded `capacity:{maxItems}`를 추가하고
   기본50k, 명시 상한100k로 정한다. 저장 위치는 point config 단 한 곳이다. `graphicCapacity`가 exact native
   owner/selected source raw count를 확인해 primitive 작성·편집·restore에도 같은 정책을 공급한다.
   임의 concrete나 다른 family가 point 권한을 빌리지 못한다. facets/concat 합계·missing/raw·source revise 실패를 검증해야 한다.
   이 옵션만으로 animation/hit/codec100k가 완료되는 것은 아니다.
3. **Animation 명시 용량.** 후보 `planTransition.options.capacity:{maxEndpointNodes,maxOutputNodes}`는
   기존 기본10000을 보존하고 explicit native capacity에서 계산한 유한 상한만 허용한다. guide의 빈 의미 vector는
   별도10000을 반복 적용하는 대신 validated endpoint 길이와10M 준비 work를 공유한다. 양 endpoint200002/출력100001은
   이 fixture에 필요한 최소치일 뿐 일반 무제한 허용값이 아니다. restore version·옵션·batch10M·dynamic actual output와
   weighted sources를 같은 owner에서 검산해야 한다. 반복 scale/identity/group 의미는 한 번 보유하는 bounded prepared state가
   실제10M 안에 들어가는지 먼저 검증한다. 64MiB envelope 한도를 조용히 올리지 않는다.
4. **Hit resource-aware scene.** indexed logical item100k와 실제 decoration 포함 scene count를 혼동하지 않는다.
   native scope로 검증된 item/decoration 상한을 별도 명시할지 exact prepared scene capacity를 받게 할지 설계해야 한다.
   현재100k scene와10M preparation/2M query는 그대로 유지하며 새 정책 전에는100k 셀을 미지원으로 남긴다.
5. **Geo는 단일 maxPoints 옵션으로 해결 불가.** source limits는 이미100k를 저장하지만 refined/path/mark 출력 한도가
   별개다. source kind·ref·projection/precision에 귀속한 bounded stream capacity와 concrete continuation 표현의 정확성을
   함께 설계해야 한다. 단순 path chunk는 cap/join/dash/opacity/shadow/holes를 바꿀 수 있어 채택하지 않는다.
   source vertex, refined vertex, command, graphic item, byte, stream work의 각각 실제 수를 보존하는 후보가 필요하다.
   기존 source limits나 private maxPoints로 path30000을 우회하지 않는다.
6. **Blocking slice는 별도 의무.** 현재 public deserializeProgram/reviseData는 동기 전체 호출이다.
   도구의 blockingSliceMs는 그 전체 호출을 잰다. promise로 한 번 감싸도50ms slice를 보장하지 않는다.
   CPU 최적화로 충족하지 못하면 기존 prepared update/worker 소유자와 명시 async preparation 경계를 검토해야 한다.
   현재 test의 전체 행 rematerialization을 제거하거나 source-only 작업으로 바꿔 통과시키지 않는다.

필수 후속: 각 정책의 exact limit/limit+1, caller/program/trace 불변 실패, forged capacity/codec, Full/Basic,
source revision, 모든 renderer/current hit, sampled rebase/offline 및 원 archive 기반 전 크기/DPR 검증.
이번 checkpoint는 위 제안들을 구현하거나 STEP071/AT56/077을 완료하지 않는다.
