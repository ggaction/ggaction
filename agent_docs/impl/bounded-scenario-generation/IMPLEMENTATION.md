# 실제 corpus 생성의 메모리 여유 복구

기존 strict360 descriptor 비교의 reference child peak RSS가 Linux에서 두 번
448MiB를 넘었다: release39025140571/attempt1은474779648bytes,
문서 정리CI39025607765는473219072bytes이며 기존469762048bytes 한도다.
두 결과 모두 descriptor/state parity를 통과한 뒤 RSS assertion에서 실패했다.
원래 실패 로그는 보존했고 release의 동일 canonical package 재시도도 별도로 진행했다.

Private generation child의 V8 old-space를288→256MiB로 줄여 V8 외 메모리와 native/parser
메모리의 여유를 둔다. 알고리즘·데이터·선택 개수·검사·448/512MiB RSS 기준·900초 공유
deadline을 바꾸지 않는다. 실제 렌더 worker의 별도224MiB 설정도 바꾸지 않는다.
프로그램의 schema/API와 최종 결과가 달라지는 fallback이나 항목 삭제는 없다.

- Node20의 기존 generation isolation3개 검사 통과(483106ms): 실제216/360개 모두
  reference/isolated descriptor·generation state·frozen 결과와 원래 RSS 한도를 검증했다.
- 기존 child protocol/failure 집중 검사 통과. Mock spawn의 기대 old-space도256으로 갱신했다.
- 같은 RSS 문제가 생기면 peak를 즉시 읽도록 기존 검사에 bounded resource diagnostic만 추가했다.
  assertion을 제거하거나 기준을 올리지는 않았다.
- 최종 Linux CI 재검증은 이 commit의 PR에서 수행한다. 로컬 통과를 Linux 완료로 주장하지 않는다.

## Linux 재발과 전체 V8 세대 한도

8073b8ec의 Linux CI39027148064에서는 old-space256MiB만 줄인 상태에서도 reference360
peak480477184bytes로448MiB를 넘었다. 해당 로그를 보존했다. Isolated child365338624와
coordinator110829568, combined476168192는 기존 한도 이내였으므로 문제는 reference peak였다.

Private generation child의 old-space를224MiB, semi-space를8MiB로 설정해 old/young 두 영역에
모두 유한한 여유를 둔다. 실행 worker224MiB, source 알고리즘/데이터/descriptor수/parity/frozen검사,
448MiB child·512MiB combined RSS와900초 공유deadline은 그대로다. 새 옵션/API/저장값은 없다.

- Node20 macOS의 원래216/360 generation-isolation3검사 모두PASS(총857397ms).
-360 reference peak388038656bytes, isolated child322125824bytes,
 combined410599424bytes.360 검사596183ms, generation shareddeadline도 그대로 지켰다.
- timeout/crash/protocol 기존 검사1개PASS(동일SIGKILL/advanced serialization 및 두 V8 인자).
- 이 로컬 결과를 Linux 완료라고 주장하지 않는다. 같은 PR의 새 commit에서 LinuxCI를 검증한다.
