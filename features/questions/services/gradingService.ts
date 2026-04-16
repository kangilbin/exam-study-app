/**
 * 주관식 채점 서비스
 * 답변 유형 판별, 파싱, 정규화, 채점 로직
 */

import { shuffle } from '@/lib/utils';
import type {
  Question,
  AnswerType,
  AnswerPart,
  AnswerMeta,
  OrderingItem,
  GradeResult,
} from '../types';

// ─── 정규화 헬퍼 ─────────────────────────────────────

/** 한글 포함 여부 */
const containsKorean = (s: string): boolean => /[가-힣ㄱ-ㅎ]/.test(s);

/** 한글 답변 정규화: 공백 제거 */
const normalizeKorean = (s: string): string =>
  s.trim().replace(/\s+/g, '');

/** 영문 답변 정규화: 소문자 + 공백 정리 */
const normalizeEnglish = (s: string): string =>
  s.trim().toLowerCase().replace(/\s+/g, ' ');

/** 코드 출력 정규화: 모든 공백/줄바꿈 제거 */
const normalizeCodeOutput = (s: string): string =>
  s.replace(/\s+/g, '');

/** SQL 정규화: 소문자 + 공백 정리 + 세미콜론 제거 + 괄호/쉼표/연산자 주변 공백 무시 */
const normalizeSql = (s: string): string =>
  s.trim()
    .replace(/;$/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\s*([(),])\s*/g, '$1')
    .replace(/\s*([=<>!])\s*/g, '$1');

/** 순서 기호 추출: ㄱ~ㅎ만 추출 */
const extractOrderSymbols = (s: string): string =>
  s.replace(/[^ㄱ-ㅎ]/g, '');

/** 범용 답변 정규화 (한글이면 공백 제거, 영문이면 소문자 + 쉼표 주변 공백 무시) */
const normalizeAnswer = (s: string): string => {
  const trimmed = s.trim();
  if (containsKorean(trimmed)) {
    return normalizeKorean(trimmed);
  }
  return normalizeEnglish(trimmed).replace(/\s*,\s*/g, ',');
};

// ─── 순서 라벨 상수 ─────────────────────────────────

const ORDER_LABELS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ'];

// ─── 파싱 함수 ──────────────────────────────────────

/** 복수 답변 파싱: (1) ARP (2) RARP → [{label:"(1)", answer:"ARP"}, ...] */
const parseMultipleAnswer = (answer: string): AnswerPart[] => {
  // 패턴 1: (1), (2), (3)
  const parenPattern = /\((\d+)\)\s*(.+?)(?=\(\d+\)|$)/g;
  let matches = [...answer.matchAll(parenPattern)];
  if (matches.length >= 2) {
    return matches.map((m) => ({
      label: `(${m[1]})`,
      answer: m[2].trim(),
    }));
  }

  // 패턴 2: ㄱ., ㄴ., ㄷ.
  const koreanPattern = /([ㄱ-ㅎ])\.\s*(.+?)(?=[ㄱ-ㅎ]\.|$)/g;
  matches = [...answer.matchAll(koreanPattern)];
  if (matches.length >= 2) {
    return matches.map((m) => ({
      label: m[1],
      answer: m[2].trim(),
    }));
  }

  // 패턴 3: 1., 2., 3.
  const numPattern = /(\d+)\.\s*(.+?)(?=\d+\.|$)/g;
  matches = [...answer.matchAll(numPattern)];
  if (matches.length >= 2) {
    return matches.map((m) => ({
      label: `(${m[1]})`,
      answer: m[2].trim(),
    }));
  }

  return [];
};

