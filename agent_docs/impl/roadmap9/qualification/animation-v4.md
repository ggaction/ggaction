# Animation 명시 node 옵션 및 version4 공개 연결

## 상태·승인·기준

- [x] 기존 전체 승인과 root의 구체 wire/API 채택 재사용
- [x] flat node 옵션·version4·v3 호환·interrupt·선언·현재 계약·실행 문서 동기화
- [x] 읽기 감사의 inherited leave/depth/view 및 version descriptor, header preflight 수리
- [x] 최종 source 동결 owning/critical·계약·문서·browser·동일 archive3Node 봉인
- [x] 원 point100000→partition10000 공개 native/offline/sample/rebase 최종 receipt 봉인

[remainingApproval](../AUTHORIZATION.json#remainingApproval)과 2026-11-02 root 채택에 따른다.
Private source checkpoint `f5423fc6877fb137b4af52d8e693d1f792a461de`, provenance pin
`5830b7b48fa6a9eeea19102b6d3ccd6f35c99954`에서 이어진 별도 개념 checkpoint다.
[Private 원값·자원 검증 기록](animation-codec-private.md)의 성공을 공개 wire 성공으로 전용하지
않으며, 새 metadata 배치 전체를 아래 공개 제품 receipt로 다시 검산한다.

현재 정확 API·limits·wire는 [Animation Current 계약](../../../contract/current/ANIMATION.md)이
소유한다. 이 문서는 채택 근거·실측·검증 범위·미완료 성능 의무만 보존한다.

제품 source checkpoint `b4585c221eca54ce567a30748aa5fd42a6286bde`를 commit/push했고,
그 commit으로 provenance/machine/LLM을 pin한 뒤 docs243/243를 다시 통과했다.

## 공개 경계와 호환

두 node 옵션이 own-absent면 기존 version3 경로와 work/오류 순서를 호출한다. 하나라도 명시하면
그 옵션을 정규화하고 exact native owner admission 뒤 version4/transition4만 만든다. Partial의
다른 한도는10000, own undefined는 오류다. Rebase와 player.interrupt는 명시값을 다시 요구하고
이전 plan의 수치를 상속하지 않는다. 기존6개 runtime export와 package 경계는 그대로다.

Wire의 from/to/timeline Node는 검증된 lossless column owner에서 그대로 취한다. Metadata와
공통 vectors를 포함한 실제 wire 전체에 native prepare부터 독립 byte/physical preflight를 한다.
Offline은 wire의 descriptor/bytes/physical 상계를 먼저 검산하고 duration/easing 및 kernel 이름·
version/timeline manifest를 column 확장 할당 전에 검산한다. 이후 모든 ref/length/run/shape와
logical expansion을 검산한 원 실제 endpoint를 기존 strict actual graphic·meaning·identity
validator에 전달한다. Family manifest의 정확한 존재는 복원된 실제 endpoint 기준으로 검산한다.
모든 원 planner/partition charge와 private fixed140M/12M/16M/16M, envelope64MiB/depth128/
encoded 및 decoded각1M은 유지한다. Native authoring 권한을 offline에 복원하지 않는다.

반복 serialization은 같은 canonical bytes다. 기존 v3 payload와 공개 literal 회계는 바꾸지 않는다.
TypeScript는 생략 요청을 정확 version3, 필수 명시 숫자 옵션을 version4로 추론하며 동적
TransitionOptions는3|4다. 첫 소비자의 기존 `const version:3` 반례를 보존하고 이 overload로
호환성을 회복했다. Primitive/codec 권한 위조·raw/retained owner 경계는 private checkpoint와
같은 정책을 소비하며 다른 family10k 및 geometry/sample/timeline/batch10M/weighted64를 늘리지 않는다.

## 감사 및 중간 증거의 구분

D의 독립 읽기 감사는 다음 실제 반례를 찾았다. 이 checkpoint의 회귀가 직접 검증한다.

- Envelope stack의 absent leave/depth를 상속으로 읽으면 getter 실행 및 walk 생략이 가능했다.
  Leave는 own tag 존재를 먼저 분기하고 enter에서만 own depth를 읽는다. Getter0와 count/depth/
  cycle guard를 검산한다. 정상 원 회계·수치·bytes는 그대로다.
- Native endpoint의 absent view를 세 번 직접 읽었다. Closed validation 뒤 own view만 지역
  변수로 읽어 반복 검사에 넘기며 v3/v4 복원 getter0를 검산한다.
- Version dispatch의 accessor descriptor에는 own value가 없다. Descriptor의 own value만 읽어
  입력 version getter와 Object.prototype.value getter 모두0이며 기존 accessor 거부로 끝난다.
- 잘못된 duration/easing/kernel metadata를 column 확장 뒤 거부하던 순서를 앞당겼다.
  올바른 wire/geometry는 동일하며 bad header는 column `new Array`0으로 거부된다.

마지막 descriptor 수리 전 원100k 첫 공개 실행도 전수 성공했다. 그 receipt는 pre-descriptor에
분리한다. 최종 source에서 원100k와partition10000을 다시 직렬 실행하며 이 이전 결과를 최종
source 성공으로 합치지 않는다. 원 입력/모든 ID·좌표·scale·style·family·timeline을 축소하지 않는다.
Heap 상한6GiB는 그대로이며 각 단계의 계획 참조를 별도 함수 scope에서 해제한다.

현재 첫 공개100k receipt의 bytes는 native33703073/rebase41204160B, strict restore의 원 work는
97911711/133456501이다. 최종 하네스는 이 byte 수치와 원 charge까지 같아야 한다고 검산한다.
정확한 최종 수치·소스 SHA·실행 log는 원 두 fixture가 끝난 뒤 아래에 고정한다.

## 성능 의무

이 checkpoint는 기능·무손실 저장·자원 admission 범위다. Common sample의 기존50ms,
P95·retained heap·sync50ms와 interaction100k 완료가 아니다. Canvas 실시간 재생을 우선하며
SVG의 정확 출력/내보내기는 유지한다. SVG DOM 갱신 속도 요구를 새로 추가하지 않는다.
Private Node24 약3.55초, 첫 공개 진단 약3.34초의 단발 sample과 Node20/22의 이전 장시간
취약 비용은 미해결 성능 증거다. 원 benchmark fixture/SLO/원 charge를 바꾸지 않는다.


## 최종 공개 원 fixture receipt

[Point100000](animation-v4-evidence/product-100000-phased.json)와
[partition10000](animation-v4-evidence/product-partition-10000-phased.json)는 마지막 descriptor
수리 이후 같은 source14개 SHA에서 각각 한 번씩 직렬 실행했다. Node24.22.1, heap6144MiB,
임시 label/index/guard 우회0, instrumentation0의 공개 planTransition/serializeAnimation/
deserializeAnimation 경로다. 모든 원 행·item·좌표/path command·decision과 offline 전체 frame
대등성, rebase t0 exact frame identity 및 원 batch10M 거부를 통과했다. 실행 script/log와
[증거 hash](animation-v4-evidence/hashes.json)를 함께 보존한다.

| 최종 point100000 | Native | Sampled rebase |
| --- | ---: | ---: |
| 원 strict restore work | 97911711 | 133456501 |
| 원 native preparation work 최대 | 78333686 | 46333687 |
| full raw logical / descriptor / cell | 7600057 / 7600056 / 7600004 | 10100086 / 11500070 / 11500023 |
| independent intern work / metadata | 93556546 / 208 | 130934738 / 328 |
| 실제 decoded payload / encoded envelope 값 수 | 604516 / 608411 | 804885 / 809415 |
| 전체 animation envelope bytes | 33703073 | 41204160 |
| native prepare ms | 15810.7 | 19539.8 |
| offline restore·검산 ms | 38277.5 | 42563.5 |

Point 원 fixture SHA256은 b68cab72c1abb6094e715d6e5caa84c54aacf18750ad4a22fb63e3b8c5b2c39f다.
Sample3107.7ms이며 원100000 좌표를 독립 raw/scale 수식으로 검산했다. 원 envelope bytes가
pre-descriptor 실행과 같은지도 assertion으로 확인했다. Native 전체 envelope SHA256은
5deddb5bf0212105e24d586183e03c586f2061074b3f810e532c70961a18b580,
rebase는40871e27f426adb11a1d329cfe549f626095f8279fd01745ab6358daa974e8a5다.

| 최종 partition10000 | Native | Sampled rebase |
| --- | ---: | ---: |
| 원 strict restore work | 12785727 | 15770738 |
| 원 partition track charge | 16950544 | 16950544 |
| full raw logical / descriptor / cell | 720136 / 560067 / 560006 | 1090200 / 1010082 / 1010026 |
| independent intern work / metadata | 9914328 / 139 | 12412455 / 273 |
| 실제 decoded payload / encoded envelope 값 수 | 220685 / 541938 | 241158 / 563238 |
| 전체 animation envelope bytes | 8753223 | 9476692 |
| native prepare ms | 2738.1 | 2798.4 |
| offline restore·검산 ms | 3806.4 | 4117.7 |

Partition 원 root+9999 children fixture SHA256은
e204dd2c1ab81f7c75b8d32aa006841fcda7e1e140ffd6a983dc1d5b448e1a1e다. Sample690.6ms이며
모든10000 cell의 plot width460/510 원 command를 독립 oracle로 확인했다. Envelope SHA256은
native6f61499fc39b246c9a4c6c37a39931ac7e47e1ca834915ad4323438f37d32b47,
rebase2ade7bb84901170d7e97956d62257ca564dceebca081fda9cb0fe50304152f9a다.

두 receipt의14 source SHA가 실제 source와 같음을 후검산했다. Parent의 후속 position/appearance
최적화는 이 branch에 포함하지 않았으며 이 timing을 그 최적화의 효과로 계산하지 않는다.
Point phase별 GC 뒤 heapUsed717745200→726133856→733781016→733961344B, 최종RSS2647588864B다.
Partition 최종heapUsed120838312/RSS626343936B다. 이는 참조 수명 기능 진단이며 retained heap/
P95/50ms SLO 통과가 아니다. 이후 최종 source 변경이 없으므로 원 fixture를 재실행하지 않는다.


## 최종 동결 소형·패키지 검증

| 검증 | 결과 |
| --- | --- |
| 최종 animation owning + core/selector | 757/757 |
| affected critical owner11개 | 모두 floor 충족; aggregate98.99/96.40/99.61 |
| Planner / codec / resources | 100/93.75/100,100/98.05/100,100/97.75/100 |
| architecture/package/discovery/strict overload types | 45/45 |
| 공개 문서·선언·실행 예제 | 243/243 |
| offline assets browser v3/v4 각각 DPR1/2 | 1/1,4개 독립 context |
| 기존 animation renderer 회귀 | 52/52 |
| 같은 archive Node20.20.2/22.23.1/24.22.1 | 모두 Full/Basic/partition native/offline/rebase·TS·locked peers·6browser bundle 통과 |

[Critical metrics](animation-v4-evidence/final-critical.json)는 affected owner만 검산했다.
전체 repository coverage를 대신하지 않는다. 초기 owning의 time fixture가 quantitative role에
명시 time scale을 넣어 실패한 한 건은 temporal fieldType과 실제 date 값으로 고쳤고 최종757을
다시 통과했다. Source-free 첫 TS 오류와 첫 animation bundle cap 초과도 분리 보존한다.

Same-tar SHA256은 be5e5ff8b92e547823952763604213794874ba86422fb1a4f8dfbfe55fef4dd0다.
1246 entries/packed1794079B/unpacked8089773B이며 cap은1246/1794100/8089800이다. 공개
source-free 하네스는 installed package의 공개 API만 사용하고 private package path 차단을
검증한다. Full20point/Basic1point/partition10cells의 작은 소비자 검증이며 이3Node 결과를
원100k 각 엔진의 속도/retained-heap 성공으로 계산하지 않는다.

Animation entry gzip은 Node20/24에서339210B,Node22에서338094B다. 최소100B 단위cap339300만
정합했다. Full/Basic과 나머지 entry의 bytes/cap은 private checkpoint에서 늘리지 않았다.
Node 옵션을 설명하는 새 실행 문서의 search index 실측1091918B에 최소cap1092000을 적용했다.
패키지·gzip·search cap 정합은 fixture/원 SLO/제품 자원 guard를 바꾸지 않는다.
