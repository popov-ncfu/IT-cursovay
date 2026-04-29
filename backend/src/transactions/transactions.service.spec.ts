import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role, TransactionType } from '@prisma/client';
import { TransactionsService } from './transactions.service';

function createTxMock(overrides?: Partial<any>) {
  return {
    item: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    location: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    ...overrides,
  };
}

describe('TransactionsService', () => {
  it('forbids VIEWER at service level', async () => {
    const prisma = {
      $transaction: jest.fn(),
    } as any;
    const service = new TransactionsService(prisma);

    await expect(
      service.create(
        { type: TransactionType.IN, quantity: 1, itemId: 'item1' },
        { userId: 'u1', email: 'a@a', role: Role.VIEWER },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects OUT more than current quantity', async () => {
    const tx = createTxMock();
    tx.item.findUnique.mockResolvedValue({
      id: 'item1',
      quantity: 3,
      threshold: 0,
      locationId: 'loc1',
      ownerId: null,
      owner: null,
      category: { id: 'cat1', name: 'c' },
      location: { id: 'loc1', name: 'l' },
    });

    const prisma = {
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    } as any;

    const service = new TransactionsService(prisma);

    await expect(
      service.create(
        { type: TransactionType.OUT, quantity: 4, itemId: 'item1' },
        { userId: 'u1', email: 'a@a', role: Role.MANAGER },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.item.update).not.toHaveBeenCalled();
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it('creates notification when quantity drops below threshold', async () => {
    const tx = createTxMock();
    tx.item.findUnique.mockResolvedValue({
      id: 'item1',
      name: 'Widget',
      quantity: 5,
      threshold: 4,
      locationId: 'loc1',
      ownerId: 'owner1',
      owner: { id: 'owner1', email: 'o@o', role: 'VIEWER' },
      category: { id: 'cat1', name: 'c' },
      location: { id: 'loc1', name: 'l' },
    });

    tx.item.update.mockResolvedValue({
      id: 'item1',
      name: 'Widget',
      quantity: 3,
      threshold: 4,
      locationId: 'loc1',
      ownerId: 'owner1',
      category: { id: 'cat1', name: 'c' },
      location: { id: 'loc1', name: 'l' },
      owner: { id: 'owner1', email: 'o@o', role: 'VIEWER' },
    });

    tx.transaction.create.mockResolvedValue({
      id: 'tx1',
      type: 'OUT',
      quantity: 2,
      actorId: 'actor1',
      itemId: 'item1',
    });

    tx.notification.create.mockResolvedValue({ id: 'n1' });
    tx.auditLog.create.mockResolvedValue({ id: 'a1' });

    const prisma = {
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    } as any;

    const service = new TransactionsService(prisma);

    const res = await service.create(
      { type: TransactionType.OUT, quantity: 2, itemId: 'item1' },
      { userId: 'actor1', email: 'a@a', role: Role.ADMIN },
    );

    expect(res.notification).toEqual({ id: 'n1' });
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'owner1',
        itemId: 'item1',
        transactionId: 'tx1',
      }),
    });
  });
});
