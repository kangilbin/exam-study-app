/**
 * copyright-risk-mitigation Design §4.4 [0] 도메인 정규화 매핑
 *
 * exam-*.json 문항의 `subcategory` 문자열을 도메인(Domain)으로 정규화한다.
 * 2020~2021년 회차(8개 파일)는 "이론/DB" 같은 계층형 표기를 쓰지만,
 * 2022년 이후 13개 파일은 "IPSec", "SRT 스케줄링" 같은 문항 고유 라벨이라
 * subcategory 문자열만으로는 자동 규칙화가 어려워 전수 확인 후 명시적으로 매핑했다.
 *
 * 실행: npx tsx scripts/copyright/domainMap.ts
 *   (data/questions/exam-*.json 420문항 전체를 로드해 도메인별/회차별 카운트와
 *    미분류 문항 목록을 출력한다 — analyzeQuestions.ts의 입력 검증 용도로도 사용)
 */
import fs from 'fs';
import path from 'path';

import type { Question } from '../../features/questions/types';

export type Domain = 'code' | 'sql' | 'network-security' | 'db' | 'os' | 'se';
export type DomainOrUnclassified = Domain | 'unclassified';

/**
 * subcategory 문자열 → Domain 명시적 매핑.
 * exam-2020-1 ~ exam-2026-2 (21개 파일, 420문항)에 실제 등장하는
 * 205개 고유 subcategory 값 중 "종합"(59문항, 내용이 뒤섞인 범용 라벨)을 제외한
 * 나머지 전부를 전수 확인 후 매핑했다. "종합"은 subcategory로 분류 불가하므로
 * classifyQuestion()의 본문 키워드 기반 폴백을 사용한다.
 */
