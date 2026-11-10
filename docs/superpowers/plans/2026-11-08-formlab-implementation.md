# FormLab 단계별 구현 계획 (축소판)

> 체크박스는 실제 검증을 마친 항목만 체크했다.

**목표:** 위시캣·포트폴리오 Work 섹션에 올릴, 실제 작동하는 모듈형 램프 3D configurator와 공개 산출물.

**구조:** 제품 설정을 DOM 편집·3D·프리셋·URL의 공통 원천으로 둔다. 모델은 절차 모델 하나다. 상태와 복구 UI는 Canvas 밖에 둔다.

**기술안:** React·TypeScript·R3F·Three.js·Zustand·Vite, npm, CSS Modules, 서버 없는 정적 앱. 확정 전 제안이다.

**상세 설계:** [FormLab 제품·경험·3D 설계안](../specs/2026-11-08-formlab-design.md)

상태: **구현 완료 / Vercel 배포 완료 / 실기·스크린리더·사용자 테스트 미수행** · 결과: [검증 기록](../../verification/formlab-mvp.md)

추정 기간: 1인 기준 1~2주. 시각 수정량이 가장 큰 변수이며 확약이 아니다.

## 1. 전역 제약

- 유일한 프로젝트 루트는 `C:\Projects\toy-formlab`. 기존 포트폴리오의 소스·Git·자산·배포 바인딩은 건드리지 않는다.
- MVP는 `lamp-01`, `base/stem/arm/shade`, 8개 형태 조합, `powder-coat/satin-metal` 두 재질군, 점등이다.
- 기본값은 Atelier: `square/cone/short`, 받침·갓 `powder-coat/clay`, 기둥·암 `satin-metal/silver`.
- 도장 색은 chalk/graphite/clay/sage/cobalt, 금속 색은 silver/champagne/graphite. 호환되지 않는 색은 해당 마감의 기본색으로 바꾸고 알린다.
- 사용자 프리셋 최대 10개, 이름 trim 후 1–32 Unicode code point. 저장 키 `formlab:storage:v1`, fragment 최대 1,024자.
- 키보드·2D 대체 화면·모바일은 MVP의 일부다.
- 실제 구매·가격·제조 가능성은 제공하지 않는다. “인터랙티브 컨셉 모델” 표시를 유지한다.
- WebGL2, Canvas 하나. 자동 회전·후처리·물리 엔진·GLB 로더를 넣지 않는다.
- 기능 테스트 결과, 시각 비교, 성능 실측을 구분해 기록한다.

## 2. 먼저 주의할 실패 시나리오

| 위험 | 기대 동작 | 담당 단계 |
|---|---|---|
| 첫 화면이 밋밋해 포트폴리오 인상이 약함 | 2단계 끝에서 스크린샷으로 판단 | 2 |
| 잘못된 URL·미지원 버전 | 전체 거부, 기본값과 경고 | 4 |
| 회전 드래그가 부품 클릭으로 해석됨 | 이동량·취소 상태로 구분 | 2 |
| 모바일에서 Canvas 때문에 스크롤이 막힘 | 무대 높이 제한, 실기 확인 | 3 |
| storage 실패·context loss | 설정 유지, 명확한 대체 경로 | 3·4 |

## 3. 예정 파일과 책임

아래는 **승인 후 생성 예정**이다. 책임이 작으면 같은 파일에 유지한다.

| 예정 경로 | 책임 |
|---|---|
| `package.json`, lockfile, Vite/TypeScript/test 설정 | 단일 앱·정적 빌드·검증 명령 |
| `src/App.tsx`, `src/App.module.css`, `src/styles/tokens.css` | 제품 무대·편집 패널·반응형 뼈대 |
| `src/product/lamp/catalog.ts` | ID·기본값·허용 옵션·색·재질 레시피·기본 프리셋 |
| `src/product/lamp/config.ts` | 설정 타입·입력 검증·상태 전이 |
| `src/product/lamp/store.ts` | 작은 Zustand store |
| `src/product/lamp/url.ts`, `storage.ts` | 공유 포맷·프리셋 저장·오류 처리 |
| `src/product/lamp/ProceduralLamp.tsx` | 절차 모델·접합·활성 옵션·재질 표시 |
| `src/configurator/PartControls.tsx` | 부품·형태·재질·색의 접근 가능한 폼 |
| `src/configurator/PresetDialog.tsx`, `ShareActions.tsx` | 저장 목록·삭제 확인·링크 복사와 대안 |
| `src/viewer/ViewerBoundary.tsx`, `ProductViewer.tsx` | 로딩·오류·context 처리·Canvas |
| `src/viewer/CameraControls.tsx`, `Studio.tsx` | 카메라·조명·점등·그림자 |
| `public/assets/lamp/` | 포스터·OG 이미지 |
| `tests/unit/`, `tests/e2e/` | 데이터 계약·핵심 브라우저 흐름 |
| `docs/case-study.md`, `README.md` | 포트폴리오 설명·실행 방법·한계 |

