import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getSpaces } from '../../lib/api/spaces';
import { getSidebarPages } from '../../lib/api/pages';
import type { PageMeta, Space } from '../../types';

export default function SpaceDetailScreen() {
  const router = useRouter();
  const { spaceSlug } = useLocalSearchParams<{ spaceSlug: string }>();

  const { data: spaces } = useQuery({
    queryKey: ['spaces'],
    queryFn: getSpaces,
  });

  const space = spaces?.find((s: Space) => s.slug === spaceSlug);

  const { data: pages, isLoading, refetch } = useQuery({
    queryKey: ['sidebarPages', space?.id],
    queryFn: () => getSidebarPages(space!.id),
    enabled: !!space?.id,
  });

  const rootPages = (pages || []).filter((p: PageMeta) => !p.parentId);

  const renderPage = ({ item, depth = 0 }: { item: PageMeta; depth?: number }) => (
    <View key={item.id}>
      <TouchableOpacity
        style={[styles.pageItem, { paddingLeft: 16 + depth * 20 }]}
        onPress={() => router.push(`/page/${item.id}`)}
      >
        <Text style={styles.pageIcon}>{item.icon || '📄'}</Text>
        <Text style={styles.pageTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
        {item.hasChildren && (
          <Ionicons name="chevron-down" size={14} color="#ccc" style={styles.chevron} />
        )}
      </TouchableOpacity>
      {item.hasChildren &&
        (pages || [])
          .filter((p: PageMeta) => p.parentId === item.id)
          .map((child: PageMeta) => renderPage({ item: child, depth: depth + 1 }))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{space?.name || 'Space'}</Text>
        <View style={styles.placeholder} />
      </View>

      {space?.description && (
        <Text style={styles.description}>{space.description}</Text>
      )}

      <FlatList
        data={rootPages}
        renderItem={({ item }) => renderPage({ item })}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No pages in this space</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  description: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#666',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  pageIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  pageTitle: {
    flex: 1,
    fontSize: 15,
  },
  chevron: {
    marginLeft: 4,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
  },
});