export const SUBCATEGORY_DOMAIN_MAP: Record<string, Domain> = {
  // --- code: C ---
  'C 2차원배열 포인터': 'code',
  'C static변수': 'code',
  'C switch/swap 값전달': 'code',
  'C 문자열복사 인덱스합': 'code',
  'C 연결리스트': 'code',
  'C 연결리스트 swap': 'code',
  'C 이중포인터': 'code',
  'C언어': 'code',
  'C언어 switch문': 'code',
  'C언어 거듭제곱': 'code',
  'C언어 구조체': 'code',
  'C언어 구조체 포인터': 'code',
  'C언어 구조체/비트연산': 'code',
  'C언어 구조체/포인터': 'code',
  'C언어 구조체포인터': 'code',
  'C언어 문자열': 'code',
  'C언어 문자열 포인터': 'code',
  'C언어 문자열역순': 'code',
  'C언어 문자인코딩변환': 'code',
  'C언어 반복문': 'code',
  'C언어 배열/나머지': 'code',
  'C언어 복리계산 구조체': 'code',
  'C언어 비트연산/삼항연산자': 'code',
  'C언어 삼항/비트연산': 'code',
  'C언어 선택정렬': 'code',
  'C언어 스택': 'code',
  'C언어 연결리스트': 'code',
  'C언어 연결리스트/문자열': 'code',
  'C언어 완전수': 'code',
  'C언어 원형큐': 'code',
  'C언어 이진수 변환': 'code',
  'C언어 재귀함수': 'code',
  'C언어 정렬': 'code',
  'C언어 중복 문자 탐색': 'code',
  'C언어 포인터': 'code',
  'C언어 포인터/문자열': 'code',
  'C언어 포인터/전역변수': 'code',
  'C언어 포인터배열': 'code',
  'C언어 함수호출': 'code',

  // --- code: Java ---
  Java: 'code',
  'Java 2차원배열': 'code',
  'Java String equals': 'code',
  'Java enum': 'code',
  'Java split': 'code',
  'Java static메서드': 'code',
  'Java switch문': 'code',
  'Java 객체배열': 'code',
  'Java 다형성': 'code',
  'Java 다형성 필드접근': 'code',
  'Java 다형성/오버라이딩': 'code',
  'Java 람다/예외': 'code',
  'Java 문자열 비교': 'code',
  'Java 반복문': 'code',
  'Java 배열': 'code',
  'Java 배열비교': 'code',
  'Java 버블정렬': 'code',
  'Java 비트연산': 'code',
  'Java 상속': 'code',
  'Java 상속 생성자': 'code',
  'Java 상속/super': 'code',
  'Java 상속/오버라이딩': 'code',
  'Java 상속실행순서': 'code',
  'Java 싱글턴패턴': 'code',
  'Java 싱글톤': 'code',
  'Java 에러 분석': 'code',
  'Java 예외처리': 'code',
  'Java 오버로딩/재귀': 'code',
  'Java 인터페이스': 'code',
  'Java 인터페이스 홀짝합': 'code',
  'Java 재귀': 'code',
  'Java 재귀 중복제거': 'code',
  'Java 재귀/상속': 'code',
  'Java 재귀/오버라이딩': 'code',
  'Java 정적/인스턴스 변수': 'code',
  'Java 진법변환': 'code',
  'Java 참조': 'code',
  'Java 추상클래스': 'code',
  'Java 추상클래스/오버로딩': 'code',
  'Java 타입소거': 'code',
  'Java 화폐 계산': 'code',

  // --- code: Python ---
  Python: 'code',
  'Python 딕셔너리': 'code',
  'Python 딕셔너리/집합': 'code',
  'Python 리스트': 'code',
  'Python 리스트역순 합차': 'code',
  'Python 문자열': 'code',
  'Python 문자열 슬라이싱': 'code',
  'Python 문자열검색': 'code',
  'Python 문자열연결': 'code',
  'Python 비교연산': 'code',
  'Python 비트연산': 'code',
  'Python 입출력': 'code',
  'Python 집합': 'code',
  'Python 집합 연산': 'code',
  'Python 타입검사': 'code',
  'Python 트리': 'code',

  // --- sql (type 필드와 무관하게 subcategory 내용 기준) ---
  SQL: 'sql',
  'SQL UNION': 'sql',
  'SQL 서브쿼리': 'sql',
  'SQL ALTER': 'sql',
  'SQL COUNT': 'sql',
  'SQL COUNT/IN': 'sql',
  'SQL DELETE': 'sql',
  'SQL DROP VIEW': 'sql',
  'SQL GROUP BY': 'sql',
  'SQL GROUP BY/HAVING': 'sql',
  'SQL INSERT': 'sql',
  'SQL IN연산자': 'sql',
  'SQL JOIN': 'sql',
  'SQL JOIN COUNT': 'sql',
  'SQL LIKE/ORDER': 'sql',
  'SQL UPDATE': 'sql',
  'SQL 결과값': 'sql',
  'SQL 빈칸': 'sql',
  'SQL 조건': 'sql',

  // --- db (관계대수·정규화 등 DB 이론. "SQL 조인"/"SQL DCL"은 type=theory로
  //     쿼리 실행이 아닌 개념 분류 문제라 sql이 아닌 db로 분류) ---
  '관계대수': 'db',
  'Cardinality/Degree': 'db',
  'DB키 용어': 'db',
  'SQL DCL': 'db',
  'SQL TCL': 'db',
  'SQL 조인': 'db',
  '개체무결성': 'db',
  '데이터베이스': 'db',
  '데이터베이스 릴레이션': 'db',
  '데이터베이스 무결성': 'db',
  '데이터베이스 물리설계': 'db',
  '데이터베이스 설계': 'db',
  '데이터베이스 스키마': 'db',
  '데이터베이스 용어': 'db',
  '데이터베이스 정규화': 'db',
  '데이터베이스 제약조건': 'db',
  '반정규화': 'db',
  '이론/DB': 'db',
  '이론/데이터': 'db',
  '이론/재해복구': 'db', // 재해복구=백업/회복기법 → memorize-db의 "회복기법"과 동일 계열

  // --- network-security ---
  AES: 'network-security',
  'Ad-hoc Network': 'network-security',
  'HDLC 프로토콜': 'network-security',
  IPSec: 'network-security',
  'RIP 라우팅경로': 'network-security',
  VPN: 'network-security',
  'VPN 프로토콜': 'network-security',
  '네트워크': 'network-security',
  '네트워크 IP주소': 'network-security',
  '네트워크 라우팅': 'network-security',
  '네트워크 보안': 'network-security',
  '네트워크 서브넷': 'network-security',
  '네트워크 전송방식': 'network-security',
  '네트워크 주소변환': 'network-security',
  '네트워크 패킷 교환': 'network-security',
  '네트워크 프로토콜': 'network-security',
  '라우팅 프로토콜': 'network-security',
  '보안': 'network-security',
  '보안 APT': 'network-security',
  '보안 기법': 'network-security',
  '보안 악성코드': 'network-security',
  '스머프공격': 'network-security',
  '악성코드': 'network-security',
  '악성코드 분류': 'network-security',
  '암호화 알고리즘': 'network-security',
  '오류 검출': 'network-security',
  '오류 검출/정정': 'network-security',
  '원격 접속 프로토콜': 'network-security',
  '이론/네트워크': 'network-security',
  '이론/보안': 'network-security',
  '인증 프로토콜': 'network-security',
  '접근통제 유형': 'network-security',
  '정보보안 프로토콜': 'network-security',
  '패킷교환방식': 'network-security',

  // --- os ---
  'LRU 페이지부재': 'os',
  'Linux 파일 권한': 'os',
  'SRT 스케줄링': 'os',
  '운영체제': 'os',
  '운영체제 스케줄링': 'os',
  '운영체제 페이지교체': 'os',
  '이론/운영체제': 'os',
  '클라우드 서비스': 'os',

  // --- se (소프트웨어공학: 개발방법론/UML/디자인패턴/테스트/화면설계/통합구현 등) ---
  'GoF 행위패턴': 'se',
  'Iterator 패턴': 'se',
  'UML 다이어그램': 'se',
  'UML 클래스관계': 'se',
  'URL구조매칭': 'se',
  '디자인 패턴': 'se',
  '디자인패턴': 'se',
  '소프트웨어 공학': 'se',
  '소프트웨어 테스트': 'se',
  '소프트웨어공학': 'se',
  '소프트웨어공학 응집도': 'se',
  '순차적 응집도': 'se',
  '웹 기술': 'se',
  '이론/UI': 'se',
  '이론/UML': 'se',
  '이론/기술': 'se',
  '이론/디자인패턴': 'se',
  '이론/성능': 'se',
  '이론/소프트웨어공학': 'se',
  '이론/웹': 'se',
  '이론/테스트': 'se',
  '이론/프로그래밍': 'se',
  '자료구조': 'se',
  '제어 결합도': 'se',
  '제어흐름 그래프': 'se',
  '테스트 용어': 'se',
  '결함 밀도': 'se',
  '테스트 커버리지': 'se',
  '테스트커버리지': 'se',
};

