import React from 'react';
import { TextInput, StyleSheet, View } from 'react-native';

interface CodeBlockProps {
  block: any;
  onChange: (block: any) => void;
  onAddBlock: () => void;
  onDeleteBlock: () => void;
}

export function CodeBlock({ block, onChange, onAddBlock, onDeleteBlock }: CodeBlockProps) {
  const text = extractText(block.content);

  const handleChange = (newText: string) => {
    onChange({
      ...block,
      content: [{ type: 'text', text: newText }],
    });
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={handleChange}
        placeholder="Enter code..."
        placeholderTextColor="#999"
        multiline
        scrollEnabled={false}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
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
  container: {
    backgroundColor: '#f6f8fa',
    borderRadius: 6,
    padding: 12,
    marginVertical: 4,
  },
  input: {
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
});