## 4. 단계별 작업과 통과 기준

### 단계 0 — 프로젝트 골격

- [x] 미결정인 npm·CSS Modules·정적 호스팅 서비스를 한 번에 확인한다.
- [x] 작업 경로를 확인하고 Git 저장소를 이 폴더에만 만든다.
- [x] React·R3F·drei·Three.js의 stable 버전과 peer 호환성을 확인하고 lockfile을 둔다.
- [x] React·TypeScript strict·Vite 앱을 만들고 필요한 라이브러리만 설치한다.
- [x] `typecheck`, `lint`, `test:unit`, `test:e2e`, `build` script를 정의하고 build와 typecheck를 실행한다.

**통과:** 이 폴더 안에서 개발·정적 빌드가 가능하다.

### 단계 1 — 제품 설정과 DOM 폼

파일: `catalog.ts`, `config.ts`, `store.ts`, `PartControls.tsx`, 기본 레이아웃. 검증: `tests/unit/config.test.ts`.

- [x] 데이터 테스트를 먼저 작성한다. 8개 조합 허용, 알 수 없는 부품/옵션 거부, silver→도장 시 chalk, graphite→금속 시 graphite 유지, 다른 부품 불변을 고정한다.
- [x] 테스트 실패를 확인한 뒤 카탈로그·검증·store를 작성한다.
- [x] fieldset·radio·이름 있는 swatch를 만든다. 허용되지 않는 색은 선택지에 나타나지 않게 한다.
- [x] 현재 설정 요약을 screen reader가 읽을 수 있게 한다.
- [x] 기본값과 프리셋 3개가 모두 유효한지 검사하고 테스트·typecheck·lint를 실행한다.

**통과:** WebGL 없이도 전체 제품 설정을 만들고 검증할 수 있다.

### 단계 2 — 절차 램프·스튜디오·점등

파일: `ProceduralLamp.tsx`, `ProductViewer.tsx`, `CameraControls.tsx`, `Studio.tsx`. 검증: `tests/e2e/core.spec.ts`, 대표 스크린샷.

- [x] 받침·갓·암을 회전체와 튜브로 만들고 명시적 socket으로 조립한다. bevel과 갓 두께를 넣는다.
- [x] 부품별 재질, `Lightformer` 환경 반사, 그림자를 연결한다. 활성 옵션만 마운트한다.
- [x] 점등 상태를 구현한다. 디퓨저 발광, 내부 광원, 어두운 스튜디오, 약 400ms 전환.
- [x] 회전·줌·시점 프리셋·원위치를 연결한다. 8개 조합이 모든 시점에서 프레임 안에 보이는지 확인한다.
- [x] raycast→PartId와 DOM 선택을 연결한다. 이동 6px 초과·pointercancel·멀티터치는 선택을 취소한다.
- [x] demand rendering에서 변경·전환 직후 프레임이 빠지지 않고, 종료 뒤 렌더가 멈추는지 확인한다.
- [x] 기본값·긴 암·금속 대비·점등 상태의 스크린샷을 남긴다.

**통과:** 회전·선택·모듈 교체·마감·점등이 실제 화면에서 작동한다.

**판단 지점:** 스크린샷을 썸네일 크기로 줄여 포트폴리오에 쓸 만한지 사용자와 확인한다. 부족하면 조명·형상 보완 또는 실제 GLB 하나로의 전환을 결정한 뒤 다음 단계로 간다.

### 단계 3 — 화면·모바일·접근성·대체 화면

파일: 앱 레이아웃·스타일, 폼, `CameraControls.tsx`, `ViewerBoundary.tsx`. 검증: `tests/e2e/accessibility.spec.ts`, 대표 화면 캡처.

- [x] 밝은 무대, 무대 아래 프리셋 칩·점등·카메라 조작 줄, 오른쪽 단일 패널을 구현한다.
- [x] 모바일을 세로로 쌓는다. 무대 높이를 제한하고 Canvas 위 터치는 항상 카메라 조작으로 둔다.
- [x] 회전 ±15°/기울기 ±10°/줌 ±10% 버튼을 연결한다.
- [x] 키보드만으로 편집을 완료한다. live region 중복 발화와 label을 확인한다.
- [x] reduced motion, 44px 조작 영역, 색 대비(켬·끔 모두), 200% 확대, 320px 리플로우를 검사한다.
- [x] 3D chunk를 지연 로드하고 포스터·폼을 먼저 표시한다.
- [x] WebGL2 실패와 context loss에서 2D 포스터와 “다시 시도”를 제공한다. chunk 실패는 현재 구성 URL로 “페이지 다시 열기”를 제공한다.
- [x] 1440×900, 390×844, 320×568에서 겹침·잘림·가로 스크롤을 확인한다.
- [ ] axe 검사와 스크린리더 핵심 흐름 1회 확인을 기록한다.
- [ ] 실제 휴대폰 1대에서 페이지 스크롤과 Canvas 조작을 확인한다.

