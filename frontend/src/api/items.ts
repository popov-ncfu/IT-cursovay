import { api } from './http';
import {
  Item,
  ItemsListResponse,
  Category,
  Location,
  Owner,
} from '../types/inventory';

export type CreateItemPayload = {
  name: string;
  description?: string;
  quantity: number;
  threshold: number;
  categoryId: string;
  locationId: string;
  ownerId?: string;
};

export type UpdateItemPayload = Partial<CreateItemPayload>;

export async function fetchCategories(): Promise<Category[]> {
  const res = await api.get<Category[]>('/categories');
  return res.data;
}

export async function fetchLocations(): Promise<Location[]> {
  const res = await api.get<Location[]>('/locations');
  return res.data;
}

export async function fetchItems(params: {
  q?: string;
  categoryId?: string;
  locationId?: string;
  ownerId?: string;
  skip?: number;
  take?: number;
}): Promise<ItemsListResponse> {
  const res = await api.get<ItemsListResponse>('/items', { params });
  return res.data;
}

export async function fetchItem(id: string): Promise<Item> {
  const res = await api.get<Item>(`/items/${id}`);
  return res.data;
}

