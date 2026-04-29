export type Category = {
  id: string;
  name: string;
};

export type Location = {
  id: string;
  name: string;
};

export type Owner = {
  id: string;
  email: string;
  role: string;
};

export type Item = {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  threshold: number;
  categoryId: string;
  locationId: string;
  ownerId?: string | null;
  createdAt?: string;
  updatedAt?: string;

  // Optional includes (from GET /items/:id).
  category?: Category;
  location?: Location;
  owner?: Owner | null;
};

export type ItemsListResponse = {
  items: Item[];
  total: number;
  skip: number;
  take: number;
};

export type AuditLog = {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  changes: any;
  createdAt: string;
  actorId?: string | null;
  itemId?: string | null;
  transactionId?: string | null;
};

export type AuditListResponse = {
  auditLogs: AuditLog[];
  total: number;
  skip: number;
  take: number;
};

export type Notification = {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string | null;
  transactionId?: string | null;
  itemId?: string | null;

  transaction?: any;
  item?: any;
};

export type NotificationsListResponse = {
  notifications: Notification[];
  total: number;
  skip: number;
  take: number;
};

