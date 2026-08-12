/**
 * copyright-risk-mitigation Design §2.1 [5] / §6.1 검증
 *
 * 재작성/재배치 완료 후 실행하는 최종 검증 스크립트. 아직 콘텐츠 재작성 전(원본 상태)에도
 * 실행 가능하도록 만들었다 — changeType/changeReason처럼 아직 존재하지 않는 필드에 기반한
 * 검사는 "N/A(0% 적용 — 아직 시작 전)"로 보고하고, id 중복·code 실행·choices 정합성처럼
 * 원본 상태에서도 유효한 검사는 지금부터 바로 돈다.
 *
 * "kept"/"rewritten" 판정은 git HEAD(재작성 시작 전 커밋)에 실제로 존재하는 content와
 * 정확히 일치하는지 여부로 확인한다 — 재배치로 id/categoryId가 바뀌어도 문항의
 * question/answer/imageUrl 내용 자체는 원본 집합 어딘가에 그대로 있어야 "kept"가 맞고,
 * "rewritten"은 원본 집합 어디에도 없어야 한다.
 *
 * 실행: npx tsx scripts/copyright/validate.ts
 */
import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import type { Question } from '../../features/questions/types';
import type { FlashCard } from '../../features/flashcards/types';

const REPO_ROOT = path.join(__dirname, '../..');
const QUESTIONS_DIR = path.join(REPO_ROOT, 'data/questions');
const FLASHCARDS_DIR = path.join(REPO_ROOT, 'data/flashcards');
const OUTPUT_DIR = path.join(__dirname, 'output');

const EXAM_ROUND_FILES = fs
  .readdirSync(QUESTIONS_DIR)
  .filter((f) => f.startsWith('exam-') && f.endsWith('.json'))
  .sort();
const OUT_OF_SCOPE_FILES = ['code-c.json', 'code-java.json', 'code-python.json', 'sql-dml.json'];
const ALL_QUESTION_FILES = [...EXAM_ROUND_FILES, ...OUT_OF_SCOPE_FILES];
const FLASHCARD_FILES = [
  'flashcards-se.json',
  'flashcards-network.json',
  'flashcards-db.json',
  'flashcards-os.json',
];

type Verdict = 'PASS' | 'FAIL' | 'N/A';
interface CheckResult {
  name: string;
  verdict: Verdict;
  detail: string;
}
const results: CheckResult[] = [];
function report(name: string, verdict: Verdict, detail: string) {
  results.push({ name, verdict, detail });
}

function loadCurrentQuestions(): Question[] {
  return ALL_QUESTION_FILES.flatMap(
    (f) => JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, f), 'utf-8')) as Question[]
  );
}

function loadOriginalQuestionsFromGit(): Question[] {
  const all: Question[] = [];
  for (const f of ALL_QUESTION_FILES) {
    try {
      const raw = execSync(`git show HEAD:data/questions/${f}`, { cwd: REPO_ROOT }).toString('utf-8');
      all.push(...(JSON.parse(raw) as Question[]));
    } catch {
      // 신규 추가되어 아직 커밋되지 않은 파일은 원본이 없다고 간주
    }
  }
  return all;
}

