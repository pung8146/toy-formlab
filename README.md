# FormLab

라이브: https://toy-formlab.vercel.app · 코드: https://github.com/pung8146/toy-formlab

부품별 형태와 마감을 바꿔 보고, 불을 켜 보고, 같은 구성을 링크로 공유하는 3D 램프 configurator입니다. 램프는 코드로 생성한 컨셉 모델이며 실제 제품이 아닙니다.

## 실행

Node 20.19 이상 또는 22.12 이상이 필요합니다.

```bash
npm install
```

```bash
npm run dev
```

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
| `src/product/lamp/catalog.ts` | 부품, 옵션, 색, 재질 레시피, 프리셋의 단일 출처 |
| `src/product/lamp/config.ts` | 설정 검증과 상태 전이 |
| `src/product/lamp/url.ts`, `storage.ts` | 공유 링크와 프리셋 저장 |
| `src/product/lamp/ProceduralLamp.tsx` | 절차 모델과 선택 외곽선 |
| `src/viewer/` | Canvas, 카메라, 스튜디오 조명, 실패 처리 |
| `src/configurator/` | 접근 가능한 편집 폼, 저장, 공유 |

## 배포

Vercel에 정적 빌드로 배포합니다. 도메인을 바꾸면 `index.html`의 `og:url`과 `og:image`도 함께 바꿉니다.

## 알려진 한계

- 새로고침하면 편집 중인 구성은 사라집니다. 저장이나 링크 복사로 보관합니다.
- 프리셋은 같은 브라우저에만 저장됩니다.
- GLB 모델 교체 경로는 구현하지 않았습니다.
- 조명과 재질은 시각 표현이며 실측값이 아닙니다.

폰트는 [Pretendard](https://github.com/orioncactus/pretendard)(SIL OFL 1.1)를 자체 호스팅합니다. 검증 기록은 [docs/verification/formlab-mvp.md](docs/verification/formlab-mvp.md)에 있습니다.
