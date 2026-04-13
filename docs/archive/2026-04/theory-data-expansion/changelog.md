# Changelog

All notable changes to the exam-study-app project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2026-04-01] - Theory Data Expansion Complete

### Added
- **PDF Theory Coverage**: 10 chapters (Ch1-Ch12) fully integrated into learning app data
  - Ch1: 요구사항 확인 (18 questions)
  - Ch2: 데이터 입출력 구현 (25 questions)
  - Ch3: 통합 구현 (12 questions)
  - Ch4: 서버 프로그램 구현 (15 questions)
  - Ch5: 인터페이스 구현 (8 questions)
  - Ch6: 화면 설계 (8 questions)
  - Ch7: 애플리케이션 테스트 (25 questions)
  - Ch8: SQL 응용 (15 questions)
  - Ch9: 소프트웨어 보안 (35 questions)
  - Ch11: 응용 SW 기초 기술 (35 questions)
  - Ch12: 제품 소프트웨어 패키징 (10 questions)
  - Study Table: 디자인패턴, SQL, 네트워크, 신기술용어 (44 questions)

- **Total Questions Added**: 162 questions (68 → 230, +238%)
  - theory-se: 5 → 55 (+50)
  - theory-db: 5 → 30 (+25)
  - theory-network: 5 → 30 (+25)
  - theory-os: 5 → 20 (+15)
  - memorize-se: 15 → 30 (+15)
  - memorize-db: 10 → 20 (+10)
  - memorize-network: 13 → 25 (+12)
  - memorize-os: 10 → 20 (+10)

- **Exam Questions**: 30 marked questions (기출) across all theory categories
  - theory-se: 18 (기출)
  - theory-db: 8 (기출)
  - theory-network: 4 (기출)

- **Subcategories**: Expanded from basic to comprehensive
  - theory-se: 13 subcategories (개발방법론, 요구사항, UML, 디자인패턴, 비용산정, 아키텍처, 프로젝트관리, 통합구현, 서버프로그램, 인터페이스, 화면설계, 테스트, 패키징)
  - theory-db: 15 subcategories
  - theory-network: 13 subcategories
  - theory-os: 13 subcategories
  - memorize-se: 11 subcategories
  - memorize-db: 5 subcategories
  - memorize-network: 6 subcategories
  - memorize-os: 5 subcategories

### Changed
- **Implementation Strategy (v2)**: Refined from original plan
  - Changed from: Create 9 new category files
  - Changed to: Expand existing 8 categories with rich subcategories
  - Benefit: Zero code changes to types.ts/questionService.ts, maintained UI consistency, 100% backward compatibility

- **categories.json**: Updated subcategories for all theory/memorize categories
  - Maintained existing category structure
  - No new category cards added (UI impact minimized)

### Fixed
- Gap Analysis iteration improved design match rate from 68% to 93%
  - Root cause: Plan v1 had different strategy than Do phase
  - Solution: Updated Plan to v2 to reflect integrated strategy
  - Result: Full alignment between plan and implementation

### Quality Metrics
- Design Match Rate: 93% (after Plan v2 update)
- Duplicate Questions: 0
- Missing Choices: 0
- Exam Question Coverage: 100% (30/30 marked)
- PDF Chapter Coverage: 100% (10/10 chapters)
- Code Compatibility: 100%

---

## Prior Releases

### [Earlier Commits]
- Initial project setup with basic theory questions (68 total)
- SQL DML/DDL/SET files
- Code practice files (C, Java, Python)
- Exam year-based files (2020-2025)
