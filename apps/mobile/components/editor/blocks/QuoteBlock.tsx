import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

interface QuoteBlockProps {
  block: any;
  onChange: (block: any) => void;
  onAddBlock: () => void;
  onDeleteBlock: () => void;
}

export function QuoteBlock({ block, onChange, onAddBlock, onDeleteBlock }: QuoteBlockProps) {
  const innerParagraph = block.content?.[0];
  const text = extractText(innerParagraph?.content);

  const handleChange = (newText: string) => {
    onChange({
      ...block,
      content: [
        {
          ...innerParagraph,
          content: [{ type: 'text', text: newText }],
        },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.bar} />
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={handleChange}
        placeholder="Quote..."
        placeholderTextColor="#ccc"
        multiline
        scrollEnabled={false}
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
    flexDirection: 'row',
    marginVertical: 4,
    paddingLeft: 12,
  },
  bar: {
    width: 3,
    backgroundColor: '#ddd',
    borderRadius: 2,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    fontStyle: 'italic',
  },
});
