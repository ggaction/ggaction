# 완성된 circle 숫자 열의 구조 증거 검토

상태: 읽기 전용 prototype. 제품 source는 `9cc6e89c3`/metadata `c12f89030` 그대로이며 이 문서는 새 제품 채택을 기록하지 않는다. [원시 증거와 해시](circle-column-proof-evidence/qualification.json), [구체 3파일 patch](circle-column-proof-evidence/proposal.patch.gz), [loader](circle-column-proof-evidence/loader.mjs.gz)를 함께 검토한다. 원 50ms/P95/100cycle 및 같은 프로세스 100k 재기준화 offline 미완료를 유지한다.

## 측정 근거

원 100000행 입력, 명시 format6, 원 capacity, prepare 후 명시 GC, timer 안 fully materialized frame 생성, timer 뒤 모든 좌표 검산을 사용했다. 기본 source의 단일 sample132.58ms, Inspector second110.45ms였다. CPU profile의 `sampleTransition` 조상 아래101.5ms 중 `ownDataProperties` self57.125ms, circle-batch validator49.375ms, compiler27.208ms였다. Inspector post/stop 등을 포함한 바깥240.166ms는 별도로 제외했다.

`validateConcreteGraphicProperties`의 기존 exact properties/type WeakMap 때문에 compiler의 같은 properties 재검사는 이미 O(1)이다. 반복 비용은 새 sample의 새 x/y/radius 배열에 대한 최초 descriptor 검사다. 원 100k에는 10개 run×3 columns, 총300000 원소가 해당한다. 이 구분을 유지하며 renderer마다 전체 검사가 반복된다고 주장하지 않는다.

## 가장 작은 구체 후보

`grammar/schemas/circleBatch.js`에 private package 내부 creator `createCircleBatchColumn(length, valueAt)`을 둔다. length1..10000을 먼저 확인한 뒤 `Array.from({__proto__: null, length}, ...)`가 각 own index를 만들고, callback의 결과가 숫자 primitive인지 확인한다. 생성 중 실패하면 결과·증거를 발행하지 않는다. 완성된 배열만 기존 core `freezeOwned`로 동결하고 모듈 private WeakSet에 구조 증거를 기록한다. Callback에는 index만 전달하며 배열·writer·등록 token을 노출하지 않는다.

`validateCircleBatchColumn`은 정확한 제작 증거가 있는 배열에서만 `ownArray`의 구조 검사를 재사용한다. x→y→radius의 finite/음수 순회, 세 length 일치, appearance 검산의 기존 순서는 그대로다. Infinity/NaN은 creator에서 미리 거부하지 않아 기존 validator 오류 시점을 유지한다. 숫자가 아닌 결과 거부는 새 private creator의 소유권 보장이고 실제 두 생산자의 기존 계산은 항상 숫자를 반환한다.

| 대상 | 실제 생산자와 소유권 | 유지하는 검산 |
| --- | --- | --- |
| x/y positions | exact `preparedBatches` token이 닫힌 scalar plans를 결박한다. Creator callback은 기존 보간과 mapper를 한 번씩 실행한다. | 첫 row 원 sampling, 이후 row finite 확인, RangeError/비유한 결과의 기존 fade. 실패 sentinel은 외부에 노출되지 않는다. |
| radius | sampler가 기존 track·source·target·identity를 읽고 원 보간을 실행한다. | 모든 row의 현재 target/key/itemKey/role/native origin 대응. 그 뒤 기존 finite/음수 검산. |
| appearance | 기존 sampler가 만든 별도 record다. 숫자 열 증거와 무관하다. | 기존 `validateCircleAppearance` 전체. |
| caller/copied/frozen/forged 배열 | 제작 proof에 등록되지 않는다. `isOwned`만으로 인정하지 않는다. | 기존 descriptor/dense/extra key/getter 거부와 값 검산 전체. |
| frame/renderer/hit 권한 | 변경하지 않는다. Creator proof는 배열 구조만 증명한다. | 기존 maxOutputNodes, endpoint 대응, private native provenance, 4renderer 공통 validator. |

첫 prototype의 `new Array`+index assignment는 inherited numeric setter가 own 쓰기를 가로챌 수 있어 구조 증거로 부적절하다고 판단했다. 해당 loader/profile은 실패한 설계 증거로 보존했고 채택 대상에서 제외한다. 최종 candidate는 `Array.from`의 own data property 생성으로 바꿨으며 `Array.prototype[0]` setter가 있어도 own0=4를 생성하는 반례가 통과했다. 최초 timing83.46/62.46ms는 최종 후보의 수치로 쓰지 않는다.

