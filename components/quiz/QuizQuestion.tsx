/**
 * 퀴즈 문제 표시 컴포넌트
 * 문제 번호, 카테고리 뱃지, 문제 텍스트, 코드 스니펫 표시
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';
import { CodeBlock } from '@/components/ui/CodeBlock';
import type { Question } from '@/features/questions/types';

interface QuizQuestionProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  'code-c': 'C언어',
  'code-java': 'Java',
  'code-python': 'Python',
  'code-common': '공통코드',
  'sql-dml': 'SQL DML',
  'sql-ddl': 'SQL DDL',
  'sql-set': 'SQL 집합',
  'theory-se': '소프트웨어공학',
  'theory-network': '네트워크',
  'theory-db': '데이터베이스',
  'theory-os': '운영체제',
};

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  questionNumber,
  totalQuestions,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.questionNumber}>
          Q{questionNumber} / {totalQuestions}
        </Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>
            {CATEGORY_LABELS[question.categoryId] ?? question.categoryId}
          </Text>
        </View>
      </View>
      <Text style={styles.questionText}>{question.question}</Text>
      {question.codeSnippet && (
        <CodeBlock
          code={question.codeSnippet}
          language={question.codeLanguage}
          fontSize="medium"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  categoryBadge: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  questionText: { fontSize: 16, lineHeight: 26, color: COLORS.text },
});

export default QuizQuestion;
