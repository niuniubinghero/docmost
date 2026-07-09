import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getSpaces } from '../../lib/api/spaces';
import type { Space } from '../../types';

export default function SpacesScreen() {
  const router = useRouter();
  const { data: spaces, isLoading, refetch } = useQuery({
    queryKey: ['spaces'],
    queryFn: getSpaces,
  });

  const renderSpace = ({ item }: { item: Space }) => (
    <TouchableOpacity
      style={styles.spaceItem}
      onPress={() => router.push(`/space/${item.slug}`)}
    >
      <View style={styles.spaceIcon}>
        <Text style={styles.iconText}>{item.icon || '📁'}</Text>
      </View>
      <View style={styles.spaceInfo}>
        <Text style={styles.spaceName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.spaceDesc} numberOfLines={1}>{item.description}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={spaces || []}
        renderItem={renderSpace}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No spaces yet</Text>
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
  spaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  spaceIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 22,
  },
  spaceInfo: {
    flex: 1,
  },
  spaceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  spaceDesc: {
    fontSize: 13,
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
