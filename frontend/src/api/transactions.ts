import { api } from './http';
import { CreateTransactionPayload, TransactionType } from '../types/transactions';

export type CreateTransactionResponse = {
  transaction: any;
  item: any;
  notification: any | null;
};

export async function createTransaction(payload: CreateTransactionPayload): Promise<CreateTransactionResponse> {
  // Backend expects TransactionType values: 'IN'|'OUT'|'MOVE'
  // and will validate link constraints inside a DB transaction.
  const res = await api.post<CreateTransactionResponse>('/transactions', payload);
  return res.data;
}

export function normalizeTransactionType(input: string): TransactionType {
  if (input === 'IN' || input === 'OUT' || input === 'MOVE') return input;
  return 'IN';
}

