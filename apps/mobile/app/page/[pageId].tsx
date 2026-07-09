import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getPageInfo, updatePage, deletePage } from '../../lib/api/pages';
import { useEditorStore } from '../../stores/editor-store';
import { PageBlock } from '../../components/editor/PageBlock';
import type { Page } from '../../types';

export default function PageScreen() {
  const router = useRouter();
  const { pageId } = useLocalSearchParams<{ pageId: string }>();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: page, isLoading } = useQuery({
    queryKey: ['page', pageId],
    queryFn: () => getPageInfo(pageId!),
    enabled: !!pageId,
  });

  useEffect(() => {
    if (page) {
      setTitle(page.title || '');
      // Parse ProseMirror JSON content into blocks
      if (page.content?.content) {
        setBlocks(page.content.content);
      } else {
        setBlocks([]);
      }
    }
  }, [page]);

  const updateMutation = useMutation({
    mutationFn: (data: { pageId: string; title?: string; content?: any }) =>
      updatePage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page', pageId] });
      queryClient.invalidateQueries({ queryKey: ['recentPages'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePage(pageId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentPages'] });
      router.back();
    },
  });

  const debouncedSave = useCallback(
    (newTitle?: string, newBlocks?: any[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const content = {
          type: 'doc',
          content: newBlocks || blocks,
        };
        updateMutation.mutate({
          pageId: pageId!,
          title: newTitle ?? title,
          content,
        });
      }, 1000);
    },
    [pageId, title, blocks]
  );

  const handleTitleChange = (text: string) => {
    setTitle(text);
    debouncedSave(text);
  };

  const handleBlockChange = (index: number, updatedBlock: any) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    setBlocks(newBlocks);
    debouncedSave(undefined, newBlocks);
  };

  const handleAddBlock = (afterIndex: number, type: string = 'paragraph') => {
    const newBlock = createEmptyBlock(type);
    const newBlocks = [...blocks];
    newBlocks.splice(afterIndex + 1, 0, newBlock);
    setBlocks(newBlocks);
    debouncedSave(undefined, newBlocks);
  };

  const handleDeleteBlock = (index: number) => {
    if (blocks.length <= 1) return;
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
    debouncedSave(undefined, newBlocks);
  };

  const handleDelete = () => {
    Alert.alert('Delete Page', 'Are you sure you want to delete this page?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#228be6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      {/* Header actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.menuBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {showMenu && (
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              // TODO: Implement favorites
            }}
          >
            <Ionicons name="star-outline" size={18} color="#333" />
            <Text style={styles.menuItemText}>Favorite</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              handleDelete();
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#e53e3e" />
            <Text style={[styles.menuItemText, { color: '#e53e3e' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.editor} contentContainerStyle={styles.editorContent}>
        {/* Page icon */}
        {page?.icon && (
          <Text style={styles.pageIcon}>{page.icon}</Text>
        )}

        {/* Title */}
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={handleTitleChange}
          placeholder="Untitled"
          placeholderTextColor="#ccc"
          multiline
          scrollEnabled={false}
        />

        {/* Blocks */}
        {blocks.map((block, index) => (
          <PageBlock
            key={index}
            block={block}
            index={index}
            onChange={(updated) => handleBlockChange(index, updated)}
            onAddBlock={() => handleAddBlock(index)}
            onDeleteBlock={() => handleDeleteBlock(index)}
          />
        ))}

        {/* Add block button */}
        <TouchableOpacity
          style={styles.addBlock}
          onPress={() => handleAddBlock(blocks.length - 1)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#ccc" />
          <Text style={styles.addBlockText}>Add a block</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createEmptyBlock(type: string): any {
  switch (type) {
    case 'heading':
      return { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '' }] };
    case 'bulletList':
      return {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] }],
      };
    case 'codeBlock':
      return { type: 'codeBlock', content: [{ type: 'text', text: '' }] };
    case 'blockquote':
      return {
        type: 'blockquote',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
      };
    case 'horizontalRule':
      return { type: 'horizontalRule' };
    default:
      return { type: 'paragraph', content: [{ type: 'text', text: '' }] };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  menuBtn: {
    padding: 8,
  },
  menu: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  menuItemText: {
    fontSize: 15,
    color: '#333',
  },
  editor: {
    flex: 1,
  },
  editorContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  pageIcon: {
    fontSize: 40,
    marginTop: 12,
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingVertical: 8,
    lineHeight: 36,
  },
  addBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addBlockText: {
    color: '#ccc',
    fontSize: 14,
  },
});
