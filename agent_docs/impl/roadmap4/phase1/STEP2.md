# Step 2 — B-002 기본 point radius

## 목표

`createPointMark().encodeX().encodeY()`와 Polar 대응 체인이 별도 size action 없이도 완전한
concrete point를 만들게 한다.

## 진행 상태

- [x] graphical default radius를 theme owner에 3으로 정의
- [x] Cartesian과 Polar point materializer에 기본값 적용
- [x] field-driven size와 명시적 radius의 우선순위 보존
- [x] dataset cardinality 변경과 Canvas 재물질화에서 stale radius 방지
- [x] point selection이 완전한 concrete item을 기준으로 동작하도록 정렬
- [x] Browser Canvas mock과 실제 Node PNG 회귀 추가
- [x] 전체 suite 1548/1548 통과

## 검증 증거

```text
node --test test/contracts/point-default-radius.test.js ...
29/29 targeted tests passed

npm test
1548/1548 tests passed
```

## API와 문서

- public signature와 type 변경 없음
- semantic state 변경 없음
- release docs에서 `3px` graphical default를 명시해야 함