**통과:** 첫 화면에서 제품이 주인공이고, 터치·키보드 경로가 막히지 않으며, 3D 실패에도 폼이 동작한다.

### 단계 4 — 프리셋과 링크 공유

파일: `url.ts`, `storage.ts`, `store.ts`, `PresetDialog.tsx`, `ShareActions.tsx`. 검증: `tests/unit/url.test.ts`, `tests/unit/storage.test.ts`, `tests/e2e/core.spec.ts`.

- [x] URL 키를 `v`, `p`, `base`, `shade`, `arm`, 각 부품의 `Finish`/`Color` 접미 키로 고정한다.
- [x] 모든 단일 변경과 대표 조합의 serialize→parse 동일성을 검사한다. 중복 키·누락 필드·알 수 없는 값·잘못된 인코딩·1,024자 초과·미지원 버전을 거부한다.
- [x] 시작 시 URL을 파싱하고, `hashchange`도 같은 파서로 처리한다. 잘못된 URL은 기본값과 경고를 표시한다.
- [x] 저장 최대 10개, 이름 검증, 이름 중복 시 ID 분리, 불러오기, 삭제 확인, dialog 포커스 복귀를 구현한다. 저장은 snapshot이다.
- [x] storage 차단·quota 초과·깨진 JSON·깨진 항목·미지원 버전을 주입한다. 거짓 성공 알림이 없고 깨진 JSON·미지원 버전의 원본을 덮어쓰지 않아야 한다.
- [x] 링크 복사는 클릭 시점의 최신 설정을 쓴다. clipboard 실패 시 선택 가능한 URL을 표시한다.
- [x] 키보드만으로 저장→불러오기→공유를 완료한다.
- [x] 새 browser context에서 링크를 열어 같은 설정과 3D 마감이 복원되는지 검증한다.

**통과:** 프리셋과 링크 공유가 동작하고, 프리셋 이름·카메라 좌표·점등 상태는 링크에 없다.

### 단계 5 — 배포와 포트폴리오 산출물

파일: `README.md`, `docs/case-study.md`, 포스터·OG 이미지.

- [x] typecheck·lint·unit·E2E·build를 최종 상태에서 실행하고 결과를 기록한다.
- [x] production build로 전송량·초기 준비·유휴 렌더를 1회 측정하고, 50회 옵션 교체 후 geometry 수가 계속 늘지 않는지 확인한다.
- [ ] 처음 보는 사용자 3명에게 편집·공유 과제를 주고 막힌 지점을 기록한다. 없으면 미실시로 표시한다.
- [x] 포스터, 썸네일, OG 이미지를 실제 렌더로 만든다.
- [x] 15초 영상을 촬영한다.
- [x] 케이스 스터디와 README를 쓴다. 구현한 것과 컨셉 표현의 한계를 구분한다.
- [x] 호스팅 대상과 계정을 확인받은 뒤 배포하고 라이브 URL에서 공유 링크를 다시 검증한다.

**통과:** 라이브 URL, 썸네일, 영상, 케이스 스터디가 모두 있고 Work 섹션에 바로 등록할 수 있다.

## 5. 대표 인수 시나리오

| ID | 시나리오 | 기대 결과 |
|---|---|---|
| A01 | 기본 진입 → 8개 형태 조합 | 접합 정상, 숨은 모듈 선택 불가 |
| A02 | 갓만 clay 도장 → 금속 → graphite | 갓만 변경, 호환 색 안내, 다른 부품 유지 |
| A03 | 프리셋 칩 전환 → 점등 켜기·끄기 | 형상·재질·조명이 실제로 바뀌고 전환 후 렌더 정지 |
| A04 | 자유 회전·줌 → 4개 시점 | 제품 내부 관통·NaN 없음 |
| A05 | 회전 드래그 끝을 갓 위에서 놓기 | 선택 변화 없음 |
| A06 | 이름 저장 → 편집 → 불러오기 | 저장 당시 snapshot 복원 |
| A07 | 옵션 변경 직후 링크 복사 → 새 브라우저 | 최신 설정과 동일 |
| A08 | 잘못된 URL | 경고와 기본값, 저장 프리셋 유지 |
| A09 | storage quota/차단/손상 | 거짓 성공 없음, 현재 설정·공유 가능 |
| A10 | 모바일 스크롤 → Canvas 회전·pinch | 제스처 경계 정상, 스크롤 가능 |
| A11 | 키보드로 편집/저장/공유 | 포커스 유실·갇힘 없음 |
| A12 | WebGL 실패·context loss | 설정 유지, 2D 표시, 다시 시도 동작 |

## 6. 진행 판단과 승인

의존성은 **0 → 1 → 2 → 3 → 4 → 5**다. 확인 지점은 2단계 스크린샷, 3단계 모바일 화면, 5단계 라이브 URL이다.

예정 기능은 완료 체크 전까지 포트폴리오 설명에 구현 완료로 적지 않는다. 사용자 승인 전 다음 단계에 착수하지 않는다.