/** 순서 나열 파싱 및 보기 생성 */
const parseOrderingAnswer = (answer: string): {
  orderingItems: OrderingItem[];
  correctOrder: string;
} => {
  // "기능적 > 통신적 > 시간적 > 우연적" → 항목 분리
  const items = answer.split('>').map((s) => s.trim()).filter(Boolean);

  // 항목에 라벨을 부여하고 셔플
  const labeled = items.map((text, i) => ({
    originalIndex: i,
    label: ORDER_LABELS[i] || String(i + 1),
    text,
  }));

  const shuffled = shuffle(labeled);

  // 셔플된 상태에서 라벨 재부여
  const orderingItems: OrderingItem[] = shuffled.map((item, i) => ({
    label: ORDER_LABELS[i] || String(i + 1),
    text: item.text,
  }));

  // 정답: 원래 순서대로의 라벨
  // shuffled[i]의 originalIndex가 j이면, 정답의 j번째 위치에 ORDER_LABELS[i]가 와야 함
  const correctOrderArr = new Array<string>(items.length);
  shuffled.forEach((item, i) => {
    correctOrderArr[item.originalIndex] = ORDER_LABELS[i] || String(i + 1);
  });

  return {
    orderingItems,
    correctOrder: correctOrderArr.join(''),
  };
};

/** SELECT 절에서 컬럼명 추출 */
const parseSqlColumns = (text: string): string[] => {
  const match = text.match(/SELECT\s+(.+?)\s+FROM/is);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((s) => s.trim())
    .map((s) => {
      // "AVG(점수) AS 평균점수" → "평균점수", "COUNT(*)" → "COUNT(*)"
      const asMatch = s.match(/\bAS\s+(.+)$/i);
      return asMatch ? asMatch[1].trim() : s;
    });
};

/** SQL 결과 답변 파싱: "이순신 | 1000" → [["이순신", "1000"]] */
const parseSqlResultRows = (answer: string): string[][] => {
  return answer
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|').map((cell) => cell.trim()));
};

