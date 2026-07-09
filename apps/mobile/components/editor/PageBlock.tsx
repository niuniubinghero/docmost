import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { ParagraphBlock } from './blocks/ParagraphBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { ListBlock } from './blocks/ListBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { QuoteBlock } from './blocks/QuoteBlock';
import { DividerBlock } from './blocks/DividerBlock';
import { ImageBlock } from './blocks/ImageBlock';

interface PageBlockProps {
  block: any;
  index: number;
  onChange: (block: any) => void;
  onAddBlock: () => void;
  onDeleteBlock: () => void;
}

export function PageBlock({ block, index, onChange, onAddBlock, onDeleteBlock }: PageBlockProps) {
  switch (block.type) {
    case 'heading':
      return (
        <HeadingBlock
          block={block}
          onChange={onChange}
          onAddBlock={onAddBlock}
          onDeleteBlock={onDeleteBlock}
        />
      );
    case 'bulletList':
    case 'orderedList':
      return (
        <ListBlock
          block={block}
          onChange={onChange}
          onAddBlock={onAddBlock}
          onDeleteBlock={onDeleteBlock}
        />
      );
    case 'codeBlock':
      return (
        <CodeBlock
          block={block}
          onChange={onChange}
          onAddBlock={onAddBlock}
          onDeleteBlock={onDeleteBlock}
        />
      );
    case 'blockquote':
      return (
        <QuoteBlock
          block={block}
          onChange={onChange}
          onAddBlock={onAddBlock}
          onDeleteBlock={onDeleteBlock}
        />
      );
    case 'horizontalRule':
      return <DividerBlock />;
    case 'image':
      return <ImageBlock block={block} />;
    case 'paragraph':
    default:
      return (
        <ParagraphBlock
          block={block}
          onChange={onChange}
          onAddBlock={onAddBlock}
          onDeleteBlock={onDeleteBlock}
        />
      );
  }
}
