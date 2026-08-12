/**
 * copyright-risk-mitigation Design §4.4 [4] 재배치
 *
 * exam-*.json 420문항을 회차 간에 재배치하되, 각 회차의 도메인별 문항 수는
 * analyzeQuestions.ts가 산출한 output/domain-counts.json과 완전히 동일하게 유지한다.
 * 원본 id는 보존하지 않는다(§4.5 — 사용자 진행 데이터는 버전 bump로 초기화하는 방침이라
 * id 매핑 테이블이 필요 없음).
 *
 * ⚠️ 중요: 이 스크립트는 결과를 data/questions/*.json에 바로 덮어쓰지 않고
 * output/reallocated/exam-*.json(스테이징)에만 쓴다. Design §2.1 파이프라인 순서상
 * 재배치([4])는 code/theory/sql 콘텐츠 재작성([3])이 끝난 뒤에 실행해야 의미가 있다 —
 * 아직 원문 그대로인 상태에서 이 스크립트로 회차만 섞으면 저작권 리스크는 그대로인 채
 * 문항 순서만 바뀌므로, 실제 data/questions/ 반영은 재작성 완료 후 별도로 승인받아 진행한다.
 *
 * 실행: npx tsx scripts/copyright/reallocate.ts
 */
import fs from 'fs';
import path from 'path';

import type { Question } from '../../features/questions/types';
import { classifyQuestion, type Domain } from './domainMap';

const QUESTIONS_DIR = path.join(__dirname, '../../data/questions');
const OUTPUT_DIR = path.join(__dirname, 'output');
const STAGING_DIR = path.join(OUTPUT_DIR, 'reallocated');

type DomainCounts = Record<string, Record<string, number>>;

function loadExamQuestions(): Map<string, Question[]> {
  const files = fs
    .readdirSync(QUESTIONS_DIR)
    .filter((f) => f.startsWith('exam-') && f.endsWith('.json'))
    .sort();

  const byRound = new Map<string, Question[]>();
  for (const file of files) {
    const round = file.replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf-8')) as Question[];
    byRound.set(round, data);
  }
  return byRound;
}