/** 약어 추출: "RTO (Recovery Time Objective)" → "RTO" */
const extractAbbreviation = (answer: string): string => {
  const match = answer.match(/^([A-Z][A-Za-z0-9]{1,9})\s*\(/);
  return match ? match[1] : answer.trim();
};

/** 동의어 추출: "비정규화(반정규화)" → ["비정규화", "반정규화"] */
const extractAlternatives = (answer: string): string[] => {
  // 패턴: "본래어(동의어)" - 한글 동의어
  const koreanMatch = answer.match(/^(.+?)\(([가-힣\s]+)\)$/);
  if (koreanMatch) {
    return [koreanMatch[1].trim(), koreanMatch[2].trim()];
  }

  // 패턴: "English (한글)" 또는 "English Term 패턴"
  const mixedMatch = answer.match(/^([a-zA-Z\s]+)\s*\(([가-힣\s]+)\)$/);
  if (mixedMatch) {
    return [mixedMatch[1].trim(), mixedMatch[2].trim()];
  }

  // 패턴: "English Term 한글" (예: "Factory Method 패턴")
  const trailingKorean = answer.match(/^([a-zA-Z\s]+?)\s+([가-힣]+)$/);
  if (trailingKorean) {
    return [trailingKorean[1].trim(), answer.trim()];
  }

  return [answer.trim()];
};

/**
 * 문제 텍스트에서 [보기] 라벨 매핑 추출
 * 반환: { text → label } 맵 (공백 제거된 텍스트 기준)
 */
const parseBogiLabels = (questionText: string): Map<string, string> => {
  const map = new Map<string, string>();
  const bogiIndex = questionText.indexOf('[보기]');
  if (bogiIndex === -1) return map;

  const afterBogi = questionText.slice(bogiIndex);
  const labelPattern = /([ㄱ-ㅎ])\.\s*(.+?)(?=[ㄱ-ㅎ]\.|$)/g;
  const matches = [...afterBogi.matchAll(labelPattern)];

  for (const m of matches) {
    const normalized = m[2].trim().replace(/\s+/g, '');
    map.set(normalized, m[1]);
  }
  return map;
};

/** 정답 텍스트에 대응하는 [보기] 라벨 찾기 */
const findLabelForAnswer = (questionText: string, answer: string): string | null => {
  const map = parseBogiLabels(questionText);
  if (map.size === 0) return null;

  // 답에서 라벨 접두사 제거 후 매칭 ("ㄷ. Attribute" → "Attribute")
  const stripped = answer.trim().replace(/^[ㄱ-ㅎ]\.\s*/, '');
  const normalizedAnswer = stripped.replace(/\s+/g, '');

  for (const [text, label] of map) {
    if (text === normalizedAnswer) return label;
  }

  // 원본 답으로도 시도
  const rawNormalized = answer.trim().replace(/\s+/g, '');
  for (const [text, label] of map) {
    if (text === rawNormalized) return label;
  }

  return null;
};

/** 답이 "ㄷ. Attribute" 같은 라벨 접두사 패턴인지 */
const LABEL_PREFIX_PATTERN = /^([ㄱ-ㅎ])\.\s*(.+)$/;

// ─── 답변 유형 판별 ─────────────────────────────────

/** SQL 키워드 패턴 */
const SQL_PATTERN = /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i;

/** 약어 패턴: 대문자+숫자만, 대문자 1개 이상 필수 (CRC, MD5, ARP) */
const ABBR_PATTERN = /^(?=.*[A-Z])[A-Z0-9]{2,10}$/;

/** 약어 + 괄호 풀네임 패턴 */
const ABBR_FULLNAME_PATTERN = /^[A-Z][A-Za-z0-9]{1,9}\s*\(.+\)$/;

/** 영문 단어 2개 이상 패턴 */
const ENGLISH_WORDS_PATTERN = /^[a-zA-Z]+(\s+[a-zA-Z]+)+$/;

/** 복수 답변 패턴 체크 */
const isMultipleAnswer = (answer: string): boolean => {
  return (
    /\(\d+\)\s*.+\(\d+\)/.test(answer) ||
    /[ㄱ-ㅎ]\.\s*.+[ㄱ-ㅎ]\./.test(answer) ||
    /^\d+\.\s*.+\d+\./.test(answer)
  );
};

/** 라벨 선택형 체크: "ㄱ, ㄴ, ㄷ" 처럼 기호만 나열된 답 */
const isLabelSelection = (answer: string): boolean => {
  const cleaned = answer.replace(/[,\s]/g, '');
  return /^[ㄱ-ㅎ]{2,}$/.test(cleaned);
};

/** 라벨 선택 정규화: 기호만 추출 + 정렬 (순서/구분자 무관) */
const normalizeLabelSelection = (s: string): string =>
  s.replace(/[^ㄱ-ㅎ]/g, '').split('').sort().join('');

/** 쉼표로 구분된 복수 정답 여부 확인 */
const isCommaSeparatedMulti = (s: string): boolean => {
  const parts = s.split(',').map((p) => p.trim());
  return parts.length >= 2 && parts.every((p) => p.length > 0);
};

/** 쉼표로 구분된 복수 답변 정규화: 각 항목 정규화 후 정렬 (순서 무관 비교) */
const normalizeCommaSeparated = (s: string): string =>
  s.split(',').map((p) => normalizeAnswer(p.trim())).sort().join(',');

/** 문제의 답변 유형을 판별하여 AnswerMeta 생성 */
export const detectAnswerType = (question: Question): AnswerMeta => {
  const { answer, type: questionType } = question;

  // 0. "또는"으로 구분된 복수 정답: "A 또는 B" → 둘 다 정답
  if (answer.includes(' 또는 ')) {
    const alternatives = answer.split(' 또는 ').map((s) => s.trim());
    return {
      type: 'text',
      hint: '답을 입력하세요',
      primaryAnswer: alternatives[0],
      alternatives,
    };
  }

  // 1. 코드 문제 → 복수 빈칸이면 multiple, 아니면 codeOutput
  if (questionType === 'code') {
    if (isMultipleAnswer(answer)) {
      const parts = parseMultipleAnswer(answer);
      if (parts.length >= 2) {
        return {
          type: 'multiple',
          hint: '',
          parts,
          primaryAnswer: answer,
        };
      }
    }
    return {
      type: 'codeOutput',
      hint: '출력 결과를 입력하세요',
      primaryAnswer: answer,
    };
  }

  // 1-1. SQL 쿼리 결과 (답에 | 포함, sql 타입)
  if (questionType === 'sql' && answer.includes('|') && !SQL_PATTERN.test(answer)) {
    const codeText = question.codeSnippet || question.question;
    const columns = parseSqlColumns(codeText);
    const rows = parseSqlResultRows(answer);
    if (columns.length > 0 && rows.length > 0) {
      return {
        type: 'sqlResult',
        hint: '쿼리 실행 결과를 입력하세요',
        sqlColumns: columns,
        sqlExpectedRows: rows,
        primaryAnswer: answer,
      };
    }
  }

  // 2. SQL문 답변
  if (SQL_PATTERN.test(answer)) {
    return {
      type: 'sql',
      hint: 'SQL문을 입력하세요',
      primaryAnswer: answer,
    };
  }

  // 3. 복수 답변
  if (isMultipleAnswer(answer)) {
    const parts = parseMultipleAnswer(answer);
    if (parts.length >= 2) {
      // [보기]가 있으면 각 파트에 라벨 대안 추가
      const bogiMap = parseBogiLabels(question.question);
      if (bogiMap.size > 0) {
        for (const part of parts) {
          const normalized = part.answer.trim().replace(/\s+/g, '');
          for (const [text, lbl] of bogiMap) {
            if (text.toLowerCase() === normalized.toLowerCase()) {
              part.alternatives = [part.answer, lbl];
              break;
            }
          }
        }
      }
      return {
        type: 'multiple',
        hint: '',
        parts,
        primaryAnswer: answer,
      };
    }
  }

  // 4. 순서 나열
  if (answer.includes('>') && answer.split('>').length >= 3) {
    const { orderingItems, correctOrder } = parseOrderingAnswer(answer);
    return {
      type: 'ordering',
      hint: '순서를 기호로 입력하세요 (예: ㄱㄴㄷㄹ)',
      orderingItems,
      correctOrder,
      primaryAnswer: answer,
    };
  }

  // 4-1. 라벨 선택형: "ㄱ, ㄴ, ㄷ, ㄹ, ㅁ" (보기에서 골라 모두 작성)
  if (isLabelSelection(answer)) {
    return {
      type: 'text',
      hint: '해당하는 기호를 모두 입력하세요 (예: ㄱㄴㄷ)',
      primaryAnswer: answer,
    };
  }

  // 4-2. 라벨 접두사 답: "ㄷ. Attribute" → ㄷ 또는 Attribute 정답
  const labelPrefixMatch = answer.match(LABEL_PREFIX_PATTERN);
  if (labelPrefixMatch) {
    const ansLabel = labelPrefixMatch[1];
    const ansText = labelPrefixMatch[2].trim();
    const textType = ABBR_PATTERN.test(ansText) ? 'abbreviation'
      : ENGLISH_WORDS_PATTERN.test(ansText) ? 'fullName' : 'text';
    const hint = textType === 'abbreviation' ? '약어 또는 보기 기호를 입력하세요'
      : textType === 'fullName' ? '영문명 또는 보기 기호를 입력하세요'
      : '답 또는 보기 기호를 입력하세요';
    return {
      type: textType,
      hint,
      primaryAnswer: ansText,
      alternatives: [ansText, ansLabel],
    };
  }

  // 5. 약어 + 괄호 풀네임: "RTO (Recovery Time Objective)"
  if (ABBR_FULLNAME_PATTERN.test(answer.trim())) {
    const abbr = extractAbbreviation(answer);
    return {
      type: 'abbreviation',
      hint: '약어를 입력하세요',
      primaryAnswer: abbr,
    };
  }

  // 6. 순수 영문 약어: "CRC", "MD5"
  if (ABBR_PATTERN.test(answer.trim())) {
    return {
      type: 'abbreviation',
      hint: '약어를 입력하세요',
      primaryAnswer: answer.trim(),
    };
  }

  // 7. 영문 단어 조합: "Observer Pattern", "Abstract Factory"
  if (ENGLISH_WORDS_PATTERN.test(answer.trim())) {
    return {
      type: 'fullName',
      hint: '영문명을 입력하세요',
      primaryAnswer: answer.trim(),
      alternatives: [answer.trim()],
    };
  }

  // 8. 영문 + 한글 혼합: "Factory Method 패턴", "Control Coupling (제어 결합도)"
  const alts = extractAlternatives(answer);
  if (alts.length >= 2 && !containsKorean(alts[0])) {
    return {
      type: 'fullName',
      hint: '영문명을 입력하세요',
      primaryAnswer: alts[0],
      alternatives: alts,
    };
  }

  // 9. 한글 동의어: "비정규화(반정규화)"
  if (alts.length >= 2 && containsKorean(alts[0])) {
    const labelAlt = findLabelForAnswer(question.question, alts[0]);
    const allAlts = labelAlt ? [...alts, labelAlt] : alts;
    return {
      type: 'text',
      hint: labelAlt ? '답 또는 보기 기호를 입력하세요' : '답을 입력하세요',
      primaryAnswer: alts[0],
      alternatives: allAlts,
    };
  }

  // 10. 기본: 일반 텍스트
  // [보기] 라벨이 있으면 기호도 정답으로 추가
  const label = findLabelForAnswer(question.question, answer);
  if (label) {
    return {
      type: 'text',
      hint: '답 또는 보기 기호를 입력하세요',
      primaryAnswer: answer.trim(),
      alternatives: [answer.trim(), label],
    };
  }

  return {
    type: 'text',
    hint: '답을 입력하세요',
    primaryAnswer: answer.trim(),
  };
};

// ─── 채점 함수 ──────────────────────────────────────

/** 단일 답변 비교 (유형에 맞는 정규화 적용) */
const compareAnswer = (
  userAnswer: string,
  correctAnswer: string,
  type: AnswerType,
): boolean => {
  switch (type) {
    case 'abbreviation':
      return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

    case 'fullName':
      return normalizeEnglish(userAnswer) === normalizeEnglish(correctAnswer);

    case 'codeOutput': {
      // 줄 단위 비교: 각 줄의 앞뒤 공백 제거 후 비교
      const userLines = userAnswer.trim().split('\n').map((l) => l.trim());
      const correctLines = correctAnswer.trim().split('\n').map((l) => l.trim());
      if (userLines.length !== correctLines.length) return false;
      return userLines.every((line, i) => line === correctLines[i]);
    }

    case 'sql':
      return normalizeSql(userAnswer) === normalizeSql(correctAnswer);

    case 'text':
    default:
      // 라벨 선택형: 기호 추출 + 정렬 비교 (순서/구분자 무관)
      if (isLabelSelection(correctAnswer)) {
        return normalizeLabelSelection(userAnswer) === normalizeLabelSelection(correctAnswer);
      }
      // 쉼표로 구분된 복수 항목: 순서 무관 비교 (예: "원자성, 독립성" = "독립성, 원자성")
      if (isCommaSeparatedMulti(correctAnswer)) {
        return normalizeCommaSeparated(userAnswer) === normalizeCommaSeparated(correctAnswer);
      }
      // 한글 포함 시 공백 제거, 영문이면 소문자 비교
      return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
  }
};

/** 개별 파트의 답변 유형 추정 */
const detectPartType = (answer: string): AnswerType => {
  if (ABBR_PATTERN.test(answer.trim())) return 'abbreviation';
  if (ENGLISH_WORDS_PATTERN.test(answer.trim())) return 'fullName';
  return 'text';
};

/** 주관식 채점 */
export const gradeAnswer = (
  userAnswers: Record<string, string>,
  answerMeta: AnswerMeta,
): GradeResult => {
  const { type, primaryAnswer, alternatives, parts, correctOrder, sqlColumns, sqlExpectedRows } = answerMeta;

  // SQL 결과 채점
  if (type === 'sqlResult' && sqlColumns && sqlExpectedRows) {
    const partResults: GradeResult['partResults'] = [];

    // 사용자가 입력한 행 수 파악
    const userRowKeys = Object.keys(userAnswers).filter((k) => k.startsWith('row_'));
    const maxRow = userRowKeys.reduce((max, k) => {
      const m = k.match(/^row_(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, -1);
    const userRowCount = maxRow + 1;

    // 행 수 불일치 체크
    const expectedRowCount = sqlExpectedRows.length;
    const rowCountMatch = userRowCount === expectedRowCount;

    // 각 정답 행을 사용자 행과 매칭 (순서 무관)
    const matchedExpected = new Set<number>();
    const matchedUser = new Set<number>();

    for (let ur = 0; ur < userRowCount; ur++) {
      for (let er = 0; er < expectedRowCount; er++) {
        if (matchedExpected.has(er)) continue;
        let rowMatch = true;
        for (let c = 0; c < sqlColumns.length; c++) {
          const userVal = (userAnswers[`row_${ur}_col_${c}`] || '').trim();
          const expected = (sqlExpectedRows[er]?.[c] || '').trim();
          if (normalizeAnswer(userVal) !== normalizeAnswer(expected)) {
            rowMatch = false;
            break;
          }
        }
        if (rowMatch) {
          matchedExpected.add(er);
          matchedUser.add(ur);
          break;
        }
      }
    }

    // 결과 생성: 사용자 입력 행 기준으로 표시
    for (let ur = 0; ur < Math.max(userRowCount, expectedRowCount); ur++) {
      const userRow = sqlColumns
        .map((_, c) => (userAnswers[`row_${ur}_col_${c}`] || '').trim())
        .join(' | ');

      if (ur < userRowCount && matchedUser.has(ur)) {
        // 매칭된 행 (정답)
        partResults.push({
          label: `행 ${ur + 1}`,
          isCorrect: true,
          userAnswer: userRow,
          correctAnswer: userRow,
        });
      } else if (ur < userRowCount) {
        // 사용자가 입력했지만 매칭 안 됨 (오답)
        partResults.push({
          label: `행 ${ur + 1}`,
          isCorrect: false,
          userAnswer: userRow || '(미입력)',
          correctAnswer: '',
        });
      }
    }

    // 매칭 안 된 정답 행도 표시
    for (let er = 0; er < expectedRowCount; er++) {
      if (!matchedExpected.has(er)) {
        partResults.push({
          label: '누락',
          isCorrect: false,
          userAnswer: '',
          correctAnswer: sqlExpectedRows[er].join(' | '),
        });
      }
    }

    const allCorrect = matchedExpected.size === expectedRowCount && userRowCount === expectedRowCount;

    return {
      isCorrect: allCorrect,
      partResults,
      correctAnswer: primaryAnswer,
    };
  }

  // 복수 답변 채점
  if (type === 'multiple' && parts && parts.length > 0) {
    const partResults = parts.map((part, i) => {
      const userAnswer = userAnswers[`part_${i}`] || '';
      const partType = detectPartType(part.answer);
      // 동의어 + 보기 라벨 대안 모두 합치기
      const baseAlts = extractAlternatives(part.answer);
      const allAlts = part.alternatives
        ? [...new Set([...baseAlts, ...part.alternatives])]
        : baseAlts;
      const isCorrect = allAlts.some((alt) =>
        compareAnswer(userAnswer, alt, partType),
      );
      return {
        label: part.label,
        isCorrect,
        userAnswer,
        correctAnswer: part.answer,
      };
    });

    return {
      isCorrect: partResults.every((r) => r.isCorrect),
      partResults,
      correctAnswer: primaryAnswer,
    };
  }

  // 순서 나열 채점
  if (type === 'ordering' && correctOrder) {
    const userSymbols = extractOrderSymbols(userAnswers['main'] || '');
    return {
      isCorrect: userSymbols === correctOrder,
      correctAnswer: primaryAnswer,
    };
  }

  // 단일 답변 채점
  const userAnswer = userAnswers['main'] || '';
  const allAnswers = alternatives && alternatives.length > 0
    ? alternatives
    : [primaryAnswer];

  const isCorrect = allAnswers.some((alt) =>
    compareAnswer(userAnswer, alt, type),
  );

  return {
    isCorrect,
    correctAnswer: primaryAnswer,
  };
};
