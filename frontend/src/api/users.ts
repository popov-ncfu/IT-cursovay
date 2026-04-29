import { api } from './http';

export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER';

export type UserListItem = {
  id: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchUsers(): Promise<UserListItem[]> {
  const res = await api.get<UserListItem[]>('/users');
  return res.data;
}

export async function updateUserRole(id: string, role: UserRole): Promise<UserListItem> {
  const res = await api.put<UserListItem>(`/users/${id}/role`, { role });
  return res.data;
}

