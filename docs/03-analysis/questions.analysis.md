# Gap 분석 보고서: questions (정보처리기사 실기 학습 앱)

> 분석일: 2026-04-14 | Match Rate: **79%**

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| 기능 요구사항 (FR-01~10) | 85% | PASS |
| 데이터 모델 | 95% | PASS |
| 화면/라우팅 | 63% | WARNING |
| 컴포넌트 분리 | 14% | FAIL |
| 스토어 | 78% | WARNING |
| 서비스 | 72% | WARNING |
| 인프라 (Firebase 등) | 31% | FAIL |
| 코드 컨벤션 | 92% | PASS |
| **종합 (가중 평균)** | **79%** | **WARNING** |

---

## Gap 유형 분류

### MISSING: 설계 O, 구현 X (9건)

| # | 항목 | 영향도 | 비고 |
|---|------|:------:|------|
| 1 | Firebase 연동 전체 | Medium | 의도적 미구현 (로컬 우선) |
| 2 | 다크 모드 (FR-10) | Low | 코드 정리 시 제거됨 |
| 3 | 암기 전용 탭 | Low | 학습 탭에 통합 |
| 4 | 공통 UI 컴포넌트 6개 (Card, Button 등) | Medium | 인라인 구현 |
| 5 | 퀴즈 컴포넌트 3개 (QuizQuestion 등) | Medium | [categoryId].tsx에 인라인 |
| 6 | ErrorBoundary | Low | |
| 7 | questionService 함수 3개 | Low | 코드 정리 시 제거 |
| 8 | flashcardService 함수 3개 | Low | 코드 정리 시 제거 |
| 9 | 테스트 코드 | Medium | 전체 미작성 |

### ADDED: 설계 X, 구현 O (8건)

| # | 항목 | 영향도 | 비고 |
|---|------|:------:|------|
| 1 | 주관식 채점 시스템 (gradingService) | High | 700+ lines, 10가지 답변 유형 |
| 2 | 기출문제 전용 탭 (exam.tsx) | Medium | 연도별 SectionList |
| 3 | Google AdMob 광고 | Medium | 배너/전면 광고 |
| 4 | 이미지 문제 지원 | Low | imageUrl 필드 |
| 5 | 퀴즈 이어풀기 (persist) | Medium | 앱 종료 후 복원 |
| 6 | 카테고리 진행도 초기화 | Low | |
| 7 | 카드/주관식 통합 화면 | Low | isCardMode 분기 |
| 8 | 기출 2020-2021년 데이터 | Low | 추가 기출 |

### CHANGED: 설계 != 구현 (8건)

| # | 항목 | 설계 | 구현 |
|---|------|------|------|
| 1 | Tab 구조 | 4탭 (홈/암기/풀이/프로필) | 3탭 (학습/기출/내정보) |
| 2 | 스타일링 | NativeWind | StyleSheet |
| 3 | 홈 화면 | 전체 카테고리 + 모드 토글 | 기출 제외, 토글 없음 |
| 4 | FlashCard 경로 | components/flashcard/ | components/ (flat) |
| 5 | 플래시카드 화면 | 별도 라우트 | [categoryId] 내 분기 |
| 6 | FlashcardStore 구조 | knownIds/unknownIds | cardProgress Record |
| 7 | UserSettings.darkMode | 포함 | 제거됨 |
| 8 | calculateCategoryStats | totalQuestions param | questionIds[] param |

---

## 권장 조치

### 1순위: 설계 문서 업데이트 (Match Rate 90%+ 달성 핵심)

대부분의 Gap은 **의도적 변경/추가**이므로, 설계 문서를 현재 구현에 맞게 업데이트하면 Match Rate가 크게 상승합니다:

- Tab 구조 3탭으로 변경
- NativeWind → StyleSheet 변경 반영
- Firebase → "향후 구현" 또는 제외 범위로 이동
- 주관식 채점 시스템 설계 추가
- 광고 시스템 설계 추가
- 기출 전용 탭 + 이어풀기 반영

### 2순위: 컴포넌트 분리 (선택)

인라인 구현된 반복 UI 패턴을 재사용 컴포넌트로 분리:
- ProgressBar (3개 화면에서 유사 코드)
- CategoryCard (index, quiz에서 유사 패턴)

### 3순위: 향후 로드맵

- 다크 모드 재구현 (필요 시)
- Firebase 연동 (서버 동기화 필요 시)
- 테스트 코드 작성