## 실제 검산과 한계

- 최종 candidate는 기준과 1k 9변형(6 scale, fallback, timeline, mixed)의 전체 frame/position/native/offline/rebase 및 wire 해시가 같다.
- 10개 정상·다중 오류·비유한·음수·길이·접근자·sparse·extra property 사례의 결과/오류가 같고 getter0이다. 생성 callback 실패 시 결과 미발행, 길이 선행 제한, 숫자 primitive만 수용, ±0/극값, caller 격리, inherited setter도 확인했다.
- 원 focused30/30이 loader 아래 통과했다. 1k sample100회/rebase10회/GC5회 뒤 이전 객체 회수, 별도 creator100회 뒤 callback/input/array weak refs 모두 회수됐다. 원100k 장기 heap 검증은 아니다.
- null-prototype 보강 직전 candidate의 원100k는 native full-frame 전100000좌표를 두 번 검산했다. 단일 first93.92ms, profiled second74.68ms로 여전히50ms 미달이다. source 디스크 해시는 baseline이며 profile에 적용한 loader source는 `profile-effective-source.json`, 최종 null-prototype source는 `effective-source.json`으로 구분했다. 최종 보강 source의 원100k는 아직 재실행하지 않았다.
- 직전 candidate profile의 sampler 귀속67.125ms 중 compiler31.625ms, creator23.958ms, 남은 ownArray15.084ms가 잡혔다. outside232.334ms는 제외했다. 단일 실행의 값과 CPU 귀속이며 P95나 보장된 개선율이 아니다. 작은 검증이 prepare 구간에 병행됐으므로 최종 exclusive 측정으로 대체해야 한다.
- 공개 API/schema/type/bytes/작업 한도와 global owned registry를 바꾸지 않았다. 제품 반영 시 durable creator/negative tests, owner critical coverage, 동일 package 3Node/browser 검증과 원 workload 전체를 다시 수행해야 한다.

다음 후보는 compiler의 정적인 keys 구조·유일성 검산이며 별도 검토 대상이다. 현재 후보에는 keyspace cache, 검증 생략, native 권한 이동, 지연 graphicSpec 생성이 없다. 남은 같은 프로세스 restore Rehash 병목은 이 sample 전용 최적화로 해결했다고 주장하지 않는다.


## 독립 검토와 추가 반례

Route agent의 읽기 전용 검토는 위치 실패 sentinel의 원 fade/throw 구분, radius 이후 기존 오류 순서, private weak proof의 callback/input 미보존을 확인했다. 동시에 `{length}`가 `Object.prototype[Symbol.iterator]`를 상속하면 Array.from이 iterable을 선택할 수 있다는 반례를 독립적으로 제시했다. 최종 prototype은 null-prototype array-like로 이를 차단했다. 길이1 요청에 상속 iterator가2개를 제공해도 출력 길이1을 유지하는 검사가 통과했다. 원1k9변형/30 focused/10결과·오류 및 creator·frame 수명을 이 보강 뒤 다시 검산했다. Host built-in 함수 자체 치환에 대한 새 sandbox 보장은 하지 않는다.

후속 keyspace cache는 아직 구체 구현/채택 전이다. 독립 검토의 조건은 전체 tuple hit 확인 전 prefix 검산을 건너뛰지 않을 것, miss면 처음부터 원 경로를 실행할 것, 사전 조회가 getter를 실행하지 않을 것, entries·reference-bearing entry·single node.key까지 exact immutable own-data일 것, 전체 compile과 마지막 snapshot 성공 후에만 발행할 것이다. 이런 조건 없이 사전 lookup을 하면 이른 clip 오류보다 늦은 getter가 먼저 실행되거나, 중간 getter가 뒤 entry를 바꾸거나, prefix와 바뀐 suffix의 중복 key를 놓칠 수 있다.

first keys WeakMap 값은 anchor별 한 slot이므로 전역 상수 공간이 아니다. Anchor가 살아 있으면 companion key arrays를 보존한다. 성공 교체 시 이전 companion 회수·실패 시 새 companion 미보존·anchor 보유 시 의도한 companion 보존·anchor 폐기 시 전체 회수를 별도 검사해야 한다. 이 조건들은 후속 설계의 검토 사항이지 현재 제품의 구현 사실이 아니다.
