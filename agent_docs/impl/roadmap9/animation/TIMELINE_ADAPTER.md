# Timeline 준비와 공개 연결 결정

[remainingApproval](../AUTHORIZATION.json#remainingApproval)의 남은 API·저장·시각 결정 승인을 재사용한다. 원 animation 계약의 keyframe/overlap/marker 의무를 보존하며 단순 virtual-clock player만으로 timeline 완료를 주장하지 않는다.

## 순수 수치 경계

`grammar/animation/timeline`은 duration과 exact target/property slot을 받으며 native program이나 pixel을 조회하지 않는다. Target/property는 native adapter가 결정한 opaque identity다. `number|positive-scale|rotation|rgba`는 기존 values owner를 재사용한다. Public property/kernel 호환성이나 geometry는 이 helper가 새로 정의하지 않는다.

- Time은 duration 안의 nondecreasing 값이다. 같은 time의 keyframe은 그 시각부터 마지막 값을 쓰는 right-continuous 규칙이다. Before/after는 각 끝값을 유지하고 track 사이 gap은 최근 완료값을 유지한다. EasingToNext 생략은 기존 cubic-in-out이다.
- 동일 target/property의 interval overlap은 기본오류다. Explicit priority composite는 모든 track의 safe integer priority를 요구하며 겹친 동률은 오류다. Active interval은 `[start,end)`이며 단일시각 track은 해당 instant다. Adjacent track의 shared time은 뒤 track을 선택하고 정확 마지막 시각은 최종값을 유지한다.
- Marker는 실제 `(from,to]` forward crossing만 내보낸다. Iteration별 emitted ID state를 immutable 값으로 주고받으며 같은 iteration의 ID는 반복하지 않는다. Seek의 emit 기본은 false다. 시작0 marker를 원하면 host가 음의 직전시각에서0을 건너는 명시 crossing을 제공한다. 이전/새 iteration과 reverse/seek는 pure state로 처리한다.
- Closed own descriptors, serializable numeric/RGBA values, generated keyframes/tracks/markers 각각10000, cumulative work10M을 검증한다. Getter/callback/unknown key/kernel은 실행하지 않고 거부한다.

## 현재 상태와 남은 공개 의무

수치 owner는 독립 literal9개와 line100/branch94.81/function100, 지원3Node에서 통과했다. 현재 공개 animation entry는 이를 import하지 않는다. 설치된 공개timeline/marker API가 있다고 주장하지 않는다.

공개 연결은 exact native itemKey/role/property의 current meaning을 준비해야 하며 concrete x/y를 raw 값으로 위장하지 않는다. 같은 renderer-ready frame, typed family vector, native provenance, offline payload, player/seek/repeat/interrupt marker 수명을 모두 연결해야 한다. Geo style이나 guide geometry를 변경하고 현재 의미 proof를 예전 값으로 남겨 두는 경로는 허용하지 않는다. Public signature·types·Current·문서와 같은 archive의 네 renderer·native session 검증은 별도 checkpoint다.
