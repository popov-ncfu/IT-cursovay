import { api } from './http';
import { NotificationsListResponse } from '../types/inventory';

export async function fetchNotifications(params: {
  isRead?: boolean;
  skip?: number;
  take?: number;
}): Promise<NotificationsListResponse> {
  const res = await api.get<NotificationsListResponse>(
    '/notifications',
    { params },
  );
  return res.data;
}

