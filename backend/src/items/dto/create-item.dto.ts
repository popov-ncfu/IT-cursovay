import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateItemDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsInt()
  @Min(0)
  threshold: number;

  @IsString()
  categoryId: string;

  @IsString()
  locationId: string;

  @IsOptional()
  @IsString()
  ownerId?: string;
}

