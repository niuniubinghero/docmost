import { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { search as apiSearch } from '../../lib/api/search';
import type { SearchResult } from '../../types';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await apiSearch(query.trim());
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => router.push(`/page/${item.id}`)}
    >
      <Text style={styles.resultIcon}>{item.icon || '📄'}</Text>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
        <Text style={styles.resultText} numberOfLines={2}>{item.textContent}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search pages..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#228be6" />
      ) : (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            searched ? (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Search your pages</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  loader: {
    marginTop: 32,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 1,
    borderRadius: 8,
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  resultText: {
    fontSize: 13,
    color: '#666',
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
