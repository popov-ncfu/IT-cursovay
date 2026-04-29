import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/types/jwt-payload.type';
import { CreateItemDto } from './dto/create-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async listLocations() {
    return this.prisma.location.findMany({ orderBy: { name: 'asc' } });
  }

  async list(query: QueryItemsDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;

    const where = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' as const } },
              { description: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.item.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async getById(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        owner: true,
      },
    });

    if (!item) throw new NotFoundException('Item not found.');
    return item;
  }

  async create(dto: CreateItemDto, actor: AuthUser) {
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Invalid categoryId.');

    const location = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
    if (!location) throw new BadRequestException('Invalid locationId.');

    let ownerId: string | undefined | null = dto.ownerId ?? actor.userId;

    // MANAGER can only create items for themselves by default.
    if (dto.ownerId && actor.role !== Role.ADMIN && dto.ownerId !== actor.userId) {
      throw new ForbiddenException('Cannot assign ownerId.');
    }

    if (ownerId) {
      const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
      if (!owner) throw new BadRequestException('Invalid ownerId.');
    }

    return this.prisma.item.create({
      data: {
        name: dto.name,
        description: dto.description,
        quantity: dto.quantity,
        threshold: dto.threshold,
        categoryId: dto.categoryId,
        locationId: dto.locationId,
        ownerId: ownerId ?? null,
      },
      include: { category: true, location: true, owner: true },
    });
  }

  async update(id: string, dto: UpdateItemDto, actor: AuthUser) {
    const existing = await this.prisma.item.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Item not found.');

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new BadRequestException('Invalid categoryId.');
    }

    if (dto.locationId) {
      const location = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
      if (!location) throw new BadRequestException('Invalid locationId.');
    }

    if (dto.ownerId !== undefined) {
      if (dto.ownerId && actor.role !== Role.ADMIN && dto.ownerId !== actor.userId) {
        throw new ForbiddenException('Cannot assign ownerId.');
      }
      if (dto.ownerId) {
        const owner = await this.prisma.user.findUnique({ where: { id: dto.ownerId } });
        if (!owner) throw new BadRequestException('Invalid ownerId.');
      }
    }

    return this.prisma.item.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.threshold !== undefined ? { threshold: dto.threshold } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.locationId !== undefined ? { locationId: dto.locationId } : {}),
        ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
      },
      include: { category: true, location: true, owner: true },
    });
  }

  async remove(id: string) {
    // Ensure "not found" semantics are clear.
    const existing = await this.prisma.item.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Item not found.');
    await this.prisma.item.delete({ where: { id } });
    return { success: true };
  }
}

