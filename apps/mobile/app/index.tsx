import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/auth-store';
import { View, Text, TextInput, Button, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { getServerUrl } from '../lib/storage';
import { getCurrentUser } from '../lib/api/auth';
import { resetApiClient } from '../lib/api-client';

export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated, serverUrl, setServer, login } = useAuthStore();
  const [url, setUrl] = useState(serverUrl || 'http://192.168.31.205:3000');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isAuthenticated && serverUrl) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, serverUrl]);

  const handleConnect = async () => {
    if (!url.trim()) {
      setError('Please enter server URL');
      return;
    }

    setError('');
    setChecking(true);

    try {
      setServer(url.trim());
      resetApiClient();

      // Try to fetch workspace info to verify connection
      const token = (await import('../lib/storage')).getToken();
      if (token) {
        try {
          const data = await getCurrentUser();
          login(token, data.user, data.workspace);
          router.replace('/(tabs)/home');
          return;
        } catch {
          // Token expired, go to login
        }
      }
      router.replace('/login');
    } catch (e: any) {
      setError('Cannot connect to server. Please check the URL.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>📝 Docmost</Text>
        <Text style={styles.subtitle}>Connect to your Docmost server</Text>

        <TextInput
          style={styles.input}
          placeholder="Server URL (e.g. http://192.168.1.100:3000)"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!checking}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.button}>
          <Button
            title={checking ? 'Connecting...' : 'Connect'}
            onPress={handleConnect}
            disabled={checking}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  error: {
    color: '#e53e3e',
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
  },
});
