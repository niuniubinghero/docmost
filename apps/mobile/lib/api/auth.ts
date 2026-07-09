import { getApiClient } from '../api-client';
import type { LoginRequest, LoginResponse, User, Workspace } from '../../types';

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await getApiClient().post('/auth/login', data);
  return res.data;
}

export async function logout(): Promise<void> {
  await getApiClient().post('/auth/logout');
}

export async function getCurrentUser(): Promise<{ user: User; workspace: Workspace }> {
  const res = await getApiClient().post('/users/me');
  return res.data;
}

export async function getWorkspaceInfo(): Promise<Workspace> {
  const res = await getApiClient().post('/workspace/info');
  return res.data;
}

export async function getWorkspacePublic(hostname: string): Promise<any> {
  const res = await getApiClient().post('/workspace/public', { hostname });
  return res.data;
}
