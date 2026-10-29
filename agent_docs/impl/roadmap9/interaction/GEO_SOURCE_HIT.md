# Geo 중간 프레임의 원본 항목 metadata

## 진행 상태

- [x] 기존 remainingApproval과 parent/Geo owner의 구체 origin 합의 재사용
- [x] 실제 native program + childPath + owner + 원 feature key의 닫힌 조회
- [x] 기존 class별 한 번 등록하는 item reader에 source reader를 함께 고정
- [x] 중간에 처음 보이는 source feature, 중첩 namespace, clip/opacity, source revision 반례
- [ ] Geo 공개 sampler의 동적 presentation/decision proof와 합산
- [ ] 공개 Geo camera sample → 실제 browser/installed current-frame 검증

이 checkpoint는 새로운 공개 옵션·저장 schema를 추가하지 않는다. 공개 Geo typed sampler는
별도 owner의 후속 연결이다. 원 STEP070/077 완료로 표시하지 않는다.

## 단일 소유

기존 `materialization/selection/itemResolver.js`의 exact-constructor registry가 final/source
두 reader를 한 번만 frozen record로 등록한다. Full/Basic assembly는 기존
`resolveMarkItems`/`resolveMarkSourceItems`를 전달한다. 신규 public registry나 callback API는
없으며 constructor 상속으로 권한을 얻지 않는다. Browser interaction은 여전히 Full/native
policy 구현을 import하지 않는다.

`hitProgram`이 읽는 private origin은 기존 `{program,index}` 또는
`{kind:'geo-feature',program,childPath,ownerId,itemKey}`다. Geo owner는 실제 native presentation에서
후자를 만들고, 실제 sample identity의 part role/topology/lineage와 대응시키는 closed proof를 소유한다.
Hit는 index를 만들거나 그림에서 feature를 추측하지 않는다. `childPath`는 실제 composition children의
ID를 순회하고 namespace는 해당 spec에서 만든다. 알려진 owner의 source items만 같은 final-grain
policy로 읽으며 exact scoped key와 geometry/projection reference revision을 대조한다.

같은 frame 준비에서 scope/owner source 집합은 한 번 읽고 key Map으로 찾는다. Character/count/path
비용은 기존 10M work 및 100k item 한도에 합산한다. 이전 frame/plan이나 새 전역 source cache는
보관하지 않는다. Weighted source metric 조회는 primary metadata의 lineage와 분리하여 서로 다른
native revision을 잘못 비교하지 않는다.

## 활성화 권한

Inspectable current feature가 native 프로그램의 최종 picture에 없을 수 있다. Current INTERACTION의
정책대로 keyboard/click activation은 현재 native final items와 교집합을 유지한다. 숨겨진 native
feature를 source membership만으로 선택 가능하다고 새로 약속하지 않는다. 현재 frame의 겹친 여러
part는 같은 semantic item 후보 하나이며 opacity와 clip은 기존 hit geometry owner가 판단한다.

## 검증 계획과 결과

`test/unit/animation/geo-source-hit.test.js`는 실제 native Geo source와 native materialized picture로
frame fixture를 만든다. 아직 공개 sampler가 생성하지 않는 origin association만 private proof에 넣어
새 consumer 경계를 분리 검증한다. Fake endpoint index나 pixel→feature 추론을 사용하지 않는다.
앞·뒤 두 feature 중 뒤 feature는 endpoint에 없으며 같은 위치의 MultiPoint 두 part가 중간 picture에
나타난다. Literal center(120,90), exact resource `world@0`, 중첩 row/map 경로와 namespace,
키/owner/revision/권한/source kind/accessor/10M work 거부, frame 수락 뒤 native focus 부재와
program/history 불변을 검증한다. 잘못된 초기 test fixture API/scene 시각은 로그에 보존한다.


관련371개와 새 owning4개가 통과했다. 후자의 clip/명시 focus 거부 assertion은 source 변경 없이
추가했으므로 두 수치를 합산하지 않는다. 두 변경 owner coverage는 hitProgram100/95.18/100,
itemResolver100/100/100이다. Source/package/discovery35, architecture path1, Node20/24의
owning16개씩도 통과했다. 전체 repository suite나 새 public Geo browser를 실행했다고 주장하지 않는다.

동일 archive `e570671394157045fd971f3bcfcf36c896b1b43d1eac2390bba7c75bcbafbb11`로
Node20/22/24의 기존 public interaction3사례, strict type, optional peers 및6entry bundle를 검증했다.
Package1132entries/1613366packed/7328382unpacked의 최소 cap은1132/1614000/7329000이다.
Node20/24 interaction130506gzip만 새 cap130600이 필요했고 다른5entry cap은 유지했다.
처음 packed cap 실패, 초기 fixture 수리, 좁은 coverage의 기존 callback 미도달 로그를 모두
`geo-source-hit-evidence/`에 보존했다. Public Geo sampler 생성·렌더러/브라우저/설치 결합은
Geo owner와 후속 checkpoint에서 닫는다.

Source `a9cc561e84538c4918fae4b4981efb31d4522612`가 원격에 push됐다. 이 source pin은
메타데이터만 추가하며 runtime/archive는 검증한 그대로다.
