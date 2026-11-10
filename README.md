# FormLab

라이브: https://toy-formlab.vercel.app · 코드: https://github.com/pung8146/toy-formlab

실제 판매 상품의 3D 모델(GLB)을 받아 웹 제품 configurator로 만든 프로젝트입니다. 라운지 체어의 원단, 프레임, 금속 부품 마감을 바꾸고, 구성을 저장하거나 링크로 공유합니다.

## 실행

Node 20.19 이상 또는 22.12 이상이 필요합니다.

```bash
npm install
```

```bash
npm run dev
```

## 모델 파이프라인

원본 `assets-src/SheenChair.glb`(4.13 MB)를 Meshopt 지오메트리 압축과 WebP 1K 텍스처로 줄여 `public/models/chair.glb`(약 760 KB)를 만듭니다. 부품을 나누는 노드와 재질 이름은 보존합니다.

```bash
npm run build:model
```

앱은 노드 이름(`SheenChair_fabric`, `SheenChair_wood`, `SheenChair_metal`)으로 부품을 찾고, 원단과 프레임 색은 공용 텍스처 위의 색 계수로 바꿉니다. 다른 모델로 바꿀 때는 `src/product/chair/ChairModel.tsx`의 부품 매핑과 `catalog.ts`의 옵션만 고치면 됩니다.

## 검증

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm run test:unit
```

```bash
npx playwright install chromium
```

```bash
npm run test:e2e
```

## 구조

| 경로 | 역할 |
|---|---|
| `src/product/chair/catalog.ts` | 부품, 옵션, 색, 프리셋의 단일 출처 |
| `src/product/chair/config.ts` | 설정 검증과 상태 전이 |
| `src/product/chair/url.ts`, `storage.ts` | 공유 링크와 프리셋 저장 |
| `src/product/chair/ChairModel.tsx` | GLB 로드, 부품 매핑, 재질 적용, 선택 |
| `src/viewer/` | Canvas, 카메라, 스튜디오 조명, 외곽선, 실패 처리 |
| `src/configurator/` | 접근 가능한 편집 폼, 저장, 공유 |

## 배포

Vercel에 정적 빌드로 배포합니다. 도메인을 바꾸면 `index.html`의 `og:url`과 `og:image`도 함께 바꿉니다.

## 알려진 한계

- 새로고침하면 편집 중인 구성은 사라집니다. 저장이나 링크 복사로 보관합니다.
- 프리셋은 같은 브라우저에만 저장됩니다.
- 원단 색은 화면 표현용이며 실제 원단 색을 보증하지 않습니다.

## 크레딧

- 3D 모델: [SheenChair](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair), Wayfair LLC, CC0 1.0 (모델·텍스처 Eric Chadwick)
- 폰트: [Pretendard](https://github.com/orioncactus/pretendard), SIL OFL 1.1

검증 기록은 [docs/verification/formlab-mvp.md](docs/verification/formlab-mvp.md)에 있습니다.
