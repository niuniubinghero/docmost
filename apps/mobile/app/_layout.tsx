import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth-store';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

export default function RootLayout() {
  const { init, isLoading } = useAuthStore();

  useEffect(() => {
    init();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#228be6" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="space/[spaceSlug]" />
        <Stack.Screen name="page/[pageId]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="chat" />
        <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
      </Stack>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
