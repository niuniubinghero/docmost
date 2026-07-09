import React, { useRef } from 'react';
import { TextInput, StyleSheet } from 'react-native';

interface ParagraphBlockProps {
  block: any;
  onChange: (block: any) => void;
  onAddBlock: () => void;
  onDeleteBlock: () => void;
}

export function ParagraphBlock({ block, onChange, onAddBlock, onDeleteBlock }: ParagraphBlockProps) {
  const text = extractText(block.content);

  const handleChange = (newText: string) => {
    onChange({
      ...block,
      content: [{ type: 'text', text: newText }],
    });
  };

  const handleKeyPress = ({ nativeEvent }: any) => {
    if (nativeEvent.key === 'Enter') {
      // Don't add new block on Enter for paragraphs - just add newline
    }
    if (nativeEvent.key === 'Backspace' && text === '') {
      onDeleteBlock();
    }
  };

  return (
    <TextInput
      style={styles.input}
      value={text}
      onChangeText={handleChange}
      onKeyPress={handleKeyPress}
      placeholder="Type '/' for commands..."
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
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    paddingVertical: 4,
    minHeight: 28,
  },
});
