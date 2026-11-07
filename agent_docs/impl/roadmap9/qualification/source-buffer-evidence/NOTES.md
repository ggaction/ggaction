# 큰 source blob 증거 검증

새 action card 입력이1MiB를 넘어 기존 Git subprocess 기본 buffer에서 ENOBUFS로
막혔다. 1,048,833bytes의 binary Git fixture에서도 같은 실패를 독립 재현했다.
검증할 실제 파일의 기존 hash/path 검사를 먼저 유지하고 stdout buffer만 해당
byte length+1로 제한한다. 무제한 buffer나 고정 큰 상한을 도입하지 않는다.

같은 길이의 변경 blob은 exact Git hash 비교로 거부하고, 현 파일을 줄여 committed
blob이 더 큰 경우도 실패로 닫힌다. 원본 실패와23/23 owning 검증을 보존한다.
공개 API/renderer/실행 승인 규칙은 변경하지 않으며 최종 native qualification 통과를
주장하지 않는다. `node --test test/contracts/verification-evidence.test.js
test/contracts/native-capability-completion.test.js`로 재실행한다.
