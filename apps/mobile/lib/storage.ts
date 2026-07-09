import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({
  id: 'docmost-storage',
});

export function getServerUrl(): string | null {
  return storage.getString('serverUrl') ?? null;
}

export function setServerUrl(url: string) {
  storage.set('serverUrl', url.replace(/\/+$/, ''));
}

export function getToken(): string | null {
  return storage.getString('authToken') ?? null;
}

export function setToken(token: string) {
  storage.set('authToken', token);
}

export function removeToken() {
  storage.remove('authToken');
}

export function clearAll() {
  storage.clearAll();
}
