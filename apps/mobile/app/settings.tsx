import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/auth-store';
import { logout as apiLogout } from '../lib/api/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, workspace, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiLogout();
          } catch {}
          logout();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Workspace Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workspace</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{workspace?.name || '-'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Slug</Text>
            <Text style={styles.infoValue}>{workspace?.slug || '-'}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/chat')}>
            <Ionicons name="chatbubble-outline" size={20} color="#228be6" />
            <Text style={styles.actionText}>AI Chat</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/favorites')}>
            <Ionicons name="star-outline" size={20} color="#f59e0b" />
            <Text style={styles.actionText}>Favorites</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/templates')}>
            <Ionicons name="document-outline" size={20} color="#10b981" />
            <Text style={styles.actionText}>Templates</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#e53e3e" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#228be6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#eee',
    marginLeft: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e53e3e',
  },
});
