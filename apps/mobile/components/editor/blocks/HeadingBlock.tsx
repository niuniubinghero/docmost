import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

interface HeadingBlockProps {
  block: any;
  onChange: (block: any) => void;
  onAddBlock: () => void;
  onDeleteBlock: () => void;
}

const HEADING_STYLES: Record<number, { fontSize: number; fontWeight: string }> = {
  1: { fontSize: 28, fontWeight: '700' },
  2: { fontSize: 24, fontWeight: '700' },
  3: { fontSize: 20, fontWeight: '600' },
  4: { fontSize: 18, fontWeight: '600' },
  5: { fontSize: 16, fontWeight: '600' },
  6: { fontSize: 15, fontWeight: '600' },
};

export function HeadingBlock({ block, onChange, onAddBlock, onDeleteBlock }: HeadingBlockProps) {
  const level = block.attrs?.level || 1;
  const text = extractText(block.content);
  const style = HEADING_STYLES[level] || HEADING_STYLES[1];

  const handleChange = (newText: string) => {
    onChange({
      ...block,
      content: [{ type: 'text', text: newText }],
    });
  };

  const handleKeyPress = ({ nativeEvent }: any) => {
    if (nativeEvent.key === 'Enter') {
      onAddBlock();
    }
    if (nativeEvent.key === 'Backspace' && text === '') {
      onDeleteBlock();
    }
  };

  return (
    <TextInput
      style={[styles.input, { fontSize: style.fontSize, fontWeight: style.fontWeight as any }]}
      value={text}
      onChangeText={handleChange}
      onKeyPress={handleKeyPress}
      placeholder={`Heading ${level}`}
      placeholderTextColor="#ccc"
      multiline
      scrollEnabled={false}
    />
  );
}

function extractText(content: any[]): string {
  if (!content) return '';
  return content
    .map((node: any) => {
      if (node.type === 'text') return node.text || '';
      if (node.content) return extractText(node.content);
      return '';
    })
    .join('');
}

const styles = StyleSheet.create({
  input: {
    color: '#1a1a1a',
    paddingVertical: 6,
    lineHeight: 36,
  },
});
