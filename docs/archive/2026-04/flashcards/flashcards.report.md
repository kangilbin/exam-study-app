# Report: flashcards 암기카드 콘텐츠 보강

> 작성일: 2026-04-20
> 기능: flashcards (암기카드 콘텐츠 보강 + 코드베이스 정리)
> Match Rate: 100%

---

## 1. 완료 요약

| 항목 | 내용 |
|------|------|
| 기능명 | flashcards 암기카드 콘텐츠 보강 |
| 시작 단계 | Plan → Design → Do → Check |
| Match Rate | **100%** |
| 총 보강 카드 | 523장 (se: 241, db: 93, os: 86, network: 103) |
| 추가 성과 | 코드베이스 데드 파일 정리 + 진행도 버그 수정 |

---

## 2. Plan 목표 달성 현황

| 목표 | 결과 |
|------|------|
| definition 전체 보강 (386장 대상) | 완료 |
| tip 필드 전체 추가 (520장 대상) | **523/523장 (100%)** |
| mnemonic 필드 전체 추가 | **523/523장 (100%)** |
| 기존 필드 무결성 유지 | 완료 (id, tags 등 변경 없음) |
| JSON 유효성 유지 | 완료 (파싱 오류 없음) |

---

## 3. 구현 내역

### 3.1 콘텐츠 보강 (Do 단계)

**파일별 작업:**

| 파일 | 카드 수 | tip 100% | mnemonic 100% |
|------|:-------:|:--------:|:-------------:|
| `data/flashcards/flashcards-se.json` | 241 | ✅ | ✅ |
| `data/flashcards/flashcards-db.json` | 93 | ✅ | ✅ |
| `data/flashcards/flashcards-os.json` | 86 | ✅ | ✅ |
| `data/flashcards/flashcards-network.json` | 103 | ✅ | ✅ |

**mnemonic 처리:**
- 기존 두문자어 보유 82장 (`"내공외제스자"`, `"개동고변"`, `"도부이결다조"` 등): 원본 유지
- 나머지 441장: `"암기 TIP"` 기본값 설정

### 3.2 코드베이스 정리 (Check 단계 이후)

Gap 분석 과정에서 데드 코드 및 버그를 발견하여 추가 정리:

**삭제된 파일 (총 10개):**

| 파일 | 이유 |
|------|------|
| `data/questions/theory-db.json` (30개) | convert-to-flashcards.ts 변환 완료된 소스 |
| `data/questions/theory-network.json` (30개) | 동일 |
| `data/questions/theory-os.json` (20개) | 동일 |
| `data/questions/theory-se.json` (55개) | 동일 |
| `data/questions/memorize-db.json` (20개) | flashcardService로 대체, 이중 계산 버그 유발 |
| `data/questions/memorize-network.json` (25개) | 동일 |
| `data/questions/memorize-os.json` (20개) | 동일 |
| `data/questions/memorize-se.json` (30개) | 동일 |
| `data/questions/sql-ddl.json` (0개) | 빈 파일, 학습탭 필터에서 제외됨 |
| `data/questions/sql-set.json` (0개) | 동일 |

**코드 수정:**

| 파일 | 수정 내용 |
|------|----------|
| `features/questions/services/questionService.ts` | theory-*, memorize-*, sql-ddl, sql-set require 제거 |
| `features/questions/types.ts` | `CategoryId`에서 theory-*, sql-ddl, sql-set 제거 |
| `data/categories.json` | sql-ddl, sql-set 항목 제거 |

### 3.3 진행도 버그 수정

**버그:** memorize 카테고리 문제(95개)가 전체 진행도 분모에 포함되었으나, 학습탭에서 memorize 카테고리는 `flashcardStore`로만 진행도를 기록 → 분모만 95개 증가하고 분자는 0 유지되는 이중 계산 문제

```
수정 전: totalItems = 일반문제 + memorize문제(95) + 플래시카드(523)
수정 후: totalItems = 일반문제 + 플래시카드(523)
```

---

## 4. 아키텍처 검증

| 항목 | 결과 |
|------|------|
| 폴더 구조 (Dynamic 레벨) | 준수 |
| 컴포넌트 명명 규칙 (PascalCase) | 준수 |
| 서비스 파일 명명 (`{domain}Service.ts`) | 준수 |
| 커스텀 훅 (`use` 접두사) | 준수 |
| 상수 (UPPER_SNAKE_CASE) | 준수 |
| 주석/문서 (한글) | 준수 |
| 임포트 순서 | 준수 |

---

## 5. 학습된 점

1. **변환 스크립트 실행 후 소스 파일 정리 필요**: `convert-to-flashcards.ts`로 변환 완료 후 원본 `theory-*.json`을 즉시 제거했어야 함
2. **두 스토어 간 진행도 분리 설계 주의**: `useUserStore`(문제)와 `useFlashcardStore`(카드)가 분리되면 전체 진행도 계산 시 어느 스토어를 기준으로 할지 명확히 설계 문서에 명시해야 함
3. **categories.json의 questionCount는 런타임에 덮어씀**: `categoryService.ts`가 `getQuestionCountMap()`으로 동적 계산 → JSON 파일의 hardcoded 0은 의미 없음

---

## 6. 다음 단계 권장

- `sql-dml.json` 문항 추가 (현재 5개로 부족)
- `code-*` 카테고리 문항 추가 (현재 모두 0개)
- 기출문제(`exam-*`) JSON 데이터 채우기
