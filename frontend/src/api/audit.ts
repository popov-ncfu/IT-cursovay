import { api } from './http';
import { AuditListResponse } from '../types/inventory';

export async function fetchAuditLogs(params: {
  entity?: string;
  entityId?: string;
  skip?: number;
  take?: number;
}): Promise<AuditListResponse> {
  const res = await api.get<AuditListResponse>('/audit', { params });
  return res.data;
}

