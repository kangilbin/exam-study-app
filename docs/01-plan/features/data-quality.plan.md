# Plan: data-quality (문제 데이터 품질 보강)

## 개요
- **기능명**: data-quality
- **유형**: 데이터 품질 개선
- **우선순위**: 높음
- **작성일**: 2026-04-01

## 문제 현황

### 전체 통계
| 구분 | 전체 문제 | SQL codeSnippet 누락 | 코드 codeSnippet 누락 |
|------|:--------:|:-------------------:|:--------------------:|
| 기출문제 | 380 | 23 | 2 |
| 학습문제 | 88 | 5 | 0 |
| **합계** | **468** | **28** | **2** |

### 누락 유형 분석

#### DQ-1: SQL 문제 테이블/쿼리 누락 [28건]
SQL 문제에서 참조하는 테이블 구조와 SQL문이 `codeSnippet`에 없음.
`question` 필드에 텍스트로 뭉뚱그려 있거나 아예 누락.

**기출 23건**:
- exam-2020-1_006, exam-2020-2_006, exam-2020-2_012
- exam-2020-3_008, exam-2020-3_009, exam-2020-3_020
- exam-2020-4_016
- exam-2021-1_006, exam-2021-2_005, exam-2021-2_006, exam-2021-2_010
- exam-2021-3_013
- exam-2022-1_004, exam-2022-2_003, exam-2022-2_004
- exam-2023-3_004, exam-2023-3_017
- exam-2024-1_013, exam-2024-1_018
- exam-2024-2_003, exam-2024-3_003
- exam-2025-3_010, exam-2025-3_020

**학습 5건**:
- sql-dml_001 ~ sql-dml_005

#### DQ-2: 코드 문제 코드 스니펫 누락 [2건]
코드 문제인데 codeSnippet이 없어 문제를 풀 수 없음.

- exam-2023-3_007: 4의 배수 개수 구하기 (수학 문제라 코드 불필요 → type 변경 필요)
- exam-2023-3_009: 스택 push/pop 순서 (question에 포함되어 있음 → codeSnippet으로 분리)

## 수정 방안

### 접근 방식
`codeSnippet` 필드에 텍스트 기반 테이블을 추가하여 데이터 보강.
이미지 불필요 - monospace 텍스트 테이블로 충분.

### 테이블 표현 형식
```
[테이블명]
 col1 | col2 | col3
------+------+------
  1   | Kim  | HR
  2   | Lee  | DEV

SQL> SELECT * FROM A CROSS JOIN B;
```

### 수정 범위
1. **28건 SQL 문제**: `question`에서 테이블/SQL 정보를 `codeSnippet`으로 분리
2. **2건 코드 문제**: type 재분류 또는 codeSnippet 추가
3. **question 정리**: codeSnippet으로 분리 후 question 필드를 간결하게 정리

### 구현 방법
- 각 문제의 `question` 텍스트를 분석하여 테이블 데이터와 SQL문 추출
- `question`에 포함된 테이블 구조를 `codeSnippet`으로 이동
- `question`은 "다음 SQL의 실행 결과를 구하시오" 등 간결한 지문으로 정리

## 영향 범위

| 파일 | 수정 건수 |
|------|:--------:|
| data/questions/exam-2020-*.json | 7 |
| data/questions/exam-2021-*.json | 5 |
| data/questions/exam-2022-*.json | 3 |
| data/questions/exam-2023-*.json | 3 |
| data/questions/exam-2024-*.json | 3 |
| data/questions/exam-2025-*.json | 2 |
| data/questions/sql-dml.json | 5 |
| **합계** | **30** |

## 주의사항
- 원본 기출문제 PDF의 정확한 테이블 데이터를 반영해야 함
- `question` 필드에 이미 테이블 정보가 부분적으로 포함된 경우, 중복되지 않도록 정리
- 기존 `answer`, `explanation`, `choices` 필드는 변경하지 않음
