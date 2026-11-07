# 추론 worker 루트 통합 검증

## 진행 상태

- [x] 기존 remainingApproval과32c26e969 구체안으로 stable cb08d22a8 통합
- [x] 변경19 runtime 파일 byte-identical 및 기존 point capacity/handles 보존
- [x] root owning227·contracts45·coverage-policy7·docs243·실제 Chromium worker 검증
- [x] 동일 archive Node20/22/24 각각5runtime·strict타입·문서2·optional peers·6bundle
- [x] 실제 문서 build186페이지·1606 selective LLM artifacts 검증
- [x] source commit 이후 문서 pin 및 동일 archive hash 재확인
- [ ] 최종 combined AT82 성능 자격

공개 `ggaction/graph` helper3개와 Full create/edit의 배타적 prepared 적용을 합쳤다. Native 수학·원10000nodes/100000edges·행·기본10M·전역 graphic/layout/route 한도는 그대로다. Runtime19파일은 incoming과 동일하다. 기존 declaration의 point100k 추가와 설치 manifest의 handle3개를 보존했고, 겹친 문서 snippet marker를 구분해 worker 예제도 등록했다. Current GRAPHS의 오래된 “worker 지원 없음” 문구는 새 canonical worker 단락으로 연결했다.

같은 ed5f57d5 archive를 세 Node에 실제 설치해 기존3개와 새 worker2개 소비자를 검증했다. 신규 worker는 원10000nodes/k10의 모든100000간선·typed tie·weight·direction·source rows를 독립 oracle로 검산한다. 같은 root source의 실제 Chromium worker도100/1000/10000에서 전체 간선을 확인했다. 큰 입력 단발은 prepare22.77초/commit4.61초로, P95·retained heap·SLO 통과를 뜻하지 않는다.

Critical19개 중 incoming과 동일한18개는 기존 floor 증거를 재사용했다. 합산 generated inspection descriptor 배열은 root에서 직접100/100/100을 확인했다. 전체 coverage나 전수 built browser를 새로 실행했다고 주장하지 않는다. UI/layout이 그대로인 built browser는 upstream의 responsive·접근성 증거를 재사용하고 root docs243/build186/1606 검사는 실제 다시 실행했다.

최초 snippet marker 충돌·entry/packed cap 실패·검색 크기 문서 실패를 원본 그대로 보존했다. 실제1251entries/Node20·24 packed1,794,987/unpacked8,085,282에 최소1251/1,795,000/8,085,300 상한을 적용했다. Full785,911→786,000, 전체6개 helper graph67,555→67,600, 검색1,092,664→1,092,700이며 나머지 entry와 runtime guard는 그대로다. 자세한 환경·해시·원본 gzip 기록은 qualification.json을 따른다.

이 checkpoint는 STEP057–077의 전체 완료가 아니다. 반복 검증 최적화와 기존 큰 입력 성능·메모리·100cycle, 최종 동일 candidate의 전체 명령·독립 검토·보호된 최종 전달은 남는다.
