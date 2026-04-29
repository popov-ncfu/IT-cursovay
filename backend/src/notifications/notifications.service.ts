import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { AuthUser } from '../auth/types/jwt-payload.type';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: AuthUser, query: NotificationsQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;

    const where = {
      userId: user.userId,
      ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          transaction: true,
          item: true,
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { notifications, total, skip, take };
  }
}
