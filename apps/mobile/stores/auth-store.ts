import { create } from 'zustand';
import { getToken, setToken, removeToken, getServerUrl, setServerUrl } from '../lib/storage';
import { resetApiClient } from '../lib/api-client';
import type { User, Workspace } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  workspace: Workspace | null;
  serverUrl: string | null;

  init: () => void;
  setServer: (url: string) => void;
  login: (token: string, user: User, workspace: Workspace) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  workspace: null,
  serverUrl: null,

  init: () => {
    const token = getToken();
    const serverUrl = getServerUrl();
    set({
      isAuthenticated: !!token,
      isLoading: false,
      serverUrl,
    });
  },

  setServer: (url: string) => {
    setServerUrl(url);
    resetApiClient();
    set({ serverUrl: url });
  },

  login: (token: string, user: User, workspace: Workspace) => {
    setToken(token);
    set({
      isAuthenticated: true,
      user,
      workspace,
    });
  },

  logout: () => {
    removeToken();
    resetApiClient();
    set({
      isAuthenticated: false,
      user: null,
      workspace: null,
    });
  },

  updateUser: (user: User) => {
    set({ user });
  },
}));
