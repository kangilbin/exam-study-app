/**
 * 문제 데이터 관련 타입 정의
 * 정보처리기사 실기 학습 앱의 핵심 도메인 모델
 */

/** 문제 유형 */
export type QuestionType = 'code' | 'theory' | 'sql';

/** 난이도 */
export type Difficulty = 1 | 2 | 3; // 1=하, 2=중, 3=상

/** 문제 출처 */
export type QuestionSource = 'pdf' | 'generated';

/** 프로그래밍 언어 (코드 문제용) */
export type CodeLanguage = 'c' | 'java' | 'python';

/** 카테고리 ID */
export type CategoryId =
  | 'code-c'
  | 'code-java'
  | 'code-python'
  | 'code-common'
  | 'sql-dml'
  | 'sql-ddl'
  | 'sql-set'
  | 'theory-se'
  | 'theory-network'
  | 'theory-db'
  | 'theory-os'
  | 'exam-2022-3'
  | 'exam-2023-1'
  | 'exam-2023-2'
  | 'exam-2023-3'
  | 'exam-2024-1'
  | 'exam-2024-2'
  | 'exam-2024-3'
  | 'exam-2020-1'
  | 'exam-2020-2'
  | 'exam-2020-3'
  | 'exam-2020-4'
  | 'exam-2021-1'
  | 'exam-2021-2'
  | 'exam-2021-3'
  | 'exam-2022-1'
  | 'exam-2022-2'
  | 'exam-2025-1'
  | 'exam-2025-2'
  | 'exam-2025-3'
  | 'memorize-se'
  | 'memorize-network'
  | 'memorize-db'
  | 'memorize-os';

/** 객관식 선택지 */
export interface Choice {
  label: string;       // "1", "2", "3", "4"
  text: string;        // 선택지 내용
  isCorrect: boolean;  // 정답 여부
}

/** 문제 엔티티 (핵심 도메인 모델) */
export interface Question {
  id: string;                        // 고유 ID (형식: "{categoryId}_{순번}" 예: "code-c_001")
  categoryId: CategoryId;            // 대분류 카테고리
  subcategory: string;               // 소분류 (자유 형식)
  type: QuestionType;                // 문제 유형
  difficulty: Difficulty;            // 난이도
  year?: number;                     // 기출 연도
  round?: number;                    // 기출 회차

  // 공통 필드
  question: string;                  // 질문 텍스트 (마크다운 지원)
  answer: string;                    // 정답 텍스트
  explanation: string;               // 해설 (블러 처리 후 공개)

  // 코드 문제 전용
  codeSnippet?: string;             // 코드 스니펫
  codeLanguage?: CodeLanguage;      // 코드 언어

  // 객관식 전용
  choices?: Choice[];                // 선택지 (없으면 단답형/서술형으로 암기 모드만)

  // 메타데이터
  source: QuestionSource;            // 출처
  sourceFile?: string;               // 원본 PDF 파일명
  tags: string[];                    // 검색/필터용 태그
}

/** 카테고리 엔티티 */
export interface Category {
  id: CategoryId;
  name: string;                      // 표시명 (한글)
  icon: string;                      // Expo 아이콘명 (MaterialCommunityIcons)
  group: 'code' | 'sql' | 'theory' | 'exam'; // 대분류 그룹
  description: string;               // 카테고리 설명
  questionCount: number;             // 포함 문제 수 (빌드 시 계산)
  subcategories: string[];           // 소분류 목록
}

/** 학습 진행도 (사용자별 문제 상태) */
export interface QuestionProgress {
  questionId: string;
  status: 'unseen' | 'known' | 'unknown' | 'correct' | 'incorrect';
  attempts: number;                  // 시도 횟수
  lastAttemptAt: string;             // ISO 8601
  isBookmarked: boolean;
}

/** 카테고리별 통계 */
export interface CategoryStats {
  categoryId: CategoryId;
  totalQuestions: number;
  seenCount: number;
  correctCount: number;
  incorrectCount: number;
  bookmarkedCount: number;
  accuracy: number;                  // 정답률 (0~1)
}

/** 사용자 설정 */
export interface UserSettings {
  darkMode: boolean;
  shuffleMode: boolean;
  fontSize: 'small' | 'medium' | 'large'; // 코드 블록 폰트 크기
}
