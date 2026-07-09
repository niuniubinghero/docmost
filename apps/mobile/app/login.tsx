import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TextInput, Button, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../stores/auth-store';
import { login as apiLogin } from '../lib/api/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { login: storeLogin } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await apiLogin({ email, password });
      storeLogin(data.token, data.user, data.workspace);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to Docmost</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.button}>
          <Button title={loading ? 'Signing in...' : 'Sign In'} onPress={handleLogin} disabled={loading} />
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Change server</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
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
    marginBottom: 12,
  },
  error: {
    color: '#e53e3e',
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
  },
  back: {
    marginTop: 16,
    alignItems: 'center',
  },
  backText: {
    color: '#228be6',
    fontSize: 14,
  },
});
