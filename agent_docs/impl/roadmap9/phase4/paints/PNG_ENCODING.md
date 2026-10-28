# Glyph PNG의 private byte encoder

## 진행 상태

- [x] Node/DOM/Canvas/외부 압축 dependency 없는 private encoder
- [x] 독립 CRC32·zlib decode, literal 및 경계 검증
- [x] Browser/Node bytes exact와 native PNG decode
- [x] Private critical coverage와 source/discovery/package 경계
- [x] 구현 revision에 source provenance 고정 및 문서164/164
- [ ] 공통 image I3 payload·materializer 연결 — 공개 저장 형식 승인 뒤 진행

`src/core/pngEncoding.js`의 `encodeRGBA8PNG({width,height,rgba})`는 ordinary Uint8Array 또는
Uint8ClampedArray의 **straight RGBA8**를 fresh Uint8Array PNG로 만든다. 공개 entry·action·stored schema를
추가하지 않는다. Materializer는 이후 승인한 image owner를 통해 bytes를 검증·복사하여 저장해야 하며,
이 private 출력에 backend object나 resource identity를 붙이지 않는다.

## 바이트 정책과 소유

PNG signature, IHDR(color type6/bit depth8), 한 IDAT, IEND만 저장한다. 모든 row는 filter0, zlib은 stored
DEFLATE blocks(최대65535bytes), CRC32와 Adler32를 사용한다. 색 변환이나 premultiply/unpremultiply를 하지 않아
alpha0 아래 RGB도 보존한다. 압축률보다 bounded source의 exact bytes와 브라우저 독립성을 우선하는 현재 필요다.
Chart 전체 raster 또는 renderer fetch를 도입하지 않는다.

Caller input은 읽기만 하며 새 output buffer는 호출자 소유다. SharedArrayBuffer는 다른 thread의 경합 때문에
거부한다. Typed array subclass도 거부하고, byte length/buffer는 intrinsic getter만 읽어 caller accessor를
실행하지 않는다. 보통 JS array는 descriptor 전체를 큰 임시 객체로 복사하지 않도록 받지 않는다.
Arguments record는 기존 own-data/closed-key 검증을 재사용한다. Buffer에 붙은 무관한 이름의 속성은 읽지 않는다.

## 한도와 할당

- 각 dimension은1..4096 정수, pixels는1,048,576 이하이며 byte length가 width×height×4와 exact여야 한다.
- `rawBytes = (4×width+1)×height`, `blocks = ceil(rawBytes/65535)`다.
- 최종 `PNG bytes = 63+rawBytes+5×blocks`; 최대는256×4096에서 **4,198,788bytes**다.
- Encoder는 최종 PNG만 할당한다. 별도 scanline/RGBA copy/zlib buffers가 없으며 module-level CRC table은1,024bytes다.
- 최대 caller input4,194,304 + output4,198,788 + CRC table1,024 = **8,394,116bytes**다. 소량의 고정 크기 JS
  record는 별도다. Encoder 신규 buffer 한도와 caller input을 구분한다.
- 명시 byte-work 상계 `2×rawBytes+5×blocks+128`는 최대8,397,253이며 기존10,000,000 work 한도 아래다.
  Dimension/pixel/length/output/work 검사는 출력 할당 전에 끝난다.
- 후속 shadow/image planner는 동시에 살아 있는 blur buffers·input·PNG bytes를 합쳐 검사해야 한다.
  Shadow의8MiB numeric-buffer 정책이 이 조합 전체를 이미 포괄한다고 주장하지 않는다.

## 검증

`test/oracles/png-bytes.js`는 production helper를 import하지 않는다. Bitwise CRC로 chunk integrity를 검사하고
Node zlib으로 DEFLATE와 Adler32를 독립 검증한다. Single-pixel literal, 정확한65535byte block, block 경계가
row 내부를 지나는 표본, subarray, Uint8ClampedArray, caller/output 불변성, 최대 크기를 확인한다. Native PNG
loader와 Chromium은 dimensions·opaque RGB·alpha 및 byte equality를 추가 확인한다. Canvas의 transparent RGB
제거는 lossless PNG payload 검사와 분리한다.

Normal5/5, browser1/1, source/discovery/package contracts40/40. Critical coverage는100% lines /97.06% branches /
100% functions이고95/90/100 floor를 통과한다. Output bound의 방어적 초과 분기는 더 앞선 dimension/pixel 검사로
도달할 수 없어, 이를 실행하려고 한도를 바꾸거나 허용 입력을 왜곡하지 않았다.

정확한 revision·commands·package·log hashes는 `PNG_ENCODING-EVIDENCE.json`에 있다. 현재 public paint 지원이나
STEP017 완료를 의미하지 않는다. 이 helper를 연결하는 시점에 shared I3 payload와 실제 효과 alpha/clip/scene
consumer 검증을 계속한다.
