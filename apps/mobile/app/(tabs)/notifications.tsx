import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getNotifications, markAllRead } from '../../lib/api/notifications';
import type { Notification } from '../../types';

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const renderNotification = ({ item }: { item: Notification }) => (
    <View style={[styles.notifItem, !item.isRead && styles.notifUnread]}>
      <Ionicons
        name={item.isRead ? 'notifications-outline' : 'notifications'}
        size={20}
        color={item.isRead ? '#999' : '#228be6'}
      />
      <View style={styles.notifInfo}>
        <Text style={styles.notifMessage}>{item.message}</Text>
        <Text style={styles.notifTime}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {notifications && notifications.length > 0 && (
        <TouchableOpacity
          style={styles.markAll}
          onPress={() => markAllMutation.mutate()}
        >
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications || []}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No notifications</Text>
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
  markAll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },
  markAllText: {
    color: '#228be6',
    fontSize: 14,
    fontWeight: '500',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 1,
    borderRadius: 8,
  },
  notifUnread: {
    backgroundColor: '#f0f7ff',
  },
  notifInfo: {
    flex: 1,
    marginLeft: 12,
  },
  notifMessage: {
    fontSize: 14,
    color: '#333',
  },
  notifTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