function loadDomainCounts(): DomainCounts {
  const filePath = path.join(OUTPUT_DIR, 'domain-counts.json');
  if (!fs.existsSync(filePath)) {
    throw new Error('output/domain-counts.json이 없습니다. 먼저 analyzeQuestions.ts를 실행하세요.');
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as DomainCounts;
}

/** Fisher-Yates 셔플 */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface TaggedQuestion {
  question: Question;
  domain: Domain;
  originalRound: string;
}

/**
 * 도메인 풀에서 지정한 회차(targetRound)의 수요만큼 문항을 꺼낸다.
 * 같은 회차 출신 문항이 재배치 후에도 같은 회차로 되돌아가지 않도록,
 * 가능하면 originalRound !== targetRound인 문항을 우선 선택한다.
 */
function drawFromPool(pool: TaggedQuestion[], count: number, targetRound: string): TaggedQuestion[] {
  const drawn: TaggedQuestion[] = [];
  for (let i = 0; i < count; i++) {
    let pickIndex = pool.findIndex((tq) => tq.originalRound !== targetRound);
    if (pickIndex === -1) pickIndex = 0; // 대안이 없으면 어쩔 수 없이 같은 회차 출신도 허용
    if (pickIndex >= pool.length) break;
    drawn.push(pool.splice(pickIndex, 1)[0]);
  }
  return drawn;
}

function main() {
  fs.mkdirSync(STAGING_DIR, { recursive: true });

  const domainCounts = loadDomainCounts();
  const questionsByRound = loadExamQuestions();

  // 1) 전체 420문항을 도메인별 풀로 태깅
  const pools: Record<Domain, TaggedQuestion[]> = {
    code: [],
    sql: [],
    'network-security': [],
    db: [],
    os: [],
    se: [],
  };

  for (const [round, questions] of questionsByRound) {
    for (const q of questions) {
      const domain = classifyQuestion(q);
      if (domain === 'unclassified') {
        throw new Error(`미분류 문항 발견: ${q.id} — domainMap.ts 오버라이드를 먼저 확정하세요.`);
      }
      pools[domain].push({ question: q, domain, originalRound: round });
    }
  }
  for (const domain of Object.keys(pools) as Domain[]) {
    pools[domain] = shuffle(pools[domain]);
  }

  // 2) 회차별로 domain-counts.json 수요만큼 배정
  //    주의: 배정 시점에 계산한 domain을 그대로 들고 간다. id를 새로 부여한 뒤
  //    classifyQuestion()을 다시 호출하면 domainMap.ts의 QUESTION_ID_OVERRIDES가
  //    "새 id"에는 매치되지 않아 원래 수동 검토했던 16건이 다시 미분류로 빠지는
  //    버그가 있었다 — 재분류하지 않고 배정 당시의 domain을 그대로 신뢰한다.
  const rounds = [...questionsByRound.keys()].sort();
  const result: Record<string, Array<{ question: Question; domain: Domain }>> = {};
  let sameRoundCollisions = 0;
  // newId -> {oldId, oldRound} 매핑. 재배치 후 도메인 override 표를 새 id 기준으로
  // 다시 만들거나, "이 문항이 원래 어디 있었는지" 추적할 때 쓴다(과거엔 이 기록이
  // 없어서 재배치 후 원본을 찾을 수 없는 문제가 있었다).
  const idMap: Record<string, { oldId: string; oldRound: string }> = {};

  for (const round of rounds) {
    const demand = domainCounts[round];
    if (!demand) throw new Error(`domain-counts.json에 ${round} 회차 데이터가 없습니다.`);

    const assigned: Array<{ question: Question; domain: Domain }> = [];
    let seq = 1;
    for (const [domain, count] of Object.entries(demand)) {
      const drawn = drawFromPool(pools[domain as Domain], count, round);
      if (drawn.length < count) {
        throw new Error(
          `도메인 풀 부족: ${round}의 ${domain} 수요 ${count}건 중 ${drawn.length}건만 배정 가능`
        );
      }
      for (const tq of drawn) {
        if (tq.originalRound === round) sameRoundCollisions += 1;
        const newId = `${round}_${String(seq).padStart(3, '0')}`;
        idMap[newId] = { oldId: tq.question.id, oldRound: tq.originalRound };
        assigned.push({
          domain: tq.domain,
          question: {
            ...tq.question,
            id: newId,
            categoryId: round as Question['categoryId'],
          },
        });
        seq += 1;
      }
    }
    result[round] = assigned;
  }

  // 3) 검증: 회차별 도메인 구성 수가 domain-counts.json과 완전히 동일한지
  const diffs: string[] = [];
  for (const round of rounds) {
    const actual: Record<string, number> = {};
    for (const { domain } of result[round]) {
      actual[domain] = (actual[domain] ?? 0) + 1;
    }
    const expected = domainCounts[round];
    const allDomains = new Set([...Object.keys(actual), ...Object.keys(expected)]);
    for (const domain of allDomains) {
      if ((actual[domain] ?? 0) !== (expected[domain] ?? 0)) {
        diffs.push(
          `${round}/${domain}: 기대 ${expected[domain] ?? 0} vs 실제 ${actual[domain] ?? 0}`
        );
      }
    }
  }

  const totalAssigned = Object.values(result).reduce((sum, entries) => sum + entries.length, 0);
  const allIds = Object.values(result).flatMap((entries) => entries.map((e) => e.question.id));
  const duplicateIds = allIds.filter((id, i) => allIds.indexOf(id) !== i);

  console.log(`총 배정 문항: ${totalAssigned} / 원본: 420`);
  console.log(`같은 회차로 되돌아간 문항(회피 실패): ${sameRoundCollisions}건`);
  console.log(`중복 id: ${duplicateIds.length}건`);
  console.log(`도메인 구성 diff: ${diffs.length}건`);
  diffs.forEach((d) => console.log(`  - ${d}`));

  if (diffs.length > 0 || duplicateIds.length > 0 || totalAssigned !== 420) {
    console.error('\n검증 실패 — output/reallocated/ 에 쓰지 않고 종료합니다.');
    process.exitCode = 1;
    return;
  }

  for (const round of rounds) {
    fs.writeFileSync(
      path.join(STAGING_DIR, `${round}.json`),
      JSON.stringify(result[round].map((e) => e.question), null, 2),
      'utf-8'
    );
  }
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'reallocation-map.json'),
    JSON.stringify(idMap, null, 2),
    'utf-8'
  );

  console.log(`\n검증 통과 → output/reallocated/*.json (${rounds.length}개 파일) 스테이징 완료`);
  console.log('output/reallocation-map.json에 새 id → 원본 id/회차 매핑 기록 완료');
  console.log('※ data/questions/ 원본은 변경되지 않았습니다. 콘텐츠 재작성([3]) 완료 후 반영 여부를 별도로 결정하세요.');
}

if (require.main === module) {
  main();
}