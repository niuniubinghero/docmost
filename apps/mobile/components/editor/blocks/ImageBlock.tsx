import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface ImageBlockProps {
  block: any;
}

export function ImageBlock({ block }: ImageBlockProps) {
  const src = block.attrs?.src;
  const alt = block.attrs?.alt || '';

  if (!src) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>📷 Image</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: src }}
        style={styles.image}
        resizeMode="contain"
        accessible
        accessibilityLabel={alt}
      />
      {alt ? <Text style={styles.caption}>{alt}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  caption: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  placeholder: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 24,
    alignItems: 'center',
    marginVertical: 8,
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
  },
});
