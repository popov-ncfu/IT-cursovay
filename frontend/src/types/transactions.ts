export type TransactionType = 'IN' | 'OUT' | 'MOVE';

export type CreateTransactionPayload = {
  type: TransactionType;
  quantity: number;
  itemId: string;

  // Optional metadata. Keep null/undefined semantics aligned with backend validation.
  toLocationId?: string;
  fromLocationId?: string;
  fromOwnerId?: string;
  toOwnerId?: string;
};

