import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma, Role, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/types/jwt-payload.type';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTransactionDto, actor: AuthUser) {
    // Simple RBAC on service level as an extra safety net.
    if (actor.role === Role.VIEWER) {
      throw new ForbiddenException('Viewer cannot create transactions.');
    }

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id: dto.itemId },
        include: {
          owner: true,
          category: true,
          location: true,
        },
      });

      if (!item) throw new BadRequestException('Invalid itemId.');

      const before = {
        quantity: item.quantity,
        locationId: item.locationId,
        ownerId: item.ownerId,
      };

      const actorId = actor.userId;
      const action = dto.type;

      // Defaults: for audit changes and transaction metadata.
      let after = { ...before };
      let transactionData: {
        type: TransactionType;
        quantity: number;
        actorId: string;
        itemId: string;
        fromLocationId?: string | null;
        toLocationId?: string | null;
        fromOwnerId?: string | null;
        toOwnerId?: string | null;
      };

      if (dto.type === TransactionType.IN) {
        // Increase quantity.
        after = {
          ...before,
          quantity: before.quantity + dto.quantity,
          locationId: dto.toLocationId ?? before.locationId,
          ownerId: dto.toOwnerId ?? before.ownerId,
        };

        if (dto.toLocationId) {
          const loc = await tx.location.findUnique({
            where: { id: dto.toLocationId },
          });
          if (!loc) throw new BadRequestException('Invalid toLocationId.');
        }

        if (dto.toOwnerId !== undefined) {
          if (dto.toOwnerId === null || dto.toOwnerId === '') {
            after.ownerId = null;
          } else {
            if (actor.role !== Role.ADMIN && dto.toOwnerId !== actorId) {
              throw new ForbiddenException('Cannot assign ownerId.');
            }
            const owner = await tx.user.findUnique({
              where: { id: dto.toOwnerId },
            });
            if (!owner) throw new BadRequestException('Invalid toOwnerId.');
          }
        }

        transactionData = {
          type: TransactionType.IN,
          quantity: dto.quantity,
          actorId,
          itemId: dto.itemId,
          fromLocationId: dto.fromLocationId ?? before.locationId,
          toLocationId: dto.toLocationId ?? before.locationId,
          fromOwnerId: dto.fromOwnerId ?? before.ownerId,
          toOwnerId: dto.toOwnerId ?? before.ownerId,
        };
      } else if (dto.type === TransactionType.OUT) {
        if (dto.quantity > before.quantity) {
          throw new BadRequestException(
            'Cannot OUT more than current quantity.',
          );
        }
        if (dto.toLocationId || dto.toOwnerId) {
          throw new BadRequestException(
            'OUT does not support location/owner changes.',
          );
        }

        after = {
          ...before,
          quantity: before.quantity - dto.quantity,
        };

        transactionData = {
          type: TransactionType.OUT,
          quantity: dto.quantity,
          actorId,
          itemId: dto.itemId,
          fromLocationId: dto.fromLocationId ?? before.locationId,
          toLocationId: before.locationId,
          fromOwnerId: dto.fromOwnerId ?? before.ownerId,
          toOwnerId: before.ownerId,
        };
      } else if (dto.type === TransactionType.MOVE) {
        if (!dto.toLocationId) {
          throw new BadRequestException('MOVE requires toLocationId.');
        }

        // Move invariant: this implementation moves the whole item quantity.
        // This avoids splitting one Item across multiple locations.
        if (dto.quantity !== before.quantity) {
          throw new BadRequestException(
            'MOVE requires quantity to equal current item quantity.',
          );
        }

        if (dto.fromLocationId && dto.fromLocationId !== before.locationId) {
          throw new BadRequestException(
            'fromLocationId does not match current item locationId.',
          );
        }

        if (dto.toOwnerId !== undefined) {
          if (
            dto.toOwnerId !== null &&
            actor.role !== Role.ADMIN &&
            dto.toOwnerId !== actorId
          ) {
            throw new ForbiddenException('Cannot assign ownerId.');
          }
        }

        if (dto.toLocationId) {
          const loc = await tx.location.findUnique({
            where: { id: dto.toLocationId },
          });
          if (!loc) throw new BadRequestException('Invalid toLocationId.');
        }

        if (dto.toOwnerId !== undefined) {
          if (dto.toOwnerId !== null && dto.toOwnerId !== '') {
            const owner = await tx.user.findUnique({
              where: { id: dto.toOwnerId },
            });
            if (!owner) throw new BadRequestException('Invalid toOwnerId.');
          }
        }

        after = {
          ...before,
          locationId: dto.toLocationId,
          ownerId: dto.toOwnerId ?? before.ownerId,
        };

        transactionData = {
          type: TransactionType.MOVE,
          quantity: dto.quantity,
          actorId,
          itemId: dto.itemId,
          fromLocationId: dto.fromLocationId ?? before.locationId,
          toLocationId: dto.toLocationId,
          fromOwnerId: dto.fromOwnerId ?? before.ownerId,
          toOwnerId: dto.toOwnerId ?? before.ownerId,
        };
      } else {
        throw new BadRequestException('Unsupported transaction type.');
      }

      // Update item state (inventory invariants).
      const updatedItem = await tx.item.update({
        where: { id: dto.itemId },
        data: {
          quantity: after.quantity,
          ...(dto.type === TransactionType.IN ||
          dto.type === TransactionType.MOVE
            ? { locationId: after.locationId ?? item.locationId }
            : {}),
          ...(dto.type === TransactionType.IN ||
          dto.type === TransactionType.MOVE
            ? { ownerId: after.ownerId ?? null }
            : {}),
        },
        include: { category: true, location: true, owner: true },
      });

      const lowStock =
        item.threshold > 0 && updatedItem.quantity < item.threshold;

      const createdTransaction = await tx.transaction.create({
        data: {
          type: action,
          quantity: dto.quantity,
          actorId,
          itemId: dto.itemId,
          fromLocationId: transactionData.fromLocationId ?? null,
          toLocationId: transactionData.toLocationId ?? null,
          fromOwnerId: transactionData.fromOwnerId ?? null,
          toOwnerId: transactionData.toOwnerId ?? null,
        },
      });

      // Audit log should be written after we create the transaction record
      // so we can link `transactionId`.
      await tx.auditLog.create({
        data: {
          entity: 'Transaction',
          entityId: createdTransaction.id,
          action: action,
          changes: {
            before,
            after: {
              quantity: updatedItem.quantity,
              locationId: updatedItem.locationId,
              ownerId: updatedItem.ownerId,
            },
            // Ensure DTO is treated as plain JSON for Prisma `Json` input.
            request: dto as unknown as Prisma.InputJsonValue,
          },
          actorId,
          itemId: dto.itemId,
          transactionId: createdTransaction.id,
        },
      });

      let notification: { id: string } | null = null;
      if (lowStock) {
        const recipientUserId = updatedItem.ownerId ?? actorId;
        notification = await tx.notification.create({
          data: {
            userId: recipientUserId,
            message: `Low stock: ${updatedItem.name}. Quantity ${updatedItem.quantity} is below threshold ${item.threshold}.`,
            itemId: updatedItem.id,
            transactionId: createdTransaction.id,
          },
        });
      }

      return {
        transaction: createdTransaction,
        item: updatedItem,
        notification,
      };
    });
  }
}
