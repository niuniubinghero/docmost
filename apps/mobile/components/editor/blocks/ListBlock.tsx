import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

interface ListBlockProps {
  block: any;
  onChange: (block: any) => void;
  onAddBlock: () => void;
  onDeleteBlock: () => void;
}

export function ListBlock({ block, onChange, onAddBlock, onDeleteBlock }: ListBlockProps) {
  const isOrdered = block.type === 'orderedList';
  const items = block.content || [];

  const handleItemChange = (index: number, text: string) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    };
    onChange({ ...block, content: newItems });
  };

  return (
    <View style={styles.container}>
      {items.map((item: any, index: number) => {
        const itemText = extractText(item.content);
        return (
          <View key={index} style={styles.listItem}>
            <Text style={styles.bullet}>
              {isOrdered ? `${index + 1}.` : '•'}
            </Text>
            <TextInput
              style={styles.input}
              value={itemText}
              onChangeText={(text) => handleItemChange(index, text)}
              multiline
              scrollEnabled={false}
            />
          </View>
        );
      })}
    </View>
  );
}

function extractText(content: any[]): string {
  if (!content) return '';
  return content
    .map((node: any) => {
      if (node.type === 'text') return node.text || '';
      if (node.type === 'paragraph') return extractText(node.content);
      if (node.content) return extractText(node.content);
      return '';
    })
    .join('');
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  bullet: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
    marginTop: 2,
    minWidth: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
});
