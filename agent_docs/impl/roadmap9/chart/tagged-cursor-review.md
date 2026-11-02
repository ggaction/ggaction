# Strict tagged JSON cursor의 실행 검토

## 상태

- [x] SHA 안정 `94f46b080`을 유지한 evidence-local prototype
- [x] 기존 tagged bytes/hash와 소형 exact 검산, UTF16 전수 및 실제 macrotask 취소
- [x] source owner 재사용·private signature·실패/할당 경계 구체화
- [x] 후속 [JSON string count만 제품 추출](json-string-count.md) — writer/cursor 제외
- [ ] 제품 writer/cursor 추출 채택 및 구현
- [ ] 외부 mutable 입력 snapshot/넓은 record/BigInt/route v2 준비 연결

[전체 승인](../AUTHORIZATION.json)의 remainingApproval과 root의 2026-11-02 read-only
prototype 지시를 재사용한다. **제품 source/기존 sync API/공개 schema/기본 guard 변경0**이며
새 private 제품 정책을 채택한 기록이 아니다. Parent의 다음 구체 채택 전에는 제품에 연결하지 않는다.

[원안](canonical-resumable-design.md)의 두 번째 개념을 검산한다. SHA는 기존 제품
`core/sha256.js` create/update/finish/clear를 직접 import한다. SHA 압축 구현을 복제하지 않는다.
Tag의 scalar 선택은 기존 `encodeValue`를 그대로 호출한다. 즉 ±0/NaN/Infinity/undefined/
BigInt의 tag와 unsupported scalar diagnostic을 새 목록으로 만들지 않는다.

## source count owner를 재사용하는 방법

검토 기준 `36de5a4f9`의 `grammar/graph/inferenceBudget.js`에서 `string`은 closure 안에 있다. 제품 파일을 바꾸지
않고 [build.mjs](tagged-cursor-evidence/build.mjs)가 **정확한 해당 본문**을 읽어 임시
`.artifacts/tagged-cursor/scalar.generated.mjs`에 쓴다. 기존 `length+2` minimum guard,
각 escape/UTF8 width 덧셈, 마지막 quota 검사는 그대로다. 각 원 loop iteration 끝에
`{start,end,bytes}` 관측용 yield만 삽입하며 원 source/body SHA를 결과에 고정한다.
이 변환은 연구 재현 도구이며 제품 런타임에서 source text를 읽거나 동적 생성하지 않는다.
이 검토의 실행·source pin 재현은 해당 기준 checkout에서 수행한다. 후속 count 추출은
위 별도 기록이 소유하며, 당시 증거의 source hash를 새 제품에 맞춰 덮어쓰지 않는다.

문자 출력은 native `JSON.stringify`에 최대 2 UTF16 units만 넘겨 quote 내부 atom을 얻고
TextEncoder로 변환한다. Counter가 판단한 width와 매 atom 길이를 비교한다. 유효 surrogate
pair를 함께 전달하므로 U+FFFD 두 개로 바뀌지 않는다. 출력 **byte chunk** 자체는 그 4bytes를
어느 경계에서나 나눌 수 있으며 consumer가 이를 따로 문자열 decode한다고 가정하지 않는다.

## 제안하는 제품 private signature와 책임

```text
createJSONStringState(text: string, encodedOffset: number, maxBytes: number) -> state
advanceJSONString(state, destination: Uint8Array, start: number, end: number)
  -> { written: number, done: boolean }
clearJSONString(state) -> void
countJSONStringBytes(text: string, encodedOffset: number, maxBytes: number) -> number

createStrictEncodedValueCursor(nativeSnapshot, { maxBytes, maxDepth, maxSteps }) -> opaqueCursor
advanceStrictEncodedValue(cursor, { maxBytes, maxSteps })
  -> { bytes: Uint8Array, done: boolean, stats }
clearStrictEncodedValue(cursor) -> void
```

이는 package export가 아니라 **다음 제품 추출 검토용 구체안**이다. `jsonText.js` 한 owner가
현재 inference string loop의 minimum/Unicode 단위를 소유하고, sync count와 chunk writer가
같은 단위를 소비한다. 관측용 generator의 per-unit object는 제품 필수 표현이 아니다. 제품은
UTF16 index/byte width/pending escape의 작은 mutable state로 같은 scalar 순서를 유지할 수 있다.
Number의 표기는 기존 native JSON을 그대로 쓴다. Container의 `array/object/hole` 두 경로도
최종 제품에서는 `valueEncoding.js`의 기존 분류/fragment owner를 좁게 공유해야 한다. Prototype의
두 container prefix가 별도 canonical tag registry가 되어서는 안 된다.

첫 제품 단계는 JSON string scalar만 추출해 inference의 기존 count 결과·minimum 검사 순서를
유지하는 것이다. Tagged cursor의 native snapshot 자격과 caller 경계는 그 다음 별도 채택한다.
기존 `encodeValue`와 `canonicalJSON`을 strict cursor로 대체하지 않는다. 현재 sync callsites,
객체 getter snapshot/read 순서, raw canonical의 sort와 unusual scalar 동작은 그대로다.

## prototype의 실제 입력·수명 계약

