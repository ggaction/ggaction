# Hit 문자열 비교의 실제 work 과금

기준 도구 `41487c00c`의 native point10k 전체 입력은 index 정렬 중10M work를 초과했다.
원 실패/계측과100k 후속 정책은 [용량 감사](../native-workloads-tool-evidence/CAPACITY_AUDIT.md)에 보존한다.
root가 실제 UTF-16 prefix를 비교하는 한 owner에서 읽은 unit만 과금하는 구체 수리를 채택했다.
기존 `AUTHORIZATION.json#remainingApproval` 범위의 정확성 수리이며 새 API/저장 schema/용량 변경은 없다.

`grammar/hitIndex.js::compareHitText`가 BVH node key와 semantic candidate tie를 모두 비교한다.
길이 차로 끝나기 전까지 각 UTF-16 unit을 실제 한 번 읽는다. 문자열 `<`를 따로 실행하거나 prefix를
추가 조사하지 않는다. metadata validation/JSON 생성 비용은 그대로이며10M/2M과100k scene 상한도 그대로다.
helper는 private module export이고 공개 package entry/types에 추가하지 않는다.

검증:

- `node scripts/run-tests.js unit unit/grammar/hit-index.test.js unit/hit-program.test.js unit/hit-frame.test.js unit/interaction-nearest.test.js`: Node22 47/47.
- 같은 네 파일 `node --test`: Node20/24 각각47/47. 실제10000 raw row/graphic 전체와 CSS transformed hit를 검산했다.
- 같은 네 파일, `--experimental-test-coverage --test-coverage-include=src/grammar/hitIndex.js --test-coverage-lines=95 --test-coverage-branches=90 --test-coverage-functions=100`: 해당 owner100/100/100.
- package/discovery22 및 별도 source-boundaries14 통과. 첫 selector 묶음의 잘못된 source-module-boundaries 이름은 당시 runner가 무시했으므로 그 실행을 source 경계 검사로 세지 않는다. 실제 `contracts/source-boundaries.test.js`를 별도 실행했다.
- 빈 문자열/접두사/동일 문자열/paired·unpaired surrogate, signed-zero 좌표, 정렬 동률/중복 node key, 실제 읽기 단위의 정확 한도·한도+1, 악의적 긴 prefix, 실패 뒤 기존 index/caller 불변을 포함한다.

`qualification.json`의 hashes가 검증한 입력 byte를 고정한다. 전체 repo coverage, 새 installed archive,
production Chromium warm5+30, 성능 P95/AT56/077 완료를 주장하지 않는다. 이 범위는 root 최종 combined candidate에 남긴다.
