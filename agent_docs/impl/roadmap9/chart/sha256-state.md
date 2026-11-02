# SHA-256 block 상태 추출

진행 상태: 제품 구현 및 집중 검증 완료. 기존 [AUTHORIZATION.json](../AUTHORIZATION.json)의
`remainingApproval`과 root의 2026-11-02 명시 채택(설계 `0156ba5ea`)을 재사용한다.
[전체 추출 설계](canonical-resumable-design.md)의 첫 개념만 구현한다.

`core/sha256.js`의 create/update/finish/clear는 private block 상태만 소유한다.
기존 `contentDigest`의 TextEncoder coercion/default와 `contentBytesDigest`의 native byte
intrinsic·copy·SAB 거부·subview 의미를 보존한다. canonical JSON, tagged encoder,
SHA constants/32-bit rounds, 공개 API, schema, work/byte/graphic guard는 변경하지 않는다.

입력 전체의 padded array 대신 hash 8×4 + schedule 64×4 + tail 64 = 352 numeric bytes를
유지한다. 입력 UTF-8/copy는 기존 wrapper에 남는다. 완료 시 같은 tail을 한두 번 압축하며
전체 padding 배열을 추가하지 않는다. 상태의 safe integer byte 합을 사전 검사하고
finish 뒤 update/finish는 거부한다. clear는 zero-fill 뒤 세 buffer 참조를 해제하며 반복 가능하다.
WeakSet은 오직 이 private mutable 작업 상태를 구별한다. Native program/asset 권한이 아니다.

독립 Node crypto로 padding/chunks/모든 byte값/Unicode를 대조한다. Coercion·signed zero·
legacy getter 순서·detached/SAB/subview·overflow·finish/clear를 회귀로 고정한다.
Length overflow는 불가능한 배열을 만들지 않고 private bookkeeping에 fault injection한다.
새 scalar owner critical floor는 100/100/100이며 기존 floors는 그대로다.

같은 실제 archive의 Node20/22/24에서 기존 image/font hash·animation offline/assets·
route·inference worker의 작은 공개 사례를 실행한다. 원10k/100k 등 큰 fixture는 이번에
실행하지 않으며 성능/P95/100ms 취소 또는 route v2 지원 완료를 주장하지 않는다.
검증 결과와 최초 실패는 [증거 디렉터리](sha256-state-evidence/)에 기록한다.

SHA 회귀 8개는 Node20/22/24 각각 통과했고 새 scalar owner coverage는 100/100/100이다.
기존 source/codec/image 30, route/inference job 19, boundary/discovery/architecture/assets 26,
package 7개가 통과했다. 같은 `537132a7…5f` archive로 각 Node의 공개 12사례, strict type,
정본 edge-route 문서 예제, optional peers 및 6 entry bundle을 확인했다.

초기 archive는 새 private 파일 1개 때문에 1249 > 1248 entry 한도를 넘었다. 실제
unpacked 8,067,386에 따라 한도를 8,067,400으로 최소 올림했다. 초기 Node24의 runtime12와
타입/문서는 모두 통과했으나 5개 gzip 상한은 초과했다. 이전 실패를 보존하고 최대 실측
Full787529/Basic424889/SVG25480/Graph69401/Animation334243/Interaction131841에 맞춘
최소 한도(기존 SVG26000 유지)를 적용했다. README ceiling 동기화 뒤 새 archive를 고정해
세 Node 모두 재검증했다. 첫 archive와 최종 archive를 동일하다고 주장하지 않는다.

검사는 root의 별도 Geo 기능 작업과 병행했고 성능/heap/P95 측정이 아니다. 큰 fixture와
encoder/cancel scheduler/route v2는 실행·구현하지 않았다.