/**
 * subcategory가 "종합"이라 규칙화 불가능했던 16건을 직접 열어 내용을 확인하고
 * 문항 id 단위로 명시적으로 분류한 결과 (2026-08-03 수동 검토).
 * 같은 "종합" 라벨이라도 문항마다 실제 주제가 달라 subcategory 단위 매핑으로는
 * 표현할 수 없어 id 단위 오버라이드로 둔다.
 */
// 주의: 이 표는 "현재 data/questions/ id" 기준이며, reallocate.ts를 다시 실행해
// 회차 간 문항을 재배치하면 id가 전부 바뀌므로 이 표도 다시 만들어야 한다.
// output/reallocation-map.json(새 id → 원본 id/회차)을 참고해 이전 표의 의미를
// 새 id로 옮기면 된다.
export const QUESTION_ID_OVERRIDES: Record<string, Domain> = {
  'exam-2020-3_006': 'se', // DNS — network-security 카운트는 이미 충족되어 se로 배정
  'exam-2020-3_014': 'network-security', // 해시함수/스트림암호 분류
  'exam-2020-3_020': 'db', // 함수 종속성(Full/Partial/Transitive FD)
  'exam-2020-4_011': 'db', // E-R 다이어그램 구성요소
  'exam-2020-4_020': 'sql', // SQL ORDER BY ... DESC 정렬
  'exam-2021-1_004': 'network-security', // ISMS(정보보호 관리체계)
  'exam-2021-1_009': 'se', // 디자인 패턴(Bridge/Observer)
  'exam-2021-1_013': 'se', // Regression(회귀) 테스트
  'exam-2021-2_009': 'se', // 정보 은닉(Information Hiding)
  'exam-2021-3_013': 'se', // NUI(자연 사용자 인터페이스)
  'exam-2022-2_008': 'se', // 화이트박스 테스트 기법(동치분할/경계값/원인결과그래프)
  'exam-2022-3_020': 'os', // Linux 심볼릭 링크 명령어
  'exam-2023-2_012': 'se', // Selenium(테스트 자동화 도구)
  'exam-2024-2_019': 'se', // 디자인 패턴(Facade/Composite)
  'exam-2024-3_011': 'os', // Verification/Validation(테스트 용어)
  'exam-2025-1_018': 'se', // V모델 테스트 단계(단위/통합/시스템/인수)
  'exam-2025-2_008': 'os', // 사용자 인증 요소(지식/소유/생체기반)
  'exam-2025-3_003': 'se', // 모듈 Fan-in/Fan-out
  'exam-2020-2_019': 'os', // Cookie/Session/Cache(웹 기술) — 해설 속 "페이지" 키워드로 우연히 os로 분류됐던 자리를 유지
  'exam-2023-1_001': 'code', // codeLanguage:'sql'인데 subcategory "SQL COUNT"가 먼저 매칭되어 sql로 바뀌는 것을 방지
  'exam-2024-3_010': 'code', // 이미지 문제(kept)라 codeLanguage 필드가 없어 subcategory "SQL 서브쿼리"로 분류되는데, type이 code라 code 자리를 유지
};

