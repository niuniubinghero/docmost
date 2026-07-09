import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getFavorites } from '../lib/api/favorites';

export default function FavoritesScreen() {
  const router = useRouter();
  const { data: favorites, isLoading, refetch } = useQuery({
    queryKey: ['favorites'],
    queryFn: getFavorites,
  });

  const renderFavorite = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.favItem}
      onPress={() => {
        if (item.pageId) router.push(`/page/${item.pageId}`);
      }}
    >
      <Text style={styles.favIcon}>{item.page?.icon || '⭐'}</Text>
      <View style={styles.favInfo}>
        <Text style={styles.favTitle} numberOfLines={1}>
          {item.page?.title || item.space?.name || 'Untitled'}
        </Text>
        <Text style={styles.favType}>{item.pageId ? 'Page' : 'Space'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites || []}
        renderItem={renderFavorite}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="star-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No favorites yet</Text>
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
  favItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  favIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  favInfo: {
    flex: 1,
  },
  favTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  favType: {
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