[prototype.mjs](tagged-cursor-evidence/prototype.mjs)는 build 도구가 임시 경로로 복사해서만
실행한다. 모든 container에 기존 ownRecord/ownArray(false)를 적용한 뒤 frozen snapshot만
읽으며 descriptor.value를 소비한다. Caller 데이터를 clone하거나 freezeOwned로 stamp하지 않는다.
Frozen 검사는 **domain/native authority가 아니다**. Snapshot 확보와 exact receiver/token/ref
검산은 제품 caller가 따로 완료해야 한다. 새 public async 입력 경로가 있는 것이 아니다.

- 기본 지원 shape: plain record(일반/null prototype), ordinary sparse array, 기존 unusual scalar.
- Object.keys의 integer-key→삽입 순서를 보존하고 raw object sort를 하지 않는다.
- Hole과 own undefined는 별도 tag다. Shared DAG는 occurrence마다 encode하며 ref/dedupe를 하지 않는다.
- Ancestor cycle만 거부한다. Array subclass/extra property/hidden/symbol/accessor는 strict own boundary에서 거부한다.
- Primitive BigInt는 기존 `encodeValue`의 toString 뒤 decimal string을 chunk로 배출한다.
- Limits는 explicit positive safe integers이며 prototype maxDepth64다. Chunk는 최대64KiB/4096tokens다.
  이는 연구 실행 상한이고 route work charge/지원 정책으로 재해석하지 않는다.
- `advance`는 입력 크기와 무관한 bounded output scratch를 먼저 만들 수 있다. 문자열 minimum 검사는
  **입력 문자열의 escaping/TextEncoder allocation 전**이며 scratch0을 뜻하지 않는다.
- `clear`는 generator.return으로 ancestor finally를 실행하고 pending bytes/stack/input 참조를 해제한다.
  완료/오류/취소 orchestration은 SHA도 finally clear한다.
- Outer driver가 native AbortSignal을 chunk 전후 확인하고 실제 setTimeout macrotask를 기다린다.
  Pure cursor/SHA는 signal·timer·program·worker·user callbacks를 저장하지 않는다.

## 오류 우선순위와 아직 채택하지 않은 경계

| 사례 | 기존 sync | 새 strict prototype |
|---|---|---|
| enumerable getter | 기존 Object.entries snapshot 순서로 호출 | own descriptor preflight에서 getter0 거부 |
| unknown tag처럼 생긴 사용자 배열 | 일반 array tag로 감쌈 | 동일, transport tag로 해석하지 않음 |
| array minimum quota + accessor | inference byte owner는 minimum부터 검사 | 같은 minimum 우선, descriptor allocation/getter0 |
| mutable record | 기존 sync 허용 | 기존 immutable snapshot 전제상 명시 거부 |
| class/function/symbol/cycle | 기존 diagnostic owner | scalar/class/cycle은 기존 invalidSnapshot, own-data 오류는 별도 strict owner |
| own undefined | 명시 undefined tag | 동일; limits의 own undefined는 별도 options 오류 |

Strict prefix를 생성한 뒤 자식 오류가 발생할 수 있다. Partial bytes는 private hash에만 들어가며
최종 digest를 공개하지 않는다. Audit의 `commits`는 **final digest publication counter**이고,
ChartProgram action/실제 native transaction을 실행했다는 뜻이 아니다.

외부 mutable 입력을 임의로 frozen 처리하면 snapshot/권한 문제가 해결된다고 주장하지 않는다.
Prototype는 이미 immutable인 native 입력만 검산했다. 넓은 record의 descriptors/keys enumeration,
BigInt.toString, snapshot clone/transport는 한 번의 JS 실행 안에서 선점할 수 없다. Proxy trap을
sandbox로 막는 도구도 아니다. 이 경계가 해결되기 전 whole-preparation100ms/AT82 완료는 아니다.

## 관측과 재현

[qualification.json](tagged-cursor-evidence/qualification.json)에 source·도구 hash와 실제 결과를 둔다.

- Node22: 값23종×chunk6종 =138회 전체 bytes/hash exact; 모든65536 UTF16 unit count/출력 exact.
- Node20/24: 같은138회와256개 단일 unit smoke 및 mixed surrogate cases.
- 모든 Node: byte exact/-1, shared DAG/hole/±0/tag-like/BigInt/keys, hostile shape/limits,
  최소량 거부의 escaping allocation0, 작은 입력16개 경계 각각 실제 timer abort.
- 실제 Chromium: 기존 bytes와 WebCrypto SHA exact, byte chunk1, timer abort 3경계,
  final digest publication0/terminal1/clear. 관측 지연은 진단이며 P95/100ms 자격이 아니다.
- 제품 sync source0변경, package/archive 재생성0, large fixture0. Root의 기능 검증과 겹칠 수 있는 소형 검사다.

```sh
node agent_docs/impl/roadmap9/chart/tagged-cursor-evidence/build.mjs
node agent_docs/impl/roadmap9/chart/tagged-cursor-evidence/audit.mjs --full
node agent_docs/impl/roadmap9/chart/tagged-cursor-evidence/browser.mjs
node agent_docs/impl/roadmap9/chart/tagged-cursor-evidence/verify.mjs
```

다음 채택 요청은 기존 inference string 계산을 source-neutral JSON scalar owner로 좁게 추출할지,
그리고 strict cursor의 **기존 native immutable snapshot 전용** 입력 계약을 별도 유지할지다.
새 public API/route v2 numeric hard maxima/완전 native update union은 이 자료로 구현하지 않는다.
