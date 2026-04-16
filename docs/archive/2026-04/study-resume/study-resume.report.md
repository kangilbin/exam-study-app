# PDCA Report: study-resume (학습탭 이어서 학습 기능)

## 개요

| 항목 | 내용 |
|------|------|
| 기능명 | study-resume |
| 유형 | UX 개선 |
| 완료일 | 2026-04-14 |
| Match Rate | 98.5% |
| 반복 횟수 | 0 (1회 통과) |

## PDCA 진행 이력

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ (98.5%) → [Report] ✅
```

| Phase | 상태 | 비고 |
|-------|------|------|
| Plan | 완료 | `study-resume.plan.md` — 4개 FR 정의 |
| Design | 완료 | `study-resume.design.md` — 8개 섹션 상세 설계 |
| Do | 완료 | 4개 파일 수정, tsc + expo 빌드 통과 |
| Check | 98.5% | Gap 0건, Improved 10건 (사용자 피드백 반영) |
| Report | 본 문서 | |

## 구현 결과

### 수정 파일 (4개, 신규 파일 없음)

| 파일 | 변경 내용 |
|------|----------|
| `features/flashcards/types.ts` | `LastSession` 인터페이스 추가 |
| `store/useFlashcardStore.ts` | 6개 액션 추가 + `lastSession` 영속화 + 기존 액션 세션 자동 저장 |
| `app/quiz/[categoryId].tsx` | `mode=resume` 처리, 이전/다음 버튼, 종료확인 모달 |
| `app/(tabs)/index.tsx` | 바텀시트 모달, 전체 진행도에 플래시카드 포함 |

### 신규 스토어 액션

| 액션 | 역할 |
|------|------|
| `goToPrevious()` | 이전 카드로 이동 (상태 변경 없음) |
| `goToNext()` | 다음 카드로 이동 (상태 변경 없음) |
| `saveSession()` | 현재 세션을 `lastSession`에 저장 |
| `resumeSession()` | `lastSession`에서 카드 순서 + 위치 복원 |
| `resumeFromProgress(categoryId)` | cardProgress 기반 첫 unseen 카드 위치에서 시작 |
| `clearLastSession()` | 학습 완료 시 `lastSession` 클리어 |

### 요구사항 충족

| FR | 요구사항 | 구현 |
|----|---------|------|
| FR-01 | 학습탭 카테고리 클릭 시 모달 | 학습 기록 있으면 바텀시트 모달 (이어서/처음부터/모르는카드만) |
| FR-02 | 카드 학습 중 이전 카드 보기 | 하단 이전/다음 버튼으로 자유 탐색 |
| FR-03 | 뒤로가기 동작 개선 | 상단 ← = 항상 종료 확인 모달 (세션 저장 후 나가기) |
| FR-04 | 세션 상태 영속화 | `lastSession` AsyncStorage 저장, 앱 재시작 후 이어서 가능 |

### 추가 수정 (사용자 피드백)

| 항목 | 원래 설계 | 최종 구현 |
|------|----------|----------|
| 이어서 학습 대상 | lastSession 있는 1개 카테고리만 | 모든 카테고리 (cardProgress 기반) |
| 뒤로가기 동작 | 첫 카드=종료, 그 외=이전카드 | 항상 종료 확인 모달 |
| 전체 진행도 | 문제(155)만 카운트 | 문제(155) + 플래시카드(523) = 678개 통합 |

## 품질 검증

| 검증 항목 | 결과 |
|----------|------|
| TypeScript strict 타입 체크 | 통과 (에러 0) |
| Expo iOS 빌드 | 성공 |
| Gap Analysis Match Rate | 98.5% |
| 미구현 Gap | 0건 |

## 학습 포인트

1. **"이어서 학습"의 정확한 의미**: lastSession(세션 1개)이 아닌 cardProgress(전체 진행도) 기반이어야 모든 카테고리에서 이어서 학습 가능
2. **뒤로가기 = 종료**: 상단 네비게이션 뒤로가기는 "화면 이탈" 의미. 카드 이동은 별도 UI로 분리해야 UX가 명확함
3. **진행도 통합**: 문제(question)와 플래시카드(flashcard)가 별도 데이터 구조인 경우 전체 진행도 합산 누락 주의
