# Sampled identity metadata 재사용

## 진행 상태

- [x] 원 100k CPU profile에서 의미/endpoint 재구성 비용을 확인했다.
- [x] 제품 변경 전 loader prototype으로 기존 애니메이션 761건과 실제 1k 전체 replay를 검산했다.
- [x] 아래 정확한 private 경계를 기존 `remainingApproval`로 채택했다.
- [x] 제품 source owner coverage, 설치 archive/browser 및 통합 검증
- [x] 원100k 전체 좌표·native/offline·rebase·원 work/wire 검산
- [ ] Canvas 포함50ms, P95·100회 retained-heap

승인 근거는 [포괄 승인](../AUTHORIZATION.json)의 `remainingApproval`이다.
동일한 semantic/graphic/public API와 현재의 native 권한을 유지하고, 이미 검산한 immutable
metadata를 다시 만드는 비용만 제거한다. 새로운 사용자 입력이나 시각 결과를 정의하지 않는다.

## 채택한 경계

`animation/frameEndpoint.js`의 private WeakMap은 live plan마다 마지막 immutable identity vector
하나만 기억한다. 모든 현재 decision·source index·Geo/axis identity 검산을 기존 순서로 수행한 뒤,
새 vector의 길이·hole 존재·각 identity의 exact reference가 모두 같을 때만 이전 vector를 쓴다.
Endpoint 및 native meaning 구성까지 성공한 뒤 마지막 vector를 교체한다. 과거 frame, scene,
graphicSpec, plan 참조를 cache 값에 저장하지 않는다. 새 native authority를 만들지 않는다.

`animation/endpoints.js`의 별도 private WeakMap은 exact owned identity vector를 key로 하여
이미 완전히 검산한 `matching`과 직전 `sources`만 보유한다. 처음 접한 vector는 기존 graphic
identity·중복 검사를 전부 통과해야 한다. Sources는 현재 scene의 node 수·hole 존재·모든 key가
같을 때만 재사용하고, 달라지면 현재 순서로 재생성한다. 값에는 primitive key/index 문자열과
immutable record만 있으며 scene/frame/native program/권한은 없다. 같은 내용의 caller clone,
freeze, 새로운 vector는 cache proof가 아니다. Top-level 소유권·length 검사는 매번 유지한다.

매 frame의 scene·graphicSpec·progress·decision 및 native origin은 현재 결과로 구성한다.
Matching 재사용은 native 권한 부여나 준비 work 면제와 무관하다. Rebase planner의 validation과
작업량 검사는 그대로 실행한다. 두 map은 weak key 수명이며 history/progress 목록을 보유하지 않는다.

## 제품 변경 전 증거

`10103dc24`와 같은 runtime source에서 loader 후보를 실행했다. 1k v3/v4의 전체 frame·meaning,
native/offline·batch·sampled/timeline rebase·mixed GeoText·shape fallback 및 preparation work가
동일하고 native/rebase/timeline wire bytes/hash도 동일했다. 이후 sample counter는 core clones
6,035→6,034, owned add10,048→8,044, 전체 WeakSet.add16,084→14,079,
WeakSet.has39,151→36,145였다. 이것은 CPU 시간/SLO 증거가 아니다.

별도 경계 검산은 현재 graphics 유지, node key 변경, invalid/duplicate identity, caller clone/freeze,
잘못된 decision, offline authority0을 확인했다. Live plan과 새 frame을 유지한 채 이전 frame·scene·
graphicSpec·변경 point node·properties의 WeakRef5개가 GC 후 모두 비워졌다. 소형 수명 검산으로
100회 retained-heap 인수를 대체하지 않는다. 최초 경계 driver는 static import 때문에 loader가
늦게 적용되었으며 실패 로그를 보존하고 `--import` 선행 로딩으로 수정했다.

## 제품 checkpoint 증거

[기계 기록](frame-metadata-merged-evidence/qualification.json)은 실제 source16개의 SHA를
동일 archive 내용과 대조한다. Owner764/764, 경계34, 문서truth3, render52/52가 통과했다.
`endpoints.js`는100/100/100, `frameEndpoint.js`는100/96.48/100(line/branch/function)이다.
Root의 실제 제품1k 비교에서도 전체 frame·meaning·work·v3/v4 wire가 동일했다.
독립 agent도36line 변경에서 current decision 검산·offline 권한·cache의 frame 비보유를 확인했다.

원100k 전체 좌표·오프라인 whole-frame·rebase 좌표가 통과했고 native/rebase 저장은
33,703,073/41,202,280B로 그대로다. Preparation work4개는78,333,686/97,911,711/
46,333,687/133,456,501로 동일하며 기존 batch50 제한도 유지했다.
이 기능 harness의 sample 단독 진단은 첫6,216.6ms/반복7,810.5ms였다. Plan 직후 별도GC 없이
실행했으므로 GC 후 측정한 앞선1,120.1ms profile과 직접 비교하지 않는다. 처리량 향상을
주장하지 않으며 실제 환경의 변동/할당·GC 병목 및50ms 인수는 후속 조사 대상으로 남긴다.
OS sample도 원본으로 보존했으며 여기서 특정 registry 누수 원인을 확정하지 않는다.

Archive `972e1de9ed174dd654b5ee2c15426efe6dc430765bef1a7a3911004f975a44a7`를
Node20/22/24의 runtime·strict types·7개 animation 문서·peer·6개bundle 및 minified installed
browser(DPR1/2,v3/v4)에서 공유했다. Node20의 기존 bundle ceiling 실패는 보존하고 같은
341,046B 측정에 최소341,100B를 적용해 재검산했다. Archive ceiling도 실제
1259entries/Node22packed1,809,081/Node20·24packed1,812,333/unpacked8,154,283B에 맞춘
1259/1,812,400/8,154,300이다. Runtime guard는 바꾸지 않았다.

현재 STEP-057–070 완료 또는50ms 달성을 주장하지 않는다.
