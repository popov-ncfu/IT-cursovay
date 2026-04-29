import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/types/jwt-payload.type';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Controller()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get('items')
  async list(@Query() query: QueryItemsDto) {
    return this.itemsService.list(query);
  }

  @Get('items/:id')
  async getById(@Param('id') id: string) {
    return this.itemsService.getById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('items')
  async create(@Body() dto: CreateItemDto, @Req() req: { user: AuthUser }) {
    return this.itemsService.create(dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Put('items/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.itemsService.update(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete('items/:id')
  async delete(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }

  @Get('categories')
  async listCategories() {
    return this.itemsService.listCategories();
  }

  @Get('locations')
  async listLocations() {
    return this.itemsService.listLocations();
  }
}

