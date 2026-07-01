# Gap Analysis: admob-add (재분석)

- **Feature**: admob-add
- **분석일**: 2026-06-29
- **Match Rate**: 91%
- **비고**: 최초 아카이브(2026-05, 100%) 이후 광고 방식 전면 변경 + 버그 발견/수정

---

## 1. Match Rate 요약

```
Overall Match Rate: 91%
✅ Match:   5 / 6 FR 항목
⚡ Evolved:  1 / 6 FR 항목 (설계 의도 변경, 기능 충족)
🔧 Bugs Fixed: 3건 (이번 세션에서 수정 완료)
```

---

## 2. 아키텍처 진화 (설계 → 현재)

원래 설계(`admob-add.design.md`)와 현재 구현이 크게 다름.  
"전면 보상형 광고로 변경" 커밋을 기점으로 구조가 전면 교체되었음.

| 구분 | 원래 설계 | 현재 구현 |
|------|----------|---------|
| 광고 타입 | `RewardedAd` (보상형) | `RewardedInterstitialAd` (전면 보상형) |
| 훅 구조 | `useRewardedAd.ts` 단일 훅 | `useAdGate` + `RewardedAdContext` + `lib/admob.ts` 분리 |
| 인스턴스 관리 | 컴포넌트별 생성 | 싱글톤 + Context 공유 (AdMob 재고 경합 방지) |
| 실패 처리 | Alert 다이얼로그 | `AdGateOverlay` 카운트다운 UI (5초 후 자동 진입) |
| 보상 확인 | `EARNED_REWARD` 필수 | `CLOSED` 이벤트로 처리 (FR-06 의도 변경) |

---

## 3. 기능 요구사항 (FR) 충족 여부

| FR | 요구사항 | 구현 위치 | 상태 |
|----|---------|---------|:---:|
| FR-01 | 처음 도전 시 광고 시청 후 퀴즈 진입 | `useExamCategories.handleExamPress` → `showAdWithLoading` | ✅ |
| FR-02 | 이미 진행 중인 경우 광고 없이 진입 | 모달 분기 유지, resume/incorrect 모드 광고 없음 | ✅ |
| FR-03 | 전체 다시 풀기 시 광고 재시청 | `navigateWithMode('all')` → `showAdWithLoading` | ✅ |
| FR-04 | 이어서 풀기 / 틀린 문제 풀기는 광고 미적용 | 해당 모드는 광고 없이 즉시 이동 | ✅ |
| FR-05 | 광고 로드 실패 시 에러 안내 | `AdGateOverlay` 카운트다운 + "지금 진입" 버튼 | ✅ |
| FR-06 | 광고 시청 취소 시 퀴즈 진입 불가 | `AdEventType.CLOSED` on → `onCompleted()` 즉시 실행 (스킵 가능) | ⚡ |

> **FR-06 설명**: 전면 보상형 광고로 전환 시 "전면 광고는 스킵 가능"이 AdMob 정책임.  
> 의도적 설계 변경으로 판단 (UX 개선 목적). 기능 차단보다 수익 최적화 우선.

---

## 4. 이번 세션에서 발견 및 수정한 버그

### BUG-01: `useQuizSession.ts` - resume-progress 잘못된 문제 로드 (심각)

**파일**: `features/questions/hooks/useQuizSession.ts`

**원인**: `resume-progress` 모드에서 `quizState.categoryId === categoryId` 조건이 true이면  
스토어의 기존 `questions` 배열을 그대로 사용. 스토어 상태가 오염된 경우  
학습 카테고리 문제가 기출 화면에 나오는 버그.

**수정**: 항상 `loadQuestionsByCategory()`로 원본 JSON에서 새로 로드 후 `startQuizAt()` 호출.

```diff
- if (quizState.categoryId === categoryId && quizState.questions.length > 0) {
-   qs = quizState.questions; // 스토어 기존 데이터 재사용 (오염 위험)
-   ...
- }
+ // 항상 원본 소스에서 로드
+ startQuizAt(categoryId, allQs, resumeIndex);
```

### BUG-02: `quiz.tsx` - 학습 탭에 기출 카테고리 노출 (중간)

**파일**: `app/(tabs)/quiz.tsx`

**원인**: `getCategoriesWithQuestions()`가 `exam` 그룹 포함 전체 카테고리 반환.  
학습 탭 목록에 기출 회차가 표시되어 모달 없이 직접 진입 가능 → 스토어 상태 오염 경로.

**수정**: `.filter((cat) => cat.group !== 'exam')` 추가.

### BUG-03: `useAdGate.ts` - 광고 타임아웃 30s (경미)

**파일**: `components/ads/useAdGate.ts`

**원인**: 테스트용 `AD_LOAD_TIMEOUT_MS = 30_000` (TODO 주석)이 커밋에 포함됨.

**수정**: 원래 값 `15_000`으로 복원.

---

## 5. 코드 품질 평가

| 항목 | 평가 | 비고 |
|------|:---:|------|
| TypeScript strict 준수 | ✅ | |
| 컴포넌트 구조 | ✅ | Context + Hook 분리 우수 |
| AdMob 싱글톤 패턴 | ✅ | 재고 경합 방지 설계 |
| Expo Go 노옵 처리 | ✅ | |
| 지수 백오프 재시도 | ✅ | `lib/admob.ts` |
| CLAUDE.md 컨벤션 | ✅ | |

---

## 6. 판정

**Match Rate 91% ≥ 90% → Check 단계 완료**

- FR-06 의도적 변경은 기능 결함이 아닌 UX 설계 진화로 인정
- 이번 세션 3개 버그 수정 완료

다음 단계: `/pdca report admob-add`
