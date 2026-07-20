import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GroupBuyItemInputDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  qty?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateGroupBuyDto {
  @IsEnum(['seek', 'offer'])
  type: string;

  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  departAt?: string;

  @IsOptional()
  @IsString()
  bidCloseAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quota?: number;

  @IsOptional()
  @IsString()
  serviceFee?: string;

  @IsEnum(['self_pickup', 'door_drop', 'spot'])
  deliveryMethod: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupBuyItemInputDto)
  items?: GroupBuyItemInputDto[];
}
