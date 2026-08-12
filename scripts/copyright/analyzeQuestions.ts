/**
 * copyright-risk-mitigation Design §2.1 [1] 분석
 *
 * exam-*.json 420문항 + code-c/java/python/sql-dml 20문항(범위 밖, §2.2)을 로드해
 *   1) [0] domainMap 기준 회차별 도메인 구성 벡터 산출 (reallocate.ts의 고정 입력값)
 *   2) theory/sql 276문항의 정답(answer) 용어 빈도를 집계해 30%/70% 유지·교체 대상 산출 (§4.1)
 * 두 산출물을 scripts/copyright/output/*.json 으로 저장한다.
 *
 * 실행: npx tsx scripts/copyright/analyzeQuestions.ts
 */
import fs from 'fs';
import path from 'path';

import type { Question } from '../../features/questions/types';
import { classifyQuestion, type Domain } from './domainMap';

const QUESTIONS_DIR = path.join(__dirname, '../../data/questions');
const OUTPUT_DIR = path.join(__dirname, 'output');

const OUT_OF_SCOPE_FILES = ['code-c.json', 'code-java.json', 'code-python.json', 'sql-dml.json'];

function loadJson(file: string): Question[] {
  return JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf-8')) as Question[];
}

function loadExamQuestions(): Question[] {
  const files = fs
    .readdirSync(QUESTIONS_DIR)
    .filter((f) => f.startsWith('exam-') && f.endsWith('.json'))
    .sort();
  return files.flatMap(loadJson);
}

function loadOutOfScopeQuestions(): Question[] {
  return OUT_OF_SCOPE_FILES.flatMap(loadJson);
}

// ── 정답 텍스트 → 용어 목록 정규화 ──────────────────────────────────────
/**
 * "1. ORDER 2. score 3. DESC", "(1) Full 2. Partial 3. Transitive",
 * "ㄴ, ㅁ, ㅇ" 같은 다중 정답과 "SSO", "정규화" 같은 단일 정답을 모두
 * 개별 용어 배열로 분해한다. 표시용(term)과 빈도 비교용 키(key, 공백/대소문자 정규화)를 함께 반환한다.
 */
export interface AnswerTerm {
  term: string;
  key: string;
}

export function extractAnswerTerms(answer: string): AnswerTerm[] {
  const normalized = answer.replace(/\s+/g, ' ').trim();

  // "1.", "(1)", "①" 같은 번호 매김이 있으면 그 단위로 분해
  const numbered = normalized.split(/(?:^|\s)(?:\(\d+\)|\d+\.)\s*/).filter((s) => s.trim() !== '');
  const segments = numbered.length > 1 ? numbered : normalized.split(/\s*,\s*/);

  const finalSegments = segments.length > 1 ? segments : [normalized];

  return finalSegments
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((term) => ({ term, key: term.toLowerCase().replace(/\s+/g, '') }));
}

/**
 * "용어/약어"로 볼 수 있는 세그먼트만 남긴다. 아래는 제외:
 * - 순수 숫자("1", "200") — 순서/개수 답, 개념 용어가 아님
 * - 단일 자음 자모("ㄱ","ㄴ" 등) — 보기 선택지 기호(ㄱ.~ㅇ.)이지 용어가 아님
 * - 긴 서술형/수식 답안(예: "(대기 시간 + 서비스 시간) / 서비스 시간")
 */
export function isTermLike(term: string): boolean {
  if (term.length === 0 || term.length > 20) return false;
  if (/^\d+$/.test(term)) return false;
  if (/^[ㄱ-ㅎ]$/.test(term)) return false;
  if (/[=+()]|시간|경우|방식으로|따라서/.test(term)) return false;
  return true;
}

interface QuestionAnalysis {
  id: string;
  categoryId: string;
  subcategory: string;
  type: Question['type'];
  domain: Domain;
  answerTerms: AnswerTerm[];
  maxTermFrequency: number;
  hasImage: boolean;
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const examQuestions = loadExamQuestions();
  const outOfScopeQuestions = loadOutOfScopeQuestions();
  console.log(`exam-* 문항: ${examQuestions.length} / 범위 밖(code-c 등) 문항: ${outOfScopeQuestions.length}`);

