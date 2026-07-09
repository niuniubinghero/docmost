import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getServerUrl, getToken, removeToken } from './storage';

let client: AxiosInstance | null = null;

export function getApiClient(): AxiosInstance {
  if (client) return client;

  const serverUrl = getServerUrl();
  if (!serverUrl) {
    throw new Error('Server URL not configured');
  }

  client = axios.create({
    baseURL: `${serverUrl}/api`,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        removeToken();
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export function resetApiClient() {
  client = null;
}

export function getServerBaseUrl(): string {
  const serverUrl = getServerUrl();
  if (!serverUrl) throw new Error('Server URL not configured');
  return serverUrl;
}
