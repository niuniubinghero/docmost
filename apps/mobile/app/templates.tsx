import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getApiClient } from '../lib/api-client';

async function getTemplates() {
  const res = await getApiClient().post('/templates/');
  return res.data;
}

export default function TemplatesScreen() {
  const router = useRouter();
  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  });

  const renderTemplate = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.templateItem}>
      <Ionicons name="document-text-outline" size={24} color="#228be6" />
      <View style={styles.templateInfo}>
        <Text style={styles.templateName} numberOfLines={1}>{item.name || 'Untitled'}</Text>
        {item.description && (
          <Text style={styles.templateDesc} numberOfLines={1}>{item.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={templates || []}
        renderItem={renderTemplate}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No templates</Text>
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
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    gap: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '500',
  },
  templateDesc: {
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
