/**
 * copyright-risk-mitigation Design §2.1 [2] 용어추출 / FR-06
 *
 * exam-*.json 420문항에서
 *   1) 정답(answer) 용어와
 *   2) 문항 본문에 ㄱ.ㄴ.ㄷ... 또는 "[보기]" 형태로 나열된 보기 목록의 용어(정답이 아닌 것 포함)
 * 를 모두 추출하고, 기존 플래시카드 523장(`data/flashcards/*.json`)과 중복 제거한 뒤
 * 신규 플래시카드 후보 목록을 산출한다.
 *
 * 실행: npx tsx scripts/copyright/extractTerms.ts
 */
import fs from 'fs';
import path from 'path';

import type { Question } from '../../features/questions/types';
import type { FlashCard } from '../../features/flashcards/types';
import { classifyQuestion, type Domain } from './domainMap';
import { extractAnswerTerms, isTermLike } from './analyzeQuestions';

const QUESTIONS_DIR = path.join(__dirname, '../../data/questions');
const FLASHCARDS_DIR = path.join(__dirname, '../../data/flashcards');
const OUTPUT_DIR = path.join(__dirname, 'output');

const FLASHCARD_FILES = [
  'flashcards-se.json',
  'flashcards-network.json',
  'flashcards-db.json',
  'flashcards-os.json',
];

/** flashcards는 4개 파일만 로드하므로(code/sql 전용 파일 없음), sql 도메인은 db 파일에 합류시킨다. */
const DOMAIN_TO_FLASHCARD_FILE: Partial<Record<Domain, string>> = {
  se: 'flashcards-se.json',
  'network-security': 'flashcards-network.json',
  db: 'flashcards-db.json',
  sql: 'flashcards-db.json',
  os: 'flashcards-os.json',
  // code: 대응 파일 없음 — 코드 문항 용어는 플래시카드 후보에서 제외
};

function normalizeKey(term: string): string {
  return term.toLowerCase().replace(/\s+/g, '');
}

function loadExamQuestions(): Question[] {
  const files = fs
    .readdirSync(QUESTIONS_DIR)
    .filter((f) => f.startsWith('exam-') && f.endsWith('.json'))
    .sort();
  return files.flatMap((f) => JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, f), 'utf-8')) as Question[]);
}

function loadExistingFlashcardKeys(): Set<string> {
  const keys = new Set<string>();
  for (const file of FLASHCARD_FILES) {
    const cards = JSON.parse(
      fs.readFileSync(path.join(FLASHCARDS_DIR, file), 'utf-8')
    ) as FlashCard[];
    for (const card of cards) keys.add(normalizeKey(card.term));
  }
  return keys;
}

// ── [보기] 목록 추출 ────────────────────────────────────────────────────
/**
 * 두 가지 실사용 패턴을 모두 처리한다.
 *  A) "ㄱ.term  ㄴ.term  ㄷ.term ..." — [보기] 라벨 유무와 무관하게 본문 어디든 등장
 *  B) "[보기] term1, term2, term3" 또는 "[보기] term1 / term2 / term3" — 라벨 없는 콤마/슬래시 나열
 * 두 패턴이 모두 없으면 빈 배열(추출 실패, 로그로 남김).
 */
