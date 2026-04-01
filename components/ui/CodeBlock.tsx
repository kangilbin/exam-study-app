/**
 * 코드 스니펫 표시 컴포넌트
 * monospace 폰트 + 가로 스크롤 + 줄 번호 옵션
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { COLORS, CODE_FONT_SIZES } from '@/lib/constants';
import type { CodeLanguage } from '@/features/questions/types';

type FontSizeKey = 'small' | 'medium' | 'large';

interface CodeBlockProps {
  code: string;
  language?: CodeLanguage;
  fontSize?: FontSizeKey;
  showLineNumbers?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  fontSize = 'medium',
  showLineNumbers = false,
}) => {
  const lines = code.split('\n');
  const resolvedFontSize = CODE_FONT_SIZES[fontSize];

  return (
    <View style={styles.container}>
      {/* 언어 뱃지 */}
      {language && (
        <View style={styles.header}>
          <Text style={styles.languageBadge}>{language.toUpperCase()}</Text>
        </View>
      )}
      {/* 가로 스크롤 가능한 코드 영역 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.codeArea}>
          {lines.map((line, index) => (
            <View key={index} style={styles.lineRow}>
              {showLineNumbers && (
                <Text style={[styles.lineNumber, { fontSize: resolvedFontSize }]}>
                  {String(index + 1).padStart(2, ' ')}
                </Text>
              )}
              <Text style={[styles.codeText, { fontSize: resolvedFontSize }]}>
                {line}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.gray[800],
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 12,
  },
  header: {
    backgroundColor: COLORS.gray[700],
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  languageBadge: {
    color: COLORS.gray[300],
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  scrollView: {
    padding: 12,
  },
  codeArea: {
    flexDirection: 'column',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 20,
  },
  lineNumber: {
    color: COLORS.gray[500],
    fontFamily: 'monospace',
    marginRight: 12,
    lineHeight: 20,
    minWidth: 20,
    textAlign: 'right',
  },
  codeText: {
    fontFamily: 'monospace',
    color: '#e5e7eb',
    lineHeight: 20,
  },
});

export default CodeBlock;
