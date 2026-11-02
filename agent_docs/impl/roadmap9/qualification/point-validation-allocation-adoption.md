# Point 位置 검증의 버리는 계획 제거 채택

상태: [remainingApproval](../AUTHORIZATION.json)의 기존 승인과 Root의 구체 검토 결정을 재사용한다. 기능 checkpoint `c6d44f50b2a6fec611429f4d07b31f801f7ff901`, metadata pin `f82f4f86b`를 보존한 뒤 별도 구현한다. 검토 대상은 [기존 prototype](format6-product-evidence/validation-only/loader.mjs)와 [135개 비교 결과](format6-product-evidence/validation-only/candidate.json)이다.

`validatePointAnimationPosition`은 같은 endpoint를 양쪽 인수로 `preparePositionInterpolation(p,p)`에 전달하고 반환을 버린다. 이 호출은 기존 `normalizePositionEndpoint(p)`를 두 번 실행하는 것으로 바꾼다. 각 채널의 순서, 두 번의 원 validation/mapping, 마지막 실제 node 좌표 비교는 유지한다. 검증을 위해 버려질 plan/scale snapshot과 그 private prepared 등록만 만들지 않는다.

동일 endpoint끼리의 compatibility는 degenerate-domain 등에서 fade를 반환할 뿐 오류를 추가하지 않는다. 그 반환도 원래 버려졌다. Plain data/getter 거부와 오류 종류·문구를 유지한다. Proxy trap은 기존 ownData 정책과 동일하며 새 sandbox를 약속하지 않는다. 새 공개 API, 저장 형식, 권한, cache, registry 교체/회전, caller 동결은 없다.

읽기 전용 prototype은 6개 scale, reverse/clamp/±0 및 15개 실패 입력의 135개 결과·오류를 동일하게 유지했다. Getter 호출은 양쪽 0개였고, 1000행 등록 수는 40000에서 22000으로 줄었다. 이는 원100k 기능 완료나 성능 달성 근거가 아니다.

제품 구현 후 durable 경계 검사, owning critical coverage, 실제 1k 전체 frame/native/offline/rebase/timeline/mixed와 저장 bytes 비교, 동일 설치 artifact의 Node20/22/24·브라우저·선언·문서 검증을 수행한다. 원100k는 같은 프로세스의 native → offline → rebase → offline을 그대로 재시도한다. 원 50ms/P95/100cycle 의무와 이전 실패 기록을 유지한다.