  // 1) 회차별 도메인 구성 벡터 (reallocate.ts 고정 입력값)
  const domainByRound: Record<string, Record<string, number>> = {};
  const domainOf = new Map<string, Domain>();
  for (const q of examQuestions) {
    const domain = classifyQuestion(q);
    if (domain === 'unclassified') {
      throw new Error(`미분류 문항 발견: ${q.id} — domainMap.ts 오버라이드를 먼저 확정하세요.`);
    }
    domainOf.set(q.id, domain);
    domainByRound[q.categoryId] ??= {};
    domainByRound[q.categoryId][domain] = (domainByRound[q.categoryId][domain] ?? 0) + 1;
  }
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'domain-counts.json'),
    JSON.stringify(domainByRound, null, 2),
    'utf-8'
  );
  console.log(`\n[1] 회차별 도메인 구성 벡터 → output/domain-counts.json (${Object.keys(domainByRound).length}개 회차)`);

  // 2) theory/sql 정답 용어 빈도 집계
  const termFrequency = new Map<string, { term: string; count: number; questionIds: string[] }>();
  const analyses: QuestionAnalysis[] = [];

  const themeQuestions = examQuestions.filter((q) => q.type === 'theory' || q.type === 'sql');
  for (const q of themeQuestions) {
    const allTerms = extractAnswerTerms(q.answer);
    const termLikeOnly = allTerms.filter((t) => isTermLike(t.term));

    for (const t of termLikeOnly) {
      const entry = termFrequency.get(t.key) ?? { term: t.term, count: 0, questionIds: [] };
      entry.count += 1;
      entry.questionIds.push(q.id);
      termFrequency.set(t.key, entry);
    }

    analyses.push({
      id: q.id,
      categoryId: q.categoryId,
      subcategory: q.subcategory,
      type: q.type,
      domain: domainOf.get(q.id)!,
      answerTerms: termLikeOnly,
      maxTermFrequency: 0, // 아래에서 채움 (termFrequency 완성 후 재계산 필요)
      hasImage: Boolean(q.imageUrl), // FR-02: 이미지 보유 문항은 빈도 순위와 무관하게 항상 kept
    });
  }

  // termFrequency가 전수 집계된 뒤에 각 문항의 maxTermFrequency를 다시 계산
  for (const a of analyses) {
    a.maxTermFrequency = a.answerTerms.reduce((max, t) => {
      const count = termFrequency.get(t.key)?.count ?? 0;
      return Math.max(max, count);
    }, 0);
  }

  // FR-02가 FR-04보다 우선: imageUrl 보유 문항은 빈도 순위와 무관하게 항상 kept/image.
  // 나머지(이미지 없는 문항)만 정답 용어 빈도로 30/70을 나눈다.
  const withImage = analyses.filter((a) => a.hasImage);
  const withoutImage = analyses.filter((a) => !a.hasImage);

  // 빈도 내림차순 정렬 (동률이면 원본 순서 유지 = 안정 정렬)
  const sorted = [...withoutImage].sort((a, b) => b.maxTermFrequency - a.maxTermFrequency);

  const keepCount = Math.round(sorted.length * 0.3);
  const imageAssignment = withImage.map((a) => ({
    id: a.id,
    categoryId: a.categoryId,
    subcategory: a.subcategory,
    type: a.type,
    domain: a.domain,
    answerTerms: a.answerTerms.map((t) => t.term),
    maxTermFrequency: a.maxTermFrequency,
    changeType: 'kept' as const,
    changeReason: 'image' as const,
  }));
  const termAssignment = sorted.map((a, index) => ({
    id: a.id,
    categoryId: a.categoryId,
    subcategory: a.subcategory,
    type: a.type,
    domain: a.domain,
    answerTerms: a.answerTerms.map((t) => t.term),
    maxTermFrequency: a.maxTermFrequency,
    changeType: index < keepCount ? ('kept' as const) : ('rewritten' as const),
    changeReason: 'high-frequency-term' as const,
  }));

  const assignment = [...imageAssignment, ...termAssignment];

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'theory-sql-assignment.json'),
    JSON.stringify(assignment, null, 2),
    'utf-8'
  );

  const termFrequencyList = [...termFrequency.values()]
    .sort((a, b) => b.count - a.count)
    .map((e) => ({ term: e.term, count: e.count, questionIds: e.questionIds }));
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'term-frequency.json'),
    JSON.stringify(termFrequencyList, null, 2),
    'utf-8'
  );

  const rewrittenCount = termAssignment.length - keepCount;
  console.log(
    `\n[2] theory/sql 문항: ${themeQuestions.length}개 = 이미지 보유(항상 kept) ${withImage.length}개 + 이미지 없음 ${withoutImage.length}개(유지 ${keepCount} / 교체 ${rewrittenCount})`
  );
  console.log(`    → output/theory-sql-assignment.json, output/term-frequency.json`);

  console.log(`\n[정답 용어 고유 개수] ${termFrequencyList.length}개`);
  console.log('[상위 15개 빈출 용어]');
  termFrequencyList.slice(0, 15).forEach((e) => console.log(`  ${e.term}: ${e.count}회`));

  const noTermAnswers = analyses.filter((a) => a.answerTerms.length === 0);
  console.log(
    `\n[용어로 추출되지 않은 서술형/수식 정답 ${noTermAnswers.length}건] — 빈도 0으로 처리되어 자동으로 "교체" 그룹에 속함, Do 단계에서 재검토 권장`
  );
  noTermAnswers.slice(0, 10).forEach((a) => console.log(`  - ${a.id} (${a.subcategory}): ${a.type}`));
  if (noTermAnswers.length > 10) console.log(`  ... 외 ${noTermAnswers.length - 10}건`);
}

if (require.main === module) {
  main();
}