function extractBogiTerms(question: string): string[] {
  const labeled = [...question.matchAll(/[ㄱ-ㅎ]\.\s*([^ㄱ-ㅎ]+?)(?=\s*[ㄱ-ㅎ]\.|$)/g)].map((m) =>
    m[1].trim()
  );
  if (labeled.length >= 2) return labeled.filter((t) => t.length > 0);

  const bracketMatch = question.match(/\[보기\]\s*([\s\S]+)/);
  if (!bracketMatch) return [];
  const rest = bracketMatch[1].trim();
  if (rest.length === 0) return [];

  const delimiter = rest.includes('/') ? '/' : rest.includes(',') ? ',' : null;
  if (delimiter) {
    return rest
      .split(delimiter)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  // 콤마/슬래시 없이 2칸 이상 공백으로만 나열한 경우 (예: "제1정규형   제2정규형   BCNF")
  if (/\S\s{2,}\S/.test(rest)) {
    return rest
      .split(/\s{2,}/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  return [];
}

interface Candidate {
  term: string;
  key: string;
  domain: Domain;
  targetFile: string;
  source: 'exam-answer' | 'exam-distractor';
  frequency: number;
  sourceQuestionId: string;
  alreadyInFlashcards: boolean;
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const questions = loadExamQuestions();
  const existingKeys = loadExistingFlashcardKeys();
  console.log(`exam-* 문항: ${questions.length} / 기존 플래시카드 고유 용어: ${existingKeys.size}`);

  const candidates = new Map<string, Candidate>();
  let bogiParsedCount = 0;
  let bogiUnparsedCount = 0;
  const unparsedIds: string[] = [];

  for (const q of questions) {
    const domain = classifyQuestion(q);
    if (domain === 'unclassified') {
      throw new Error(`미분류 문항 발견: ${q.id} — domainMap.ts 오버라이드를 먼저 확정하세요.`);
    }
    const targetFile = DOMAIN_TO_FLASHCARD_FILE[domain];
    if (!targetFile) continue; // code 도메인 등 플래시카드 대상 아님

    // 1) 정답 용어 → exam-answer
    const answerTerms = extractAnswerTerms(q.answer).filter((t) => isTermLike(t.term));
    for (const t of answerTerms) {
      upsertCandidate(candidates, t.term, t.key, domain, targetFile, 'exam-answer', q.id, existingKeys);
    }

    // 2) [보기]/ㄱㄴㄷ 목록 → exam-distractor (정답과 겹치는 항목은 exam-answer로 남겨두고 건너뜀)
    const hasBogi = /\[보기\]/.test(q.question) || /[ㄱ-ㅎ]\.\s*\S/.test(q.question);
    if (!hasBogi) continue;

    const bogiTerms = extractBogiTerms(q.question);
    if (bogiTerms.length === 0) {
      bogiUnparsedCount += 1;
      unparsedIds.push(q.id);
      continue;
    }
    bogiParsedCount += 1;

    const answerKeys = new Set(answerTerms.map((t) => t.key));
    for (const raw of bogiTerms) {
      const key = normalizeKey(raw);
      if (answerKeys.has(key)) continue; // 정답과 동일 항목이면 exam-answer로 이미 처리됨
      if (!isTermLike(raw) && raw.length > 30) continue; // 과도하게 긴 서술형 보기 항목 제외
      upsertCandidate(candidates, raw, key, domain, targetFile, 'exam-distractor', q.id, existingKeys);
    }
  }

  console.log(`\n[보기 블록 파싱] 성공 ${bogiParsedCount}건 / 실패 ${bogiUnparsedCount}건`);
  if (unparsedIds.length > 0) {
    console.log('  파싱 실패 문항(수동 확인 필요):');
    unparsedIds.forEach((id) => console.log(`    - ${id}`));
  }

  const all = [...candidates.values()].sort((a, b) => b.frequency - a.frequency);
  const newOnly = all.filter((c) => !c.alreadyInFlashcards);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'flashcard-candidates.json'),
    JSON.stringify(all, null, 2),
    'utf-8'
  );

  console.log(`\n[추출된 고유 용어] 총 ${all.length}개 (기존 플래시카드와 중복 ${all.length - newOnly.length}개 제외 시 신규 후보 ${newOnly.length}개)`);
  console.log(`  → output/flashcard-candidates.json (전체, alreadyInFlashcards 플래그 포함)`);

  const byFile: Record<string, number> = {};
  for (const c of newOnly) byFile[c.targetFile] = (byFile[c.targetFile] ?? 0) + 1;
  console.log('\n[신규 후보 파일별 분포]');
  for (const [file, count] of Object.entries(byFile)) console.log(`  ${file}: ${count}개`);

  console.log('\n[신규 후보 상위 20개(빈도순)]');
  newOnly.slice(0, 20).forEach((c) =>
    console.log(`  ${c.term} (${c.domain}/${c.source}, ${c.frequency}회) ← ${c.sourceQuestionId}`)
  );
}

function upsertCandidate(
  map: Map<string, Candidate>,
  term: string,
  key: string,
  domain: Domain,
  targetFile: string,
  source: 'exam-answer' | 'exam-distractor',
  questionId: string,
  existingKeys: Set<string>
) {
  const existing = map.get(key);
  if (existing) {
    existing.frequency += 1;
    // exam-answer가 exam-distractor보다 우선 (해당 용어가 정답으로도 쓰인 적 있다는 의미가 더 중요)
    if (source === 'exam-answer') existing.source = 'exam-answer';
    return;
  }
  map.set(key, {
    term,
    key,
    domain,
    targetFile,
    source,
    frequency: 1,
    sourceQuestionId: questionId,
    alreadyInFlashcards: existingKeys.has(key),
  });
}

if (require.main === module) {
  main();
}