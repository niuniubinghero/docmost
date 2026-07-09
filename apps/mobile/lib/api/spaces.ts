import { getApiClient } from '../api-client';
import type { Space, SpaceMember } from '../../types';

export async function getSpaces(): Promise<Space[]> {
  const res = await getApiClient().post('/spaces/');
  return res.data;
}

export async function getSpaceInfo(spaceId: string): Promise<Space> {
  const res = await getApiClient().post('/spaces/info', { spaceId });
  return res.data;
}

export async function createSpace(data: {
  name: string;
  description?: string;
  visibility?: string;
}): Promise<Space> {
  const res = await getApiClient().post('/spaces/create', data);
  return res.data;
}

export async function updateSpace(data: {
  spaceId: string;
  name?: string;
  description?: string;
  icon?: string | null;
}): Promise<Space> {
  const res = await getApiClient().post('/spaces/update', data);
  return res.data;
}

export async function deleteSpace(spaceId: string): Promise<void> {
  await getApiClient().post('/spaces/delete', { spaceId });
}

export async function getSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
  const res = await getApiClient().post('/spaces/members', { spaceId });
  return res.data;
}
