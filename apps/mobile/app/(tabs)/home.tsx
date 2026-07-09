import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getRecentPages } from '../../lib/api/pages';
import { useAuthStore } from '../../stores/auth-store';
import type { Page } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { workspace } = useAuthStore();
  const { data: pages, isLoading, refetch } = useQuery({
    queryKey: ['recentPages'],
    queryFn: getRecentPages,
  });

  const renderPage = ({ item }: { item: Page }) => (
    <TouchableOpacity
      style={styles.pageItem}
      onPress={() => router.push(`/page/${item.id}`)}
    >
      <Text style={styles.pageIcon}>{item.icon || '📄'}</Text>
      <View style={styles.pageInfo}>
        <Text style={styles.pageTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
        <Text style={styles.pageTime}>
          {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {workspace?.name || 'Docmost'} 👋</Text>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent Pages</Text>

      <FlatList
        data={pages || []}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No recent pages</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 1,
    borderRadius: 8,
  },
  pageIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  pageInfo: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  pageTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
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
