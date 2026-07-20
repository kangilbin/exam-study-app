/**
 * 문제 데이터 관련 타입 정의
 * 정보처리기사 실기 학습 앱의 핵심 도메인 모델
 */

/** 문제 유형 */
export type QuestionType = 'code' | 'theory' | 'sql';

/** 프로그래밍 언어 (코드 문제용) */
export type CodeLanguage = 'c' | 'java' | 'python';

/** 카테고리 ID */
export type CategoryId =
  | 'code-c'
  | 'code-java'
  | 'code-python'
  | 'sql-dml'
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
  | 'exam-2026-1'
  | 'exam-2026-2'
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
  question: string;                  // 질문 텍스트 (마크다운 지원)
  answer: string;                    // 정답 텍스트
  explanation: string;               // 해설 (블러 처리 후 공개)
  codeSnippet?: string;             // 코드 스니펫
  codeLanguage?: CodeLanguage;      // 코드 언어
  imageUrl?: string;                // 문제 이미지 경로 (테이블/다이어그램 등)
  choices?: Choice[];                // 선택지 (없으면 단답형/서술형으로 암기 모드만)
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
  shuffleMode: boolean;
  fontSize: 'small' | 'medium' | 'large'; // 코드 블록 폰트 크기
}

/** 주관식 답변 유형 */
export type AnswerType =
  | 'text'           // 일반 한글/텍스트
  | 'abbreviation'   // 영문 약어 (CRC, ARP)
  | 'fullName'       // 영문명 (Observer Pattern)
  | 'multiple'       // 복수 답변 ((1) ARP (2) RARP)
  | 'ordering'       // 순서 나열 (기능적 > 통신적 > 시간적)
  | 'codeOutput'     // 코드 출력값
  | 'sql'            // SQL문
  | 'sqlResult';     // SQL 쿼리 실행 결과 (열별 입력)

/** 복수 답변의 개별 파트 */
export interface AnswerPart {
  label: string;     // "(1)", "ㄱ" 등
  answer: string;    // 해당 파트의 정답
  alternatives?: string[];  // 보기 라벨 등 대안 정답
}

/** 순서 나열 보기 항목 */
export interface OrderingItem {
  label: string;     // "ㄱ", "ㄴ", "ㄷ"
  text: string;      // "기능적 응집도"
}

/** 답변 분석 결과 (런타임 생성) */
export interface AnswerMeta {
  type: AnswerType;
  hint: string;                   // 입력칸 placeholder
  parts?: AnswerPart[];           // multiple일 때 각 파트
  alternatives?: string[];        // 동의어 목록
  orderingItems?: OrderingItem[]; // ordering 보기 목록
  correctOrder?: string;          // ordering 정답 기호 순서
  sqlColumns?: string[];          // sqlResult 컬럼명 목록
  sqlExpectedRows?: string[][];   // sqlResult 정답 행들
  primaryAnswer: string;          // 정규화된 주요 정답
}

/** 주관식 채점 결과 */
export interface GradeResult {
  isCorrect: boolean;
  partResults?: {
    label: string;
    isCorrect: boolean;
    userAnswer: string;
    correctAnswer: string;
  }[];
  correctAnswer: string;          // 표시용 정답 텍스트
}