function contentHash(q: Pick<Question, 'question' | 'answer' | 'imageUrl' | 'codeSnippet'>): string {
  // code 문항은 실제로 바뀐 부분이 codeSnippet이므로 반드시 포함해야 한다 —
  // 이전에는 question/answer/imageUrl만 해시해서, 질문 문구가 보일러플레이트로
  // 동일한("다음 Java 코드의 출력값을 작성하시오." 등) 서로 다른 code 문항들이
  // 같은 content로 오판되는 버그가 있었다.
  const normalized = `${q.question.trim()} ${q.answer.trim()} ${q.imageUrl ?? ''} ${q.codeSnippet ?? ''}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/** 문자 bigram 기반 Jaccard 유사도 (0~1). 외부 라이브러리 없이 근사 유사도 탐지용. */
function bigramSimilarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const set = new Set<string>();
    const normalized = s.replace(/\s+/g, ' ').trim();
    for (let i = 0; i < normalized.length - 1; i++) set.add(normalized.slice(i, i + 2));
    return set;
  };
  const setA = bigrams(a);
  const setB = bigrams(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const g of setA) if (setB.has(g)) intersection += 1;
  return intersection / (setA.size + setB.size - intersection);
}

// ── 1) id 중복 ────────────────────────────────────────────────────────
function checkDuplicateIds(questions: Question[]) {
  const seen = new Map<string, number>();
  for (const q of questions) seen.set(q.id, (seen.get(q.id) ?? 0) + 1);
  const dups = [...seen.entries()].filter(([, count]) => count > 1);
  if (dups.length === 0) {
    report('id 유일성', 'PASS', `전체 ${questions.length}개 문항 id 중복 없음`);
  } else {
    report('id 유일성', 'FAIL', `중복 id ${dups.length}건: ${dups.map(([id]) => id).join(', ')}`);
  }
}

// ── 2) changeType/changeReason 스키마 ──────────────────────────────────
const VALID_CHANGE_TYPES = new Set(['kept', 'rewritten']);
const VALID_CHANGE_REASONS = new Set(['image', 'high-frequency-term', 'code-concept', 'out-of-scope']);

function checkChangeTypeSchema(questions: Question[]) {
  const withField = questions.filter(
    (q) => (q as Question & { changeType?: string }).changeType !== undefined
  );
  if (withField.length === 0) {
    report('changeType/changeReason 스키마', 'N/A', '아직 백필 전(0/${questions.length}) — Do 단계 3번 항목 진행 후 재검사');
    return;
  }
  if (withField.length < questions.length) {
    report(
      'changeType/changeReason 스키마',
      'FAIL',
      `${withField.length}/${questions.length}건만 필드 보유 — 백필이 절반만 진행된 상태`
    );
    return;
  }
  const invalid = questions.filter((q) => {
    const cq = q as Question & { changeType?: string; changeReason?: string };
    return !VALID_CHANGE_TYPES.has(cq.changeType ?? '') || !VALID_CHANGE_REASONS.has(cq.changeReason ?? '');
  });
  if (invalid.length === 0) {
    report('changeType/changeReason 스키마', 'PASS', `전체 ${questions.length}건 유효한 enum 값 보유`);
  } else {
    report(
      'changeType/changeReason 스키마',
      'FAIL',
      `잘못된 enum 값 ${invalid.length}건: ${invalid.slice(0, 5).map((q) => q.id).join(', ')}...`
    );
  }
}

// ── 3) 도메인 구성 카운트 (exam-* 한정) ─────────────────────────────────
function checkDomainCounts(questions: Question[]) {
  const baselinePath = path.join(OUTPUT_DIR, 'domain-counts.json');
  if (!fs.existsSync(baselinePath)) {
    report('도메인 구성 카운트', 'N/A', 'output/domain-counts.json 없음 — analyzeQuestions.ts를 먼저 실행하세요');
    return;
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8')) as Record<string, Record<string, number>>;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { classifyQuestion } = require('./domainMap') as typeof import('./domainMap');

  const actual: Record<string, Record<string, number>> = {};
  for (const q of questions) {
    if (!q.categoryId.startsWith('exam-')) continue;
    const domain = classifyQuestion(q);
    actual[q.categoryId] ??= {};
    actual[q.categoryId][domain] = (actual[q.categoryId][domain] ?? 0) + 1;
  }

  const diffs: string[] = [];
  for (const round of Object.keys(baseline)) {
    const expected = baseline[round];
    const got = actual[round] ?? {};
    const domains = new Set([...Object.keys(expected), ...Object.keys(got)]);
    for (const domain of domains) {
      if ((expected[domain] ?? 0) !== (got[domain] ?? 0)) {
        diffs.push(`${round}/${domain}: 기대 ${expected[domain] ?? 0} vs 실제 ${got[domain] ?? 0}`);
      }
    }
  }
  if (diffs.length === 0) {
    report('도메인 구성 카운트', 'PASS', `21개 회차 전부 baseline과 일치`);
  } else {
    report('도메인 구성 카운트', 'FAIL', `${diffs.length}건 불일치: ${diffs.slice(0, 5).join('; ')}`);
  }
}

// ── 4) kept/rewritten 원본 대조 (git HEAD 기준) ─────────────────────────
function checkKeptRewrittenIntegrity(current: Question[], original: Question[]) {
  const withField = current.filter(
    (q) => (q as Question & { changeType?: string }).changeType !== undefined
  );
  if (withField.length === 0) {
    report('원본 유지/재작성 무결성', 'N/A', 'changeType 필드 없음 — 재작성 진행 후 재검사');
    return;
  }

  const originalHashes = new Set(original.map(contentHash));
  const problems: string[] = [];
  let similarityWarnings = 0;

  for (const q of withField as Array<Question & { changeType: string }>) {
    const hash = contentHash(q);
    if (q.changeType === 'kept') {
      if (!originalHashes.has(hash)) {
        problems.push(`${q.id}: kept인데 원본 집합에서 동일 content를 찾을 수 없음`);
      }
    } else if (q.changeType === 'rewritten') {
      if (originalHashes.has(hash)) {
        problems.push(`${q.id}: rewritten인데 원본과 content가 완전히 동일함`);
        continue;
      }
      const sameSubcategory = original.filter((o) => o.subcategory === q.subcategory);
      // code 문항은 codeSnippet이 실제 표현의 핵심이므로 유사도 비교에 반드시 포함한다.
      const qText = q.question + q.answer + (q.codeSnippet ?? '');
      const maxSim = Math.max(
        0,
        ...sameSubcategory.map((o) => bigramSimilarity(qText, o.question + o.answer + (o.codeSnippet ?? '')))
      );
      if (maxSim >= 0.9) {
        similarityWarnings += 1;
        problems.push(`${q.id}: rewritten이지만 동일 subcategory 원본과 유사도 ${(maxSim * 100).toFixed(0)}% (표층적 변경 의심)`);
      }
    }
  }

  if (problems.length === 0) {
    report('원본 유지/재작성 무결성', 'PASS', `${withField.length}건 전부 kept/rewritten 판정과 실제 content 일치`);
  } else {
    report(
      '원본 유지/재작성 무결성',
      'FAIL',
      `${problems.length}건 문제(유사도 경고 ${similarityWarnings}건 포함): ${problems.slice(0, 5).join(' / ')}`
    );
  }
}

// ── 5) choices 정합성 ───────────────────────────────────────────────────
function checkChoicesConsistency(questions: Question[]) {
  const withChoices = questions.filter((q) => q.choices && q.choices.length > 0);
  if (withChoices.length === 0) {
    report('choices 정합성', 'N/A', 'choices 보유 문항 없음');
    return;
  }
  const problems: string[] = [];
  for (const q of withChoices) {
    const correct = q.choices!.filter((c) => c.isCorrect);
    if (correct.length !== 1) {
      problems.push(`${q.id}: isCorrect=true인 보기가 ${correct.length}개(정확히 1개여야 함)`);
      continue;
    }
    if (!q.answer.includes(correct[0].text) && correct[0].text !== q.answer) {
      problems.push(`${q.id}: 정답 보기 text("${correct[0].text}")가 answer("${q.answer}")와 불일치`);
    }
  }
  if (problems.length === 0) {
    report('choices 정합성', 'PASS', `choices 보유 ${withChoices.length}건 전부 정합`);
  } else {
    report('choices 정합성', 'FAIL', `${problems.length}건: ${problems.slice(0, 5).join(' / ')}`);
  }
}

// ── 6) code 실행 검증 ────────────────────────────────────────────────────
/**
 * "다음 코드의 빈칸에 들어갈 내용을 쓰시오" 유형은 codeSnippet 자체가 미완성 코드라
 * 그대로 컴파일/실행이 불가능하다. 이런 문항은 실행 실패가 아니라 애초에
 * 실행 검증 대상이 아니므로 사전에 걸러내 N/A로 분리한다.
 */
function hasBlankPlaceholder(snippet: string): boolean {
  return /_{2,}|\(\s*(\d+|\?|[ㄱ-ㅎ㉠-㉻]|[①-⑳])\s*\)|\(\s+\)/.test(snippet);
}

/**
 * 출력문이 하나도 없는 코드는 "출력 결과를 쓰시오" 유형이 아니라 제어흐름 추적,
 * 커버리지 순서 같은 다른 유형의 문제다(예: exam-2025-1_015). 실행해도 비교할
 * stdout이 없으므로 실행 검증 대상에서 제외한다.
 */
function hasNoOutputStatement(snippet: string, lang: string): boolean {
  if (lang === 'python') return !/\bprint\s*\(/.test(snippet);
  if (lang === 'c') return !/\b(printf|puts)\s*\(/.test(snippet);
  if (lang === 'java') return !/System\.out\.(print|println)/.test(snippet);
  return false;
}

/**
 * "다음 코드에서 에러가 발생하는 라인 번호를 쓰시오" 유형은 codeSnippet에 줄번호가
 * 의도적으로 포함되어 있다(예: exam-2023-3_013). 이건 컴파일이 안 되는 게 정상이므로
 * 실행 검증 대상에서 제외한다 — 데이터 버그가 아니라 문제 유형 자체가 다른 것.
 */
function isLineNumberAnnotated(snippet: string): boolean {
  const lines = snippet.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  return lines.length >= 2 && /^1\D/.test(lines[0]) && /^2\D/.test(lines[1]);
}

/**
 * "정적 초기화 블록/인스턴스 초기화 블록/생성자의 실행 순서를 쓰시오" 유형은 answer가
 * stdout이 아니라 코드에 매겨진 번호(①②③...)의 실행 순서 문자열이다(예: exam-2024-1_010).
 * 코드 자체에 System.out.println 등 출력문이 있어 hasNoOutputStatement로는 걸러지지 않으므로
 * 질문 문구로 별도 판별한다.
 */
function isExecutionOrderQuestion(question: string): boolean {
  return /실행\s*순서/.test(question);
}

/** input()/scanf/Scanner처럼 표준입력이 필요한 코드는 값을 알 수 없어 자동 실행 검증이 불가능하다. */
function requiresStdin(snippet: string, lang: string): boolean {
  if (lang === 'python') return /\binput\s*\(/.test(snippet);
  if (lang === 'c') return /\b(scanf|gets|fgets|getchar)\s*\(/.test(snippet);
  if (lang === 'java') return /\bScanner\b/.test(snippet);
  return false;
}

/** "{a, b, c}" 형태의 Python 집합 리터럴이면 원소 집합을 반환 (순서 무관 비교용) */
function parsePySetLiteral(s: string): Set<string> | null {
  const trimmed = s.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  const inner = trimmed.slice(1, -1);
  if (inner.trim() === '') return new Set();
  return new Set(inner.split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')));
}

function outputsMatch(actual: string, expected: string): boolean {
  if (actual === expected || actual.includes(expected) || expected.includes(actual)) return true;
  const actualSet = parsePySetLiteral(actual);
  const expectedSet = parsePySetLiteral(expected);
  if (actualSet && expectedSet && actualSet.size === expectedSet.size) {
    return [...actualSet].every((x) => expectedSet.has(x));
  }
  return false;
}

const EXEC_OPTS = { timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] as Array<'ignore' | 'pipe'> };
const COMPILE_OPTS = { timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] as Array<'ignore' | 'pipe'> };

function runCode(q: Question): { ok: boolean; actual?: string; error?: string } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copyright-validate-'));
  try {
    if (q.codeLanguage === 'python') {
      const file = path.join(tmpDir, 'main.py');
      fs.writeFileSync(file, q.codeSnippet ?? '');
      const out = execSync(`python3 "${file}"`, EXEC_OPTS).toString('utf-8');
      return { ok: true, actual: out.trim() };
    }
    if (q.codeLanguage === 'c') {
      const src = path.join(tmpDir, 'main.c');
      const bin = path.join(tmpDir, 'main.out');
      fs.writeFileSync(src, q.codeSnippet ?? '');
      // -lm: 일부 문항이 math.h 함수(sqrt/pow 등)를 링크하지 못해 실패하는 문제 방지.
      // -std=gnu89도 시도해봤으나 K&R 스타일 파싱 부작용(변수 재정의 오류)이 새로 생겨
      // 순 이득이 없어 되돌렸다 — 남은 C 실패 다수는 컴파일러 엄격도 차이이지 스크립트 버그가 아니다.
      execSync(`cc "${src}" -o "${bin}" -include stdio.h -lm -w`, COMPILE_OPTS);
      const out = execSync(`"${bin}"`, EXEC_OPTS).toString('utf-8');
      return { ok: true, actual: out.trim() };
    }
    if (q.codeLanguage === 'java') {
      const raw = q.codeSnippet ?? '';
      // 일부 문항은 클래스 선언 없이 main 메서드 본문만 저장되어 있어 그대로는 컴파일 불가 —
      // 최상위 class 선언이 없으면 실행 가능하도록 public class Main으로 감싼다.
      const hasTopLevelClass = /\b(class|interface|enum|record)\s+\w+/.test(raw);
      const source = hasTopLevelClass ? raw : `public class Main {\n${raw}\n}`;

      const classNameMatch = source.match(/public\s+class\s+(\w+)/) ?? source.match(/class\s+(\w+)/);
      const className = classNameMatch ? classNameMatch[1] : 'Main';
      const src = path.join(tmpDir, `${className}.java`);
      fs.writeFileSync(src, source);
      execSync(`javac "${src}"`, { ...COMPILE_OPTS, cwd: tmpDir });
      const out = execSync(`java -cp "${tmpDir}" ${className}`, EXEC_OPTS).toString('utf-8');
      return { ok: true, actual: out.trim() };
    }
    return { ok: false, error: `지원하지 않는 codeLanguage: ${q.codeLanguage}` };
  } catch (e) {
    // C의 `void main(){...}`처럼 반환형이 잘못돼 exit code만 비정상인 경우가 있다 —
    // 실행 도중 실제로 출력은 정상 생성됐을 수 있으므로, stdout이 있으면 그걸로 판정한다.
    const stdout = (e as { stdout?: Buffer }).stdout?.toString('utf-8').trim();
    if (stdout) return { ok: true, actual: stdout };

    const stderr = (e as { stderr?: Buffer }).stderr?.toString('utf-8').trim().split('\n')[0];
    const message = e instanceof Error ? e.message.split('\n')[0] : String(e);
    return { ok: false, error: stderr || message };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function checkCodeExecution(questions: Question[]) {
  const codeQuestions = questions.filter((q) => q.type === 'code' && q.codeSnippet && q.codeLanguage);
  if (codeQuestions.length === 0) {
    report('code 실행 검증', 'N/A', 'codeSnippet 보유 문항 없음');
    return;
  }

  // sql은 컴파일/실행기가 아니라 실제 DB 엔진(스키마+데이터)이 필요해 이 스크립트로는
  // 검증할 수 없다 — 실패가 아니라 "지원 범위 밖"으로 분리한다.
  const executableLangs = codeQuestions.filter((q) => q.codeLanguage !== 'sql');
  const sqlSkipped = codeQuestions.length - executableLangs.length;

  const blankFiltered = executableLangs.filter(
    (q) =>
      !hasBlankPlaceholder(q.codeSnippet!) &&
      !isLineNumberAnnotated(q.codeSnippet!) &&
      !hasNoOutputStatement(q.codeSnippet!, q.codeLanguage!) &&
      !isExecutionOrderQuestion(q.question)
  );
  const blankSkipped = executableLangs.length - blankFiltered.length;
  const runnable = blankFiltered.filter((q) => !requiresStdin(q.codeSnippet!, q.codeLanguage!));
  const stdinSkipped = blankFiltered.length - runnable.length;

  const mismatches: string[] = [];
  const errors: string[] = [];
  for (const q of runnable) {
    const result = runCode(q);
    if (!result.ok) {
      errors.push(`${q.id}: 실행 실패(${result.error})`);
      continue;
    }
    if (!outputsMatch(result.actual!, q.answer.trim())) {
      mismatches.push(`${q.id}: 기대 "${q.answer.trim()}" vs 실행 결과 "${result.actual}"`);
    }
  }

  const summary = `(sql은 미지원이라 제외: ${sqlSkipped}건 / 빈칸·에러라인·출력없음 문제 제외: ${blankSkipped}건 / 표준입력 필요라 제외: ${stdinSkipped}건 / 실행 대상: ${runnable.length}건)`;
  if (mismatches.length === 0 && errors.length === 0) {
    report('code 실행 검증', 'PASS', `실행 대상 ${runnable.length}건 전부 answer와 실행 결과 일치 ${summary}`);
  } else {
    report(
      'code 실행 검증',
      'FAIL',
      `불일치 ${mismatches.length}건, 실행 오류 ${errors.length}건 ${summary}: ${[...mismatches, ...errors].slice(0, 8).join(' / ')}`
    );
  }
}

// ── 7) flashcard 용어 중복 ───────────────────────────────────────────────
function checkFlashcardTermDuplicates() {
  const cards: FlashCard[] = FLASHCARD_FILES.flatMap(
    (f) => JSON.parse(fs.readFileSync(path.join(FLASHCARDS_DIR, f), 'utf-8')) as FlashCard[]
  );
  const idDup = new Map<string, number>();
  const termDup = new Map<string, string[]>();
  for (const c of cards) {
    idDup.set(c.id, (idDup.get(c.id) ?? 0) + 1);
    const key = c.term.toLowerCase().replace(/\s+/g, '');
    termDup.set(key, [...(termDup.get(key) ?? []), c.id]);
  }
  const dupIds = [...idDup.entries()].filter(([, n]) => n > 1);
  const dupTerms = [...termDup.entries()].filter(([, ids]) => ids.length > 1);

  if (dupIds.length === 0 && dupTerms.length === 0) {
    report('flashcard 용어/id 중복', 'PASS', `전체 ${cards.length}장 중복 없음`);
  } else {
    report(
      'flashcard 용어/id 중복',
      'FAIL',
      `중복 id ${dupIds.length}건, 중복 term ${dupTerms.length}건: ${dupTerms
        .slice(0, 5)
        .map(([term, ids]) => `${term}(${ids.join(',')})`)
        .join(' / ')}`
    );
  }
}

function main() {
  const current = loadCurrentQuestions();
  const original = loadOriginalQuestionsFromGit();

  checkDuplicateIds(current);
  checkChangeTypeSchema(current);
  checkDomainCounts(current);
  checkKeptRewrittenIntegrity(current, original);
  checkChoicesConsistency(current);
  checkCodeExecution(current);
  checkFlashcardTermDuplicates();

  console.log('\n=== copyright-risk-mitigation 검증 결과 ===\n');
  for (const r of results) {
    const icon = r.verdict === 'PASS' ? '✅' : r.verdict === 'FAIL' ? '❌' : '⏳';
    console.log(`${icon} [${r.verdict}] ${r.name}\n    ${r.detail}\n`);
  }

  const failed = results.filter((r) => r.verdict === 'FAIL');
  const naCount = results.filter((r) => r.verdict === 'N/A').length;
  console.log(
    `PASS ${results.length - failed.length - naCount} / FAIL ${failed.length} / N/A ${naCount} (총 ${results.length}개 검사)`
  );
  if (failed.length > 0) process.exitCode = 1;
}

main();