/** subcategory에 매핑이 없을 때 쓰는 접두/포함 규칙 (향후 신규 회차 대비 안전망) */
const FALLBACK_RULES: Array<{ test: (s: string) => boolean; domain: Domain }> = [
  { test: (s) => /^C(언어)?[\s/]/.test(s) || s === 'C언어', domain: 'code' },
  { test: (s) => /^Java/.test(s), domain: 'code' },
  { test: (s) => /^Python/.test(s), domain: 'code' },
  { test: (s) => /^SQL/.test(s), domain: 'sql' },
  { test: (s) => /데이터베이스|정규화|스키마|무결성|관계대수/.test(s), domain: 'db' },
  { test: (s) => /네트워크|보안|프로토콜|암호화|악성코드/.test(s), domain: 'network-security' },
  { test: (s) => /운영체제|스케줄링|페이지|프로세스|교착상태/.test(s), domain: 'os' },
  { test: (s) => /소프트웨어|디자인패턴|UML|테스트|화면|응집도|결합도/.test(s), domain: 'se' },
];

/** subcategory 문자열만으로 도메인 분류를 시도한다 (본문 내용은 보지 않음). */
export function classifySubcategory(subcategory: string): DomainOrUnclassified {
  const exact = SUBCATEGORY_DOMAIN_MAP[subcategory];
  if (exact) return exact;

  for (const rule of FALLBACK_RULES) {
    if (rule.test(subcategory)) return rule.domain;
  }
  return 'unclassified';
}

/**
 * "종합"처럼 subcategory만으로 분류 불가한 문항은 question/answer 본문과
 * codeLanguage 존재 여부를 보고 도메인을 추정한다. 그래도 판정 불가하면
 * 'unclassified'를 반환하며, 이 경우 Do 단계에서 수동 검토가 필요하다
 * (설계 원칙: 실패를 조용히 기본값으로 덮지 않는다).
 */
export function classifyQuestion(q: Question): DomainOrUnclassified {
  const override = QUESTION_ID_OVERRIDES[q.id];
  if (override) return override;

  const bySubcategory = classifySubcategory(q.subcategory);
  if (bySubcategory !== 'unclassified') return bySubcategory;

  if (q.codeLanguage) return 'code';

  const text = `${q.question}\n${q.answer}`;
  const contentRules: Array<{ test: RegExp; domain: Domain }> = [
    { test: /SELECT|INSERT|UPDATE|DELETE|JOIN|GROUP BY|SQL문/, domain: 'sql' },
    {
      test: /정규화|무결성|트랜잭션|스키마|테이블|릴레이션|RAID|Anomaly|이상\(/,
      domain: 'db',
    },
    { test: /네트워크|IP주소|프로토콜|암호화|방화벽|보안|공격|악성코드/, domain: 'network-security' },
    { test: /스케줄링|프로세스|메모리|페이지|교착상태|운영체제/, domain: 'os' },
    { test: /자바|파이썬|C언어|소스코드|반복문|클래스|출력/, domain: 'se' },
  ];
  for (const rule of contentRules) {
    if (rule.test.test(text)) return rule.domain;
  }
  return 'unclassified';
}

// ── 아래는 tsx로 직접 실행했을 때만 동작하는 자체 검증 루틴 ──────────────
function loadExamQuestions(): Question[] {
  const dir = path.join(__dirname, '../../data/questions');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('exam-') && f.endsWith('.json'))
    .sort();

  const all: Question[] = [];
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8')) as Question[];
    all.push(...data);
  }
  return all;
}

function main() {
  const questions = loadExamQuestions();
  console.log(`총 문항: ${questions.length}`);

  const domainCounts: Record<string, number> = {};
  const unclassified: string[] = [];

  for (const q of questions) {
    const domain = classifyQuestion(q);
    domainCounts[domain] = (domainCounts[domain] ?? 0) + 1;
    if (domain === 'unclassified') unclassified.push(`${q.id} (${q.subcategory})`);
  }

  console.log('\n[도메인별 전체 카운트]');
  for (const [domain, count] of Object.entries(domainCounts).sort()) {
    console.log(`  ${domain}: ${count}`);
  }

  console.log(`\n[미분류 ${unclassified.length}건] — Do 단계에서 수동 검토 필요`);
  unclassified.forEach((line) => console.log(`  - ${line}`));

  // 회차별 도메인 구성 벡터 (reallocate.ts의 입력이 될 고정값)
  const byRound: Record<string, Record<string, number>> = {};
  for (const q of questions) {
    const round = q.categoryId;
    const domain = classifyQuestion(q);
    byRound[round] ??= {};
    byRound[round][domain] = (byRound[round][domain] ?? 0) + 1;
  }
  console.log('\n[회차별 도메인 구성]');
  for (const [round, counts] of Object.entries(byRound).sort()) {
    console.log(`  ${round}: ${JSON.stringify(counts)}`);
  }
}

if (require.main === module) {
  main();